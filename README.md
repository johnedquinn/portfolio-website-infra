# Portfolio Website Infrastructure

Hi! This project is an AWS CDK Pipeline, written in Typescript. Its goal is to set up a CodePipeline -- with stages involving CodeBuild, staging environments, and production environments (ECS) -- for developing and deploying my personal website. The associated source code for the containerized React website can be found [here](https://www.github.com/johnedquinn/portfolio-website).

The website is currently running at [johnedquinn.io](https://johnedquinn.io) thanks to this repository. You can also see the beta website at [johnedquinn-beta.click](http://johnedquinn-beta.click).

## General Project Flow

This CDK Application does a couple things. At the time of writing, it creates a CodePipeline with 4 stages.
1. Source Stage - connect to GitHub and grab the source code whenever anything is merged into `main`
2. Build Stage - since the repository is a traditional Docker project, we use CodeBuild and Docker to build and tag the image. The resulting image is stored in ECR.
3. Beta Stage -- see below
4. Prod Stage -- see below

Both the Beta and Prod stages are derived from a common construct I've created, a `DeployStage`. At this stage, everything that is needed for the isolated application to work will be created. This currently includes:
- Virtual Private Clouds (VPCs)
- Application Load Balancers (ALBs)
- Elastic Container Service (ECS Tasks, Services, Clusters, Containers)
- Application Target Groups (to make distributing load easy)
- Auto-Scaling of ECS (CPU and Memory Triggers)
- Route 53 Zones and Domains
- SSL Certificates (Certificate Manager)
- SSM Parameters
- CloudFront Distribution

### Roadmap

As my current website is currently running on AWS Amplify, I haven't gotten around to a couple things -- namely:
- CloudFront Rules
- Subnets (still trying to figure this one out)
- Automatic deployment *of* this stack, *by* this stack (essentially consuming this repo as a GitHub source as well)
- Load and Integration tests of the Beta stage
- Manual Approvals between Beta and Prod
- Alarms and Metrics on Prod Stage

I still need to figure out exactly how to avoid specifying AWS account IDs in the source code, while also deploying the site to multiple regions and accounts -- all while making it easy to deploy to a personal account. A thought, though -- using Docker containers really brings down the need to set-up a lot of the infrastructure for testing. As cross-platform functionality can be guaranteed, there's almost no need to test out the site in an AWS stack. All you'd need is credentials to make calls to dependent services. Just thinking out loud.

### Takeways (So Far)

The AWS CDK has proven itself to be an extremely powerful tool, and the workflow is pretty incredible. Embracing Docker and GitHub is absolutely one of the best features -- it has caused development times to drastically drop. I cranked out the update to my old website repository to work well with Docker and NGINX to create a production-ready website and initialized the core functionality of this project in about 24 hours.

### Project Structure

To get into the details of how this project is structured, we'll need to take a look at the App's instantiation in `bin/portfolio-website-infra.ts`. Here, we declare the application and call our main stack, `lib/portfolio-website-infra-stack.ts`.

This file is where we define the front-end's ECR repository, the pipeline, the source stage, the build stage, and both deployment stages. The idea of everything outside of the deployment stages is to contain shared functionality (pipeline, ECR repo, GitHub sourcing, artifact building, etc) -- while the deployment stages are self-contained (own VPCs, load-balancers, ECS clusters, etc).

## Requirements

You'll need:
- the AWS CLI
- the AWS CDK CLI
- NodeJS -- specifically npm

## Installation

Clone this package:
```console
% git clone https://github.com/johnedquinn/portfolio-website-infra.git
% cd portfolio-website-infra
```

Install dependencies:
```console
% npm install
```

## Configuration

### Bootstrap

To bootstrap your AWS account (provide your AWS account with the necessary CDK configuration):
```console
% npx cdk bootstrap --profile <AWS_PROFILE> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

### Route 53 Domain

Prior to running this code, it's necessary to register two domains on Route 53 -- this is because it requires checking its availability, payment, etc. One will be for Beta, and one will be for Prod.

### SSM Parameters and GitHub Connection

You'll need to set up a GitHub connection, and you'll store its ARN (along with other strings) in the AWS SSM Parameter Store. After setting up the GitHub connection, run:
```console
% aws ssm put-parameter --name GITHUB_USER --value ${YOUR_USER} --type String
% aws ssm put-parameter --name GITHUB_REPO --value ${YOUR_REPO} --type String
% aws ssm put-parameter --name GITHUB_CONN --value ${YOUR_CONNECTION_ARN} --type String
```

This project will connect to SSM to grab these strings before deploying the Pipeline.

### Environment Variables

To configure to your own needs, you can specify some environment variables -- namely:
- `BETA_DOMAIN`: the beta domain name of your website
- `BETA_ZONE_ID`: the Zone ID where you have configured your beta domain
- `PROD_DOMAIN`: the domain name of your website
- `PROD_ZONE_ID`: the Zone ID where you have configured your domain
- `APP_INFRA_NAME`: this project's name
- `APP_NAME`: the web-application name
- `CDK_DEFAULT_ACCOUNT`: the account to create this pipeline in
- `CDK_DEFAULT_REGION`: the region to create this pipeline in

## Build

To perform a build, there will be some necessary configuration (which I'll fill out later), but, once set up, you can run:
```console
% npm run build
```

Then, to make sure CloudFormation is able to be generated without issues, run:
```console
% cdk synth
```

## To Run

Once you've verified that you can build without issues, it's time to deploy to your AWS account. Run:
```console
% cdk deploy
```

Great! It's as simple as that.

## CDK Generated Information

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
