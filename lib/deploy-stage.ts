import { StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { EcsDeployAction } from '@aws-cdk/aws-codepipeline-actions';
import { Repository } from '@aws-cdk/aws-ecr';
import { Construct, Duration, CfnOutput } from '@aws-cdk/core';
import { EcsManager } from './ecs-manager';
import { Vpc, SecurityGroup, Peer, Port } from '@aws-cdk/aws-ec2'
import { ApplicationTargetGroup, ApplicationLoadBalancer, ApplicationProtocol, TargetType, Protocol, ListenerAction } from '@aws-cdk/aws-elasticloadbalancingv2';
import { HostedZone, IHostedZone } from '@aws-cdk/aws-route53';
import { Certificate, CertificateValidation, DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import { Distribution } from '@aws-cdk/aws-cloudfront';
import { LoadBalancerV2Origin } from '@aws-cdk/aws-cloudfront-origins';

/**
 * @interface DeployStageProps to specify arguments
 */
interface DeployStageProps {
    readonly image: Artifact;
    readonly repository: Repository;
    readonly minInstances: number;
    readonly maxInstances: number;
    readonly desiredInstances: number;
    readonly domain: string;
    readonly zoneId: string;
    readonly stage: string;
}

/**
 * @class DeployStage representing a stage where Docker containers are running on ECS
 * @author johnedquinn
 */
class DeployStage extends Construct {

    // Construct Members
    public readonly pipelineName: string;
    public image: Artifact;
    private readonly ecsManager: EcsManager;
    public readonly stageConfig: StageProps;
    public readonly stage: string;

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: Construct, id: string, props: DeployStageProps) {
        super(scope, id);

        this.stage = props.stage;

        // Create VPC
        const vpc = this.createVpc();

        // Create Route 53 Hosted Zone and Domain
        const zone = HostedZone.fromHostedZoneAttributes(this, `zone-${this.stage}`, {
            zoneName: props.domain,
            hostedZoneId: props.zoneId
        });

        // @TODO: Create Alias Records

        // Create SSL Certificate
        const cert = new DnsValidatedCertificate(this, `CrossRegionCertificate-${this.stage}`, {
            domainName: props.domain,
            hostedZone: zone,
            region: 'us-east-1'
        });

        const albCert = new Certificate(this, `albCert-${this.stage}`, {
            domainName: props.domain,
            validation: CertificateValidation.fromDns(zone)
        });

        // Create Target Group to be used by ECS Cluster (and Health Check)
        const targetGroup = this.createTargetGroup(vpc);

        // Create Application Load Balancer Security Group
        const albSG = this.createLoadBalancerSecurityGroup(vpc);

        // Create Application Load Balancer
        const alb = this.createApplicationLoadBalancer(vpc, targetGroup, albSG, albCert);

        // Create CloudFront
        const cloudfront = this.createCloudFront(cert, alb, props.domain);

        // @TODO: Create Public Subnet for Load Balancer

        // @TODO: Create Private Subnet for ECS

        // Initialize ECS Manager
        this.ecsManager = this.createEcsManager(props.minInstances, props.maxInstances,
            props.desiredInstances, props.repository, vpc, albSG, targetGroup, props.stage);

        // Create Stage
        this.stageConfig = this.createDeployStage(id, props.image);

        // CloudFormation Output
        this.output(props.stage, vpc, zone, cert, targetGroup, albSG, alb, this.stageConfig);
    }

    private createCloudFront(cert: Certificate, alb: ApplicationLoadBalancer, domain: string) {
        return new Distribution(this, `cf-distribution-${this.stage}`, {
            defaultBehavior: { origin: new LoadBalancerV2Origin(alb) },
            domainNames: [domain],
            certificate: cert,
          });
    }

    private createVpc() {
        return new Vpc(this, `portfolio-website-${this.stage}-vpc`, {
            maxAzs: 2,
        });
    }

    private createTargetGroup(vpc: Vpc): ApplicationTargetGroup {
        const target = new ApplicationTargetGroup(this, `target-group-${this.stage}`, {
            port: 80,
            vpc: vpc,
            protocol: ApplicationProtocol.HTTP,
            targetType: TargetType.IP,
        });

        target.configureHealthCheck({
            path: "/",
            protocol: Protocol.HTTP,
            interval: Duration.minutes(2)
        });
        return target;
    }

    // Provide a secure connection between the ALB and ECS
    private createLoadBalancerSecurityGroup(vpc: Vpc) {
        const albSG = new SecurityGroup(this, `alb-SG-${this.stage}`, {
            vpc: vpc,
            allowAllOutbound: true,
        });

        albSG.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(443),
            "Allow HTTPS Traffic"
        );

        return albSG;
    }

    private createApplicationLoadBalancer(vpc: Vpc, target: ApplicationTargetGroup, albSG: SecurityGroup, cert: Certificate): ApplicationLoadBalancer {
        const alb = new ApplicationLoadBalancer(this, `alb-${this.stage}`, {
            vpc,
            vpcSubnets: { subnets: vpc.publicSubnets },
            internetFacing: true
        });

        alb.addListener(`alb-listener-${this.stage}`, {
            open: true,
            port: 443,
            defaultTargetGroups: [target],
            certificates: [ cert ],
        });

        alb.addRedirect({
            sourcePort: 80,
            sourceProtocol: ApplicationProtocol.HTTP,
            targetPort: 443,
            targetProtocol: ApplicationProtocol.HTTPS
        });

        alb.addSecurityGroup(albSG);

        return alb;
    }

    private createEcsManager(min: number, max: number, desired: number, repo: Repository, vpc: Vpc, albSG: SecurityGroup, target: ApplicationTargetGroup, stage: string) {
        return new EcsManager(this, `EcsManager-${stage}`, {
            minInstances: min,
            maxInstances: max,
            desiredInstances: desired,
            repository: repo,
            vpc: vpc,
            albSG: albSG,
            targetGroup: target,
            stage: stage
        });
    }

    /**
     * Creates all resources for a deployment stage
     * 
     * @param  {string}     stageName   name of stage
     * @param  {Artifact}   image       docker image reference
     * @return {StageProps}             stage configuration
     */
    private createDeployStage(stageName: string, image: Artifact): StageProps {
        const ecsDeployAction = new EcsDeployAction({
            actionName: 'ECSDeploy_Action',
            input: image,
            service: this.ecsManager.service,
        });
        return {
            stageName: stageName,
            actions: [ecsDeployAction],
        }
    }

    /**
     * Print Output
     */
    private output(stage: string, vpc: Vpc, zone: IHostedZone, cert: Certificate, 
        target: ApplicationTargetGroup, albSG: SecurityGroup, alb: ApplicationLoadBalancer, deploy: StageProps) {
        new CfnOutput(this, `VPC_ID_${stage}`, { value: vpc.vpcId });
        new CfnOutput(this, `Zone_ID_${stage}`, { value: zone.hostedZoneId });
        new CfnOutput(this, `Cert_ARN_${stage}`, { value: cert.certificateArn });
        new CfnOutput(this, `TargetGroup_ARN_${stage}`, { value: target.targetGroupArn });
        new CfnOutput(this, `AlbSG_ID_${stage}`, { value: albSG.securityGroupId });
        new CfnOutput(this, `ALB_ARN_${stage}`, { value: alb.loadBalancerArn });
        new CfnOutput(this, `DeployStage_Name_${stage}`, { value: deploy.stageName });
    }
}

export { DeployStage, DeployStageProps };