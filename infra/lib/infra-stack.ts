import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dotenv from "dotenv";
import { Duration } from "aws-cdk-lib";

dotenv.config();

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ECR repository
    const repository = new ecr.Repository(this, "CCNotifierRepository", {
      repositoryName: "ccnotifier",
    });

    // ECR repository
    const lambdaExperimentRepository = new ecr.Repository(
      this,
      "CCNotifierRepositoryForLambda",
      {
        repositoryName: "ccnotifier_for_lambda",
      }
    );

    // Lambda
    new lambda.Function(this, "CCNotifierImageFunctions", {
      code: new lambda.EcrImageCode(repository, {}),
      handler: lambda.Handler.FROM_IMAGE,
      runtime: lambda.Runtime.FROM_IMAGE,
      timeout: Duration.minutes(15),
      memorySize: 512,
    });

    // // EventBridge
    // new events.Rule(this, "CCNotifierAllUpdateBatchEvent", {
    //   ruleName: "CCNotifierAllUpdateBatchEvent",
    //   schedule: events.Schedule.cron({
    //     hour: "0-15/3,21",
    //     minute: "2",
    //   }),
    //   targets: [
    //     new targets.BatchJob(
    //       jobQueue.attrJobQueueArn,
    //       jobQueue,
    //       `arn:aws:batch:${cdk.Stack.of(this).region}:${
    //         cdk.Stack.of(this).account
    //       }:job-definition/${allUpdateJobDefinition.jobDefinitionName}`,
    //       allUpdateJobDefinition,
    //       {}
    //     ),
    //   ],
    // });
  }
}
