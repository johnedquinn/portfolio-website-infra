#!/usr/bin/env node

import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { PortfolioWebsiteInfraStack } from '../lib/portfolio-website-infra-stack';

// Initialize Application
const app = new App();

// Attach Stack to Application
new PortfolioWebsiteInfraStack(app, 'PortfolioWebsiteInfraStack');
