# Contributing to this Project

First off -- thanks for even looking at this file! It's very much appreciated, as I am trying to keep documentation as up-to-date as possible.

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
- HTTP to HTTPS Routing on ALB
- CloudFront Distribution

### Roadmap

In the near-future, I'll be tackling:
- Dynamically-created Alias Records for Route 53
- CloudFront Rules
- Subnets (still trying to figure this one out)
- Automatic deployment *of* this stack, *by* this stack (essentially consuming this repo as a GitHub source as well)
- Load and Integration tests of the Beta stage
- Manual Approvals between Beta and Prod
- Alarms and Metrics on Prod Stage
- `beta` and `prod` tags on the Docker images. After the approval between beta and prod, I want to copy the `beta` image to `prod`. That way, there'll be no confusion or accidental overwriting in production.

**Note**: There is a known issue where, on deployment, the ECR Repo needs to contain an image -- but the image hasn't been uploaded. Therefore, the ECS service will infinitely try to create tasks. Issue is the ECR Repo can't exist before Stack initial creation. There might be an option -- but I'm not sure yet.

I still need to figure out exactly how to avoid specifying AWS account IDs in the source code, while also deploying the site to multiple regions and accounts -- all while making it easy to deploy to a personal account. A thought, though -- using Docker containers really brings down the need to set-up a lot of the infrastructure for testing. As cross-platform functionality can be guaranteed, there's almost no need to test out the site in an AWS stack. All you'd need is credentials to make calls to dependent services. Just thinking out loud.

### Takeways (So Far)

The AWS CDK has proven itself to be an extremely powerful tool, and the workflow is pretty incredible. Embracing Docker and GitHub is absolutely one of the best features -- it has caused development times to drastically drop. I cranked out the update to my old website repository to work well with Docker and NGINX to create a production-ready website and initialized the core functionality of this project in about 24 hours.

### Project Structure

To get into the details of how this project is structured, we'll need to take a look at the App's instantiation in `bin/portfolio-website-infra.ts`. Here, we declare the application and call our main stack, `lib/portfolio-website-infra-stack.ts`.

This file is where we define the front-end's ECR repository, the pipeline, the source stage, the build stage, and both deployment stages. The idea of everything outside of the deployment stages is to contain shared functionality (pipeline, ECR repo, GitHub sourcing, artifact building, etc) -- while the deployment stages are self-contained (own VPCs, load-balancers, ECS clusters, etc).
