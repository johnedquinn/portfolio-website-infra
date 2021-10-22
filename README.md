# Portfolio Website Infrastructure

This project initializes the necessary AWS infrastructure to host my personal website, [johnedquinn.io](https://johnedquinn.io). The [associated containerized React website](https://www.github.com/johnedquinn/portfolio-website) being deployed is a work-in-progress.

You can also see the beta website at [johnedquinn-beta.click](http://johnedquinn-beta.click).

## Project Information

As for how this was completed, I created an open-source `npm` package, namely [@johnedquinn/ecs-application](https://www.npmjs.com/package/@johnedquinn/ecs-application), that comes pre-formatted to deploy containerized applications to an industry-standard infrastructure. There's a lot more documentation in that package, so feel free to check it out.

## Requirements

### Tools

You'll need:
- [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

### Bootstrap

To bootstrap your AWS account (provide your AWS account with the necessary CDK configuration):
```console
% npx cdk bootstrap --profile <AWS_PROFILE> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

### Route 53 Domain

Prior to running this code, it's necessary to register two domains on Route 53 -- this is because it requires checking its availability, payment, etc. One will be for Beta, and one will be for Prod.

After that, you'll need to configure the A (Alias) records so you can access the site, but I'm working on creating these records on deployment. See the roadmap in the [contributing file](./CONTRIBUTING.md).

### GitHub Secrets

This is a work-in-progress, but I'm going to use GitHub Actions to initiate deployments to my AWS account.

### EcsApplication

The [@johnedquinn/ecs-application npm package](https://github.com/johnedquinn/ecs-application) has its own set of requirements before deploying to your AWS account. Please be sure to complete them before running this.

## Installation

Clone this package:
```console
git clone https://github.com/johnedquinn/portfolio-website-infra.git
cd portfolio-website-infra
```

Install dependencies:
```console
npm install
```

## Build

To perform a build, there will be some necessary configuration (which I'll fill out later), but, once set up, you can run:
```console
npm run build
```

Then, to make sure CloudFormation is able to be generated without issues, run:
```console
cdk synth
```

## To Deploy

Once you've verified that you can build without issues, it's time to deploy to your AWS account. Run:
```console
cdk deploy
```

It's as simple as that.
