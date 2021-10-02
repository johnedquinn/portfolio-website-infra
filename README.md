# Portfolio Website Infrastructure

Hi! This project is an AWS CDK Pipeline, written in Typescript. Its goal is to set up a CodePipeline -- with stages involving CodeBuild, staging environments, and production environments (ECS).

## To Run

### Bootstrap

To bootstrap your AWS account:
```console
% npx cdk bootstrap --profile <AWS_PROFILE> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

## CDK Information

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
