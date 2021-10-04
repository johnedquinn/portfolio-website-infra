#!/usr/bin/env node

import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { PortfolioWebsiteInfraStack } from '../lib/portfolio-website-infra-stack';

// Initialize Application
const app = new App();

// Defaults
const DEFAULT_AWS_ACCOUNT_ID = '409345029529';
const DEFAULT_AWS_REGION = 'us-west-2';
const DEFAULT_INFRA_NAME = 'portfolio-website-infra';
const DEFAULT_APP_NAME = 'portfolio-website-infra';

// Attach Stack to Application
new PortfolioWebsiteInfraStack(app, 'PortfolioWebsiteInfraStack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT || DEFAULT_AWS_ACCOUNT_ID,
      region: process.env.CDK_DEFAULT_REGION || DEFAULT_AWS_REGION
    },
    infraName: process.env.APP_INFRA_NAME || DEFAULT_INFRA_NAME,
    appName: process.env.APP_NAME || DEFAULT_APP_NAME
});
