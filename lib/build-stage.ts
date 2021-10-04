import { StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction } from '@aws-cdk/aws-codepipeline-actions';
import { BuildSpec, PipelineProject, LinuxBuildImage } from '@aws-cdk/aws-codebuild';
import { PublicGalleryAuthorizationToken } from '@aws-cdk/aws-ecr';
import { Construct, CfnOutput } from '@aws-cdk/core';
import { PortfolioPipeline } from './portfolio-pipeline';

/**
 * @interface BuildStageProps to specify arguments
 */
interface BuildStageProps {
    readonly image: Artifact;
    readonly sourceCode: Artifact;
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
    private project: PipelineProject;

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: Construct, id: string, props: BuildStageProps) {
        super(scope, id);
        this.sourceCode = props.sourceCode;
        this.image = props.image;
        this.stageConfig = this.createBuildStage('Build', this.sourceCode, this.image);

        this.output(this.stageConfig, this.project);
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
        this.project = new PipelineProject(this, 'Project', {
            buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
            environment: {
                buildImage: LinuxBuildImage.STANDARD_3_0,
                privileged: true,
            }
        });

        // ECR Role
        this.project.role?.addManagedPolicy({
            managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser'
        });

        // For Reading from Docker
        PublicGalleryAuthorizationToken.grantRead(this.project.grantPrincipal);

        // Perform Build Action
        const codebuildAction = new CodeBuildAction({
            actionName: 'CodeBuild_Action',
            input: code,
            outputs: [image],
            project: this.project,
        });

        return {
            stageName: stageName,
            actions: [codebuildAction],
        };
    }

    /**
     * Print Output
     */
    private output(build: StageProps, project: PipelineProject) {
        new CfnOutput(this, 'BuildStage_Name', { value: build.stageName });
        new CfnOutput(this, 'BuildProject_Arn', { value: project.projectArn });
        new CfnOutput(this, 'BuildProject_Name', { value: project.projectName });
    }
}

export { BuildStage, BuildStageProps };