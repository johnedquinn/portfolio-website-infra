import { TaskDefinition, 
    NetworkMode, Compatibility, ContainerDefinition, 
    RepositoryImage, LogDriver, FargateService } from '@aws-cdk/aws-ecs';
import { Cluster } from '@aws-cdk/aws-ecs';
import { CfnOutput, Construct, Duration } from '@aws-cdk/core';
import { Repository } from '@aws-cdk/aws-ecr';
import { SecurityGroup, Vpc, Port } from '@aws-cdk/aws-ec2';
import { ApplicationTargetGroup } from '@aws-cdk/aws-elasticloadbalancingv2';

/**
 * @interface EcsManagerProps to specify arguments
 */
interface EcsManagerProps {
    readonly repository: Repository;
    readonly minInstances: number;
    readonly maxInstances: number;
    readonly desiredInstances: number;
    readonly vpc: Vpc
    readonly albSG: SecurityGroup;
    readonly targetGroup: ApplicationTargetGroup;
    readonly stage: string
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
    public readonly stage: string;
    private readonly vpc: Vpc;

    // Service Members
    public service: FargateService;
    public readonly containerName: string;
    public readonly cluster: Cluster;
    public readonly task: TaskDefinition;
    private readonly container: ContainerDefinition;

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: Construct, id: string, props: EcsManagerProps) {
        super(scope, id);

        // Grab Arguments
        this.repository = props.repository;
        this.minInstances = props.minInstances;
        this.maxInstances = props.maxInstances;
        this.stage = props.stage;
        this.vpc = props.vpc;

        // Configure Cluster and Service
        this.cluster = this.createCluster(id, props.vpc);

        // Create Task
        this.task = this.createTask();

        // Create Container
        this.container = this.createContainer(this.task, this.repository, props.stage);

        // Create Security Group to Communicate with Load Balancer
        const ecsSg = this.createOutboundSecurityGroup(this.vpc, props.albSG);

        // Create Service
        this.service = this.createService(this.cluster, props.targetGroup, this.task, ecsSg, props.desiredInstances);

        // Add Auto-Scaling to Service
        this.addAutoScaling(this.service, props.minInstances, props.maxInstances);


        // Output Relevant Information
        this.output();
    }

    private createCluster(name: string, vpc: Vpc): Cluster {
        return new Cluster(this, name, {
            clusterName: name,
            vpc: vpc
        });
    }

    private createTask(): TaskDefinition {
        return new TaskDefinition(this, "Task", {
            family: "task",
            compatibility: Compatibility.EC2_AND_FARGATE,
            cpu: "256",
            memoryMiB: "512",
            networkMode: NetworkMode.AWS_VPC
        });
    }

    private createContainer(taskDef: TaskDefinition, repository: Repository, stage: string): ContainerDefinition {
        let container = new ContainerDefinition(this, 'Container', {
            image:  RepositoryImage.fromEcrRepository(repository, "latest"),
            memoryLimitMiB: 512,
            environment: {
            DB_HOST: ""
            },
            // store the logs in cloudwatch 
            logging: LogDriver.awsLogs({ streamPrefix: `portfolio-website-${stage}` }),
            taskDefinition: taskDef
        });

        container.addPortMappings({ containerPort: 80 });

        return container;
    }

    private createOutboundSecurityGroup(vpc: Vpc, albSG: SecurityGroup) {
        let ecsSG = new SecurityGroup(this, "ecsSG", {
        vpc: vpc,
        allowAllOutbound: true,
        });

        ecsSG.connections.allowFrom(
            albSG,
            Port.allTcp(),
            "Application Load Balancer"
          );

          return ecsSG;
    }

    /**
     * Creates a Load-Balanced Fargate Service
     * 
     * @param cluster 
     * @param desiredCount 
     * @returns 
     */
    private createService(cluster: Cluster, target: ApplicationTargetGroup, taskDef: TaskDefinition, ecsSG: SecurityGroup, desired: number): FargateService {
        let service = new FargateService(this, "service", {
            cluster,
            desiredCount: desired,
            taskDefinition: taskDef,
            securityGroups: [ecsSG],
            assignPublicIp: true,
        });

        service.attachToApplicationTargetGroup(target);

        return service;
    }

    /**
     * Configure Auto-Scaling
     * 
     * @param service 
     * @param min 
     * @param max 
     */
    private addAutoScaling(service: FargateService, min: number, max: number) {
        const autoScalingGroup = service.autoScaleTaskCount({
            minCapacity: min,
            maxCapacity: max
        });
        autoScalingGroup.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: Duration.seconds(60),
            scaleOutCooldown: Duration.seconds(60),
        });
        autoScalingGroup.scaleOnMemoryUtilization('MemScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: Duration.seconds(60),
            scaleOutCooldown: Duration.seconds(60),
        });
    }

    /**
     * Print Output
     */
    private output() {
        new CfnOutput(this, `ECS_Service_ARN_${this.stage}`, { value: this.service.serviceArn });
        new CfnOutput(this, `ECS_Cluster_ARN_${this.stage}`, { value: this.cluster.clusterArn });
        new CfnOutput(this, `ECS_Task_ARN_${this.stage}`, { value: this.task.taskDefinitionArn });
        new CfnOutput(this, `ECS_Container_Name_${this.stage}`, { value: this.container.containerName });
    }
}

export { EcsManager, EcsManagerProps };