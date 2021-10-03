import { StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { EcsDeployAction } from '@aws-cdk/aws-codepipeline-actions';
import { Repository } from '@aws-cdk/aws-ecr';
import { Construct, Duration } from '@aws-cdk/core';
import { EcsManager } from './ecs-manager';
import { Vpc, SecurityGroup, Peer, Port } from '@aws-cdk/aws-ec2'
import { ApplicationTargetGroup, ApplicationLoadBalancer, ApplicationProtocol, TargetType, Protocol } from '@aws-cdk/aws-elasticloadbalancingv2';

/**
 * @interface DeployStageProps to specify arguments
 */
interface DeployStageProps {
    readonly image: Artifact;
    readonly repository: Repository;
    readonly minInstances: number;
    readonly maxInstances: number;
    readonly desiredInstances: number;
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
        const vpc = new Vpc(this, `portfolio-website-${id}-vpc`, { maxAzs: 2 });

        // @TODO: Maybe Specify Availability Zone?

        // @TODO: Create Route 53 Hosted Zone

        // @TODO: Create Route 53 Domain

        // @TODO: Create SSL Certificate

        // Create Target Group to be used by ECS Cluster (and Health Check)
        const targetGroup = this.createTargetGroup(vpc);

        // Create Application Load Balancer Security Group
        const albSG = this.createLoadBalancerSecurityGroup(vpc);

        // Create Application Load Balancer
        const alb = this.createApplicationLoadBalancer(vpc, targetGroup, albSG);

        // @TODO: Create CloudFront

        // @TODO: Create Public Subnet for Load Balancer

        // @TODO: Create Private Subnet for ECS

        // Initialize ECS Manager
        this.ecsManager = this.createEcsManager(props.minInstances, props.maxInstances, 
            props.desiredInstances, props.repository, vpc, albSG, targetGroup, id);

        // Create Stage
        this.stageConfig = this.createDeployStage(id, props.image);
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
  
        // @TODO: Convert to ONLY HTTPS
        albSG.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(80),
            "Allow HTTP Traffic"
        );

        return albSG;
    }

    private createApplicationLoadBalancer(vpc: Vpc, target: ApplicationTargetGroup, albSG: SecurityGroup): ApplicationLoadBalancer {
        const alb = new ApplicationLoadBalancer(this, 'alb', {
            vpc,
            vpcSubnets: { subnets: vpc.publicSubnets },
            internetFacing: true
        });

        // @TODO: Specify HTTPS Connections 
        const listener = alb.addListener("alb-listener", {
            open: true,
            port: 80,
            defaultTargetGroups: [ target ]
            // certificates: [cert],
        });

        alb.addSecurityGroup(albSG);

        return alb;
    }

    private createEcsManager (min: number, max: number, desired: number, repo: Repository, vpc: Vpc, albSG: SecurityGroup, target: ApplicationTargetGroup, stage: string) {
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