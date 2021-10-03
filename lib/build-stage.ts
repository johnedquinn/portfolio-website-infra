import { StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions';
import { BuildSpec, PipelineProject, LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { PublicGalleryAuthorizationToken } from '@aws-cdk/aws-ecr';
import { Construct, Stage } from '@aws-cdk/core';
import { PortfolioPipeline } from './portfolio-pipeline';

/**
 * @interface BuildStageProps to specify arguments
 */
interface BuildStageProps {
    readonly pipeline: PortfolioPipeline;
}

/**
 * @class BuildStage representing a stage withing AWS CodePipeline to build Docker Images
 * @author johnedquinn
 */
class BuildStage extends Construct {

    // Construct Members
    public readonly sourceCode: Artifact;
    public readonly image: Artifact;
    public readonly stageConfig: StageProps;
    private readonly pipeline: PortfolioPipeline;

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: Construct, id: string, props: BuildStageProps) {
        super(scope, id);
        this.pipeline = props.pipeline;
        this.sourceCode = props.pipeline.sourceCode;
        this.image = props.pipeline.image;
        this.stageConfig = this.createBuildStage('Build', this.sourceCode, this.image);
    }

    /**
     * Stage to build source code into a Docker image and place within ECR
     * 
     * @param   {string}   stageName  Stage name
     * @param   {Artifact} code       Artifact holding source code
     * @param   {Artifact} image      Artifact to place built Docker image (initially null)
     * @return  {StageProps}          Necessary configuration for stage in a pipeline.
     */
    private createBuildStage(stageName: string, code: Artifact, image: Artifact): StageProps {

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

export { BuildStage, BuildStageProps };