import { Repository, TagMutability } from '@aws-cdk/aws-ecr';
import { CfnOutput, Construct, StackProps, Stack } from '@aws-cdk/core';
import { Duration, RemovalPolicy } from '@aws-cdk/core';
import { BuildStage } from './build-stage';
import { PortfolioPipeline } from './portfolio-pipeline';
import { SourceStage } from './source-stage';
import { DeployStage } from './deploy-stage';

interface PortfolioEnvironmentProps {
    readonly account: string;
    readonly region: string;
}

interface PortfolioStackProps extends StackProps {
    readonly env: PortfolioEnvironmentProps;
    readonly infraName: string;
    readonly appName: string;
}

/**
 * @class  PortfolioWebsiteInfraStack representing all resources necessary to maintain portfolio-website
 * @author johnedquinn
 */
export class PortfolioWebsiteInfraStack extends Stack {

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: Construct, id: string, props: PortfolioStackProps) {
        super(scope, id, props);

        // @TODO: Trigger Deployment of own Stack whenever pushed to main

        // ECR Shared Repository
        const repository = new Repository(this, 'Repository', {
            repositoryName: 'portfolio-website',
            removalPolicy: RemovalPolicy.DESTROY,
            imageTagMutability: TagMutability.MUTABLE,
            imageScanOnPush: false,
            lifecycleRegistryId: props.env.account,
            lifecycleRules: [{
                rulePriority: 1,
                description: 'Testing rule',
                maxImageAge: Duration.days(1000)
            }]
        });

        // Initialize Pipeline
        const pipeline = new PortfolioPipeline(this, 'Pipeline', {
            pipelineName: 'portfolio-website-pipeline'
        })

        // Source Stage
        const sourceStage = new SourceStage(this, 'Source', { pipeline: pipeline });
        pipeline.addStage(sourceStage.stageConfig);

        // Build Stage
        const buildStage = new BuildStage(this, 'Build', {
            sourceCode: pipeline.sourceCode,
            image: pipeline.image
        });
        pipeline.addStage(buildStage.stageConfig);

        // Beta Testing Stage
        const betaStage = new DeployStage(this, 'Beta', {
            image: pipeline.image,
            repository: repository,
            minInstances: 1,
            maxInstances: 1,
            desiredInstances: 1,
            domain: 'johnedquinn-beta.com',
            stage: 'beta'
        });
        pipeline.addStage(betaStage.stageConfig);
        
        // @TODO: Load and Integration Testing on Beta Stage

        // @TODO: Manual Approval between Beta and Prod

        // Production Stage
        const prodStage = new DeployStage(this, 'Prod', {
            image: pipeline.image,
            repository: repository,
            minInstances: 1,
            maxInstances: 2,
            desiredInstances: 1,
            domain: 'johnedquinn.com',
            stage: 'prod'
        });
        pipeline.addStage(prodStage.stageConfig);

        // @TODO: Alarm and Metrics on Prod Stage

        // Output to CloudFormation
        this.output(repository);

    }

    /**
     * Print Output
     */
    private output(repo: Repository) {
        new CfnOutput(this, 'ECRRepo_ARN', { value: repo.repositoryArn });
    }

}
