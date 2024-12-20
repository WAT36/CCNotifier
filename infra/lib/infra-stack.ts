import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dotenv from "dotenv";
import * as path from "path";
import { Duration } from "aws-cdk-lib";

dotenv.config({ path: path.join(__dirname, "../../.env") });

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
      // TODO parameter storeから取りたい
      environment: {
        API_ENDPONT: process.env.API_ENDPONT || "",
        API_KEY: process.env.API_KEY || "",
        API_PUBLIC_ENDPONT: process.env.API_PUBLIC_ENDPONT || "",
        API_SECRET_KEY: process.env.API_SECRET_KEY || "",
        DATABASE_URL: process.env.DATABASE_URL || "",
        SHOP_URL: process.env.SHOP_URL || "",
        SHOP_URL_PAGE: process.env.SHOP_URL_PAGE || "",
        WEBHOOK_URL: process.env.WEBHOOK_URL || "",
      },
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
