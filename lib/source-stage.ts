import { StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeStarConnectionsSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, CfnOutput } from '@aws-cdk/core';
import { PortfolioPipeline } from './portfolio-pipeline';
import { StringParameter } from '@aws-cdk/aws-ssm';

/**
 * @interface SourceStageProps to specify arguments
 */
interface SourceStageProps {
    readonly pipeline: PortfolioPipeline;
}

/**
 * @class  SourceStage representing a stage withing AWS CodePipeline to grab GitHub source code
 * @author johnedquinn
 */
class SourceStage extends Construct {

    // Construct Members
    public readonly sourceCode: Artifact;
    public readonly stageConfig: StageProps;
    private readonly pipeline: PortfolioPipeline;

    /**
     * Constructor
     * 
     * @param scope 
     * @param id 
     * @param props 
     */
    constructor(scope: Construct, id: string, props: SourceStageProps) {
        super(scope, id);
        this.pipeline = props.pipeline;
        this.sourceCode = props.pipeline.sourceCode;
        this.stageConfig = this.createSourceStage('Source', this.sourceCode);

        this.output(this.stageConfig);
    }

    /**
     * Stage to grab source code from GitHub
     * 
     * @param   {string}     stageName  Stage name
     * @param   {Artifact}   code       Artifact to place found source code (initially null)
     * @return  {StageProps}            Necessary configuration for stage in a pipeline.
     */
    private createSourceStage(stageName: string, code: Artifact): StageProps {
        // Grab Values from SSM
        const owner = StringParameter.valueForStringParameter(this, 'GITHUB_USER');
        const repo = StringParameter.valueForStringParameter(this, 'GITHUB_REPO');
        const connectionArn = StringParameter.valueForStringParameter(this, 'GITHUB_CONN');

        // Create Action
        const githubAction = new CodeStarConnectionsSourceAction({
            actionName: 'Github_Source',
            branch: 'main',
            connectionArn: connectionArn,
            output: code,
            owner: owner,
            repo: repo,
            codeBuildCloneOutput: true
        });
        return {
            stageName: stageName,
            actions: [ githubAction ],
        };
    }

    /**
     * Print Output
     */
    private output(source: StageProps) {
        new CfnOutput(this, 'SourceStage_Name', { value: source.stageName });
    }

}


export { SourceStage, SourceStageProps };