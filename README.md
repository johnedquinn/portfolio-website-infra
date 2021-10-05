# Portfolio Website Infrastructure

Hi! This project is an AWS CDK Pipeline, written in Typescript. Its goal is to set up a CodePipeline -- with stages involving CodeBuild, staging environments, and production environments (ECS) -- for developing and deploying my personal website. The [associated containerized React website](https://www.github.com/johnedquinn/portfolio-website), which houses my Portfolio Website is still a WIP.

The website is currently running at [johnedquinn.io](https://johnedquinn.io) thanks to this repository. You can also see the beta website at [johnedquinn-beta.click](http://johnedquinn-beta.click).

## General Project Flow

You can find implementation details and takeaways in the [contributing file](./CONTRIBUTING.md).

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

After that, you'll need to configure the A (Alias) records so you can access the site, but I'm working on creating these records on deployment. See the roadmap in the [contributing file](./CONTRIBUTING.md).

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
