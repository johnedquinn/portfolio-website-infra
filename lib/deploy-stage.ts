import { StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { EcsDeployAction } from '@aws-cdk/aws-codepipeline-actions';
import { Repository } from '@aws-cdk/aws-ecr';
import { Construct, Duration } from '@aws-cdk/core';
import { EcsManager } from './ecs-manager';
import { Vpc, SecurityGroup, Peer, Port } from '@aws-cdk/aws-ec2'
import { ApplicationTargetGroup, ApplicationLoadBalancer, ApplicationProtocol, TargetType, Protocol } from '@aws-cdk/aws-elasticloadbalancingv2';
import { PublicHostedZone } from '@aws-cdk/aws-route53'
import { Certificate, CertificateValidation } from '@aws-cdk/aws-certificatemanager'

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

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: Construct, id: string, props: DeployStageProps) {
        super(scope, id);

        // Create VPC
        const vpc = this.createVpc(id);

        // @TODO: Maybe Specify Availability Zone?

        // Create Route 53 Hosted Zone and Domain
        const zone = new PublicHostedZone(this, 'Zone', {
            zoneName: props.domain
        });

        // Create SSL Certificate
        const cert = new Certificate(this, "certificate", {
            domainName: props.domain,
            validation: CertificateValidation.fromDns(zone),
        });

        // Create Target Group to be used by ECS Cluster (and Health Check)
        const targetGroup = this.createTargetGroup(vpc);

        // Create Application Load Balancer Security Group
        const albSG = this.createLoadBalancerSecurityGroup(vpc);

        // Create Application Load Balancer
        const alb = this.createApplicationLoadBalancer(vpc, targetGroup, albSG, cert);

        // @TODO: Create CloudFront

        // @TODO: Create Public Subnet for Load Balancer

        // @TODO: Create Private Subnet for ECS

        // Initialize ECS Manager
        this.ecsManager = this.createEcsManager(props.minInstances, props.maxInstances,
            props.desiredInstances, props.repository, vpc, albSG, targetGroup, id);

        // Create Stage
        this.stageConfig = this.createDeployStage(id, props.image);
    }

    private createVpc(id: string) {
        return new Vpc(this, `portfolio-website-${id}-vpc`, {
            maxAzs: 2,
        });
    }

    private createTargetGroup(vpc: Vpc): ApplicationTargetGroup {
        const target = new ApplicationTargetGroup(this, "target-group", {
            port: 80,
            vpc: vpc,
            protocol: ApplicationProtocol.HTTP,
            targetType: TargetType.IP,
        });

        target.configureHealthCheck({
            path: "/",
            protocol: Protocol.HTTP,
            interval: Duration.seconds(30)
        });
        return target;
    }

    // Provide a secure connection between the ALB and ECS
    private createLoadBalancerSecurityGroup(vpc: Vpc) {
        const albSG = new SecurityGroup(this, "alb-SG", {
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
        const alb = new ApplicationLoadBalancer(this, 'alb', {
            vpc,
            vpcSubnets: { subnets: vpc.publicSubnets },
            internetFacing: true
        });

        const listener = alb.addListener("alb-listener", {
            open: true,
            port: 443,
            defaultTargetGroups: [target],
            certificates: [cert],
        });

        alb.addSecurityGroup(albSG);

        return alb;
    }

    private createEcsManager(min: number, max: number, desired: number, repo: Repository, vpc: Vpc, albSG: SecurityGroup, target: ApplicationTargetGroup, stage: string) {
        return new EcsManager(this, `EcsManager`, {
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
}

export { DeployStage, DeployStageProps };