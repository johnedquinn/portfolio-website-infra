import { Construct, StackProps, Stack } from '@aws-cdk/core';
import { EcsApplication } from '@johnedquinn/ecs-application';

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
     */
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const ecsApplicationInfra = new EcsApplication(this, 'EcsApplicationInfra', {
            appName: 'portfolio-website',
            projectName: 'portfolio-website',
            infraName: 'portfolio-website-infra',
            betaStageName: 'beta',
            betaDomain: 'johnedquinn-beta.click',
            betaZoneId: 'Z0122871PC0G7PLFCLZ7',
            prodStageName: 'prod',
            prodDomain: 'johnedquinn.io',
            prodZoneId: 'Z094875525UQXE18F6WUE',
            awsEcrAccount: '409345029529'
        });
    }

}
