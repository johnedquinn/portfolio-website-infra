import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as PortfolioWebsiteInfra from '../lib/portfolio-website-infra-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new PortfolioWebsiteInfra.PortfolioWebsiteInfraStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
