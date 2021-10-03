import { StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { EcsDeployAction } from '@aws-cdk/aws-codepipeline-actions';
import { Repository } from '@aws-cdk/aws-ecr';
import { Construct } from '@aws-cdk/core';
import { EcsManager } from './ecs-manager';
import { PortfolioPipeline } from './portfolio-pipeline';

/**
 * @interface DeployStageProps to specify arguments
 */
interface DeployStageProps {
    readonly pipeline: PortfolioPipeline;
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
    private readonly pipeline: PortfolioPipeline;
    public readonly pipelineName: string;
    public image: Artifact;
    private ecsManager: EcsManager;
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

        // Initialize Members
        this.pipeline = props.pipeline;
        this.image = props.pipeline.image;
        this.ecsManager = new EcsManager(this, 'EcsManager', {
            minInstances: props.minInstances,
            maxInstances: props.maxInstances,
            desiredInstances: props.desiredInstances,
            repository: props.repository
        });

        // Create Stage
        this.stageConfig = this.createDeployStage(id, this.image);
    }

    /**
     * Creates all resources for a deployment stage
     * 
     * @param  {string}     stageName   name of stage
     * @param  {Artifact}   image       docker image reference
     * @return {StageProps}             stage configuration
     */
    createDeployStage(stageName: string, image: Artifact): StageProps {
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