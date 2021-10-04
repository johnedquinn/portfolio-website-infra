import { StageProps, Artifact } from '@aws-cdk/aws-codepipeline';
import { CodeStarConnectionsSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, CfnOutput } from '@aws-cdk/core';
import { PortfolioPipeline } from './portfolio-pipeline';

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