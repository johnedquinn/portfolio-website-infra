import * as cdk from '@aws-cdk/core';
import { CodePipeline, CodePipelineSource, CodeBuildStep } from '@aws-cdk/pipelines';
import { Pipeline, StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, CodeStarConnectionsSourceAction, EcsDeployAction } from '@aws-cdk/aws-codepipeline-actions';
import { BuildSpec, ComputeType, Project, PipelineProject, LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { PolicyStatement, Effect, ServicePrincipal, ManagedPolicy, Role } from '@aws-cdk/aws-iam';
import { StringParameter } from '@aws-cdk/aws-ssm';
import { AuthorizationToken, PublicGalleryAuthorizationToken, Repository, TagMutability } from '@aws-cdk/aws-ecr';
import { Duration, RemovalPolicy } from '@aws-cdk/core';

export class PortfolioPipelineStack extends cdk.Stack {

    readonly containerName: String;
    readonly ecrRepo: Repository;
    readonly pipeline: Pipeline;

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const sourceCode = new Artifact();
        const image = new Artifact();

        this.containerName = '';

        // ECR Repository
        this.ecrRepo = new Repository(this, 'Repository', {
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

        // Pipeline
        this.pipeline = new Pipeline(this, 'Pipeline', {
            pipelineName: 'portfolio-website-pipeline',
            crossAccountKeys: false,
            stages: [
                this.createSourceStage('SourceStage', sourceCode),
                this.createImageBuildStage('Build', sourceCode, image),
            ]
        });
    }

    /*
     * Stage to grab source code from GitHub
     * --
     * @param   stageName    Stage name
     * @param   code         Artifact to place found source code (initially null)
     * @return  Necessary configuration for stage in a pipeline.
     */
    private createSourceStage(stageName: string, code: Artifact): StageProps {
        const githubAction = new CodeStarConnectionsSourceAction({
            actionName: 'Github_Source',
            branch: 'main',
            connectionArn: 'arn:aws:codestar-connections:us-east-2:409345029529:connection/ff0cb554-229f-4a65-8123-d6282adcaf0b',
            output: code,
            owner: 'johnedquinn',
            repo: 'portfolio-website',
            codeBuildCloneOutput: true
        });
        return {
            stageName: stageName,
            actions: [githubAction],
        };
    }

    /*
     * Stage to build source code into a Docker image and place within ECR
     * --
     * @param   stageName    Stage name
     * @param   code         Artifact holding source code
     * @param   image        Artifact to place built Docker image (initially null)
     * @return  Necessary configuration for stage in a pipeline.
     */
    private createImageBuildStage(stageName: string, code: Artifact, image: Artifact): StageProps {

        // Build Configuration
        const project = new PipelineProject(this, 'Project', {
            buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
            environment: {
                buildImage: LinuxBuildImage.STANDARD_3_0,
                privileged: true,
            }
        });

        // ECR Role
        project.role?.addManagedPolicy({
            managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser'
        });

        // For Reading from Docker
        PublicGalleryAuthorizationToken.grantRead(project.grantPrincipal);

        // Perform Build
        const codebuildAction = new CodeBuildAction({
            actionName: 'CodeBuild_Action',
            input: code,
            outputs: [image],
            project: project,
        });

        return {
            stageName: stageName,
            actions: [codebuildAction],
        };
    }

}
