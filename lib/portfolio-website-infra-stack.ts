import { Repository, TagMutability } from '@aws-cdk/aws-ecr';
import * as cdk from '@aws-cdk/core';
import { Duration, RemovalPolicy } from '@aws-cdk/core';
import { BuildStage } from './build-stage';
import { PortfolioPipeline } from './portfolio-pipeline';
import { SourceStage } from './source-stage';

/**
 * @class  PortfolioWebsiteInfraStack representing all resources necessary to maintain portfolio-website
 * @author johnedquinn
 */
export class PortfolioWebsiteInfraStack extends cdk.Stack {

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ECR Repository
        const repository = new Repository(this, 'Repository', {
            repositoryName: 'portfolio-website',
            removalPolicy: RemovalPolicy.RETAIN,
            imageTagMutability: TagMutability.MUTABLE,
            imageScanOnPush: false,
            lifecycleRegistryId: '409345029529',
            lifecycleRules: [
                {
                    rulePriority: 1,
                    description: 'Testing rule',
                    maxImageAge: Duration.days(1000)
                }
            ]
        });

        // Initialize Pipeline
        const pipeline = new PortfolioPipeline(this, 'Pipeline', {
            pipelineName: 'portfolio-website-pipeline'
        })

        // Source Stage
        const sourceStage = new SourceStage(this, 'SourceStage', { pipeline: pipeline });
        pipeline.addStage(sourceStage.stageConfig);

        // Build Stage
        const buildStage = new BuildStage(this, 'BuildStage', { pipeline: pipeline });
        pipeline.addStage(buildStage.stageConfig);

        // Beta Testing Stage

        // Production Stage

    }

}
