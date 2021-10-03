import { IBaseService, ContainerImage } from '@aws-cdk/aws-ecs';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import { Cluster } from '@aws-cdk/aws-ecs';
import { CfnOutput, Construct, Duration } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-ecr';

/**
 * @interface EcsManagerProps to specify arguments
 */
interface EcsManagerProps {
    readonly repository: Repository;
    readonly minInstances: number;
    readonly maxInstances: number;
    readonly desiredInstances: number;
}

/**
 * @class EcsManager representing ECS, Fargate Services, Auto-Scaling of deployment stage
 * @author johnedquinn
 */
class EcsManager extends Construct {

    // Params
    public readonly repository: Repository;
    public readonly minInstances: number;
    public readonly maxInstances: number;

    // Service Members
    private fargateService: ApplicationLoadBalancedFargateService;
    public readonly service: IBaseService;
    public readonly containerName: string;
    public readonly cluster: Cluster;

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: Construct, id: string, props: EcsManagerProps) {
        super(scope, id);

        // Grab Params
        this.repository = props.repository;
        this.minInstances = props.minInstances;
        this.maxInstances = props.maxInstances;

        // Configure Cluster and Service
        this.cluster = new Cluster(this, 'Cluster');
        this.fargateService = this.createService(this.cluster, props.desiredInstances);
        this.service = this.fargateService.service;
        this.addAutoScaling();

        // Grant Permissions to ECS to use ECR
        this.repository.grantPull(this.fargateService.taskDefinition.executionRole!);
        this.containerName = this.fargateService.taskDefinition.defaultContainer!.containerName;

        // Output Relevant Information
        this.output();
    }

    /**
     * Creates a Load-Balanced Fargate Service
     * 
     * @param cluster 
     * @param desiredCount 
     * @returns 
     */
    private createService(cluster: Cluster, desiredCount: number) {
        return new ApplicationLoadBalancedFargateService(this, 'Service', {
            cluster: cluster,
            taskImageOptions: {
                image: ContainerImage.fromEcrRepository(this.repository, 'latest'),
            },
            desiredCount: desiredCount
        });
    }

    /**
     * Configure Auto-Scaling
     */
    private addAutoScaling() {
        const autoScalingGroup = this.fargateService.service.autoScaleTaskCount({
            minCapacity: this.minInstances,
            maxCapacity: this.maxInstances
        });
        autoScalingGroup.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 50,
            scaleInCooldown: Duration.seconds(60),
            scaleOutCooldown: Duration.seconds(60),
        });
    }

    /**
     * Print Output
     */
    private output() {
        new CfnOutput(this, 'ECRRepo_ARN', { value: this.repository.repositoryArn });
        new CfnOutput(this, 'ContainerName', { value: this.containerName });
    }
}

export { EcsManager, EcsManagerProps };