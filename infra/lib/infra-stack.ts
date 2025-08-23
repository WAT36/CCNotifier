import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigw from "aws-cdk-lib/aws-apigateway";
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

    // S3
    // TODO ライフサイクルルール追加　一週間くらい経ったらoldに移すようなルールつけたい
    const csvFileBucket = new s3.Bucket(
      this,
      "CCNotifierCsvFileUploadsBuckets",
      {
        bucketName: "ccnotifier-csv-uploads-buckets",
        eventBridgeEnabled: true,
      }
    );

    // Lambda
    const ccnotifierLambda = new lambda.Function(
      this,
      "CCNotifierImageFunctions",
      {
        code: new lambda.EcrImageCode(repository, {}),
        handler: lambda.Handler.FROM_IMAGE,
        runtime: lambda.Runtime.FROM_IMAGE,
        timeout: Duration.minutes(15),
        memorySize: 512,
        functionName: "CCNotifierImageFunctions",
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
      }
    );

    // IAMポリシーを作成
    const s3ReadPolicy = new iam.PolicyStatement({
      actions: ["s3:GetObject", "s3:ListBucket"], // アクセス権限
      resources: [csvFileBucket.bucketArn, csvFileBucket.bucketArn + "/*"], // リソース
    });
    // Lambda関数にポリシーをアタッチ
    ccnotifierLambda.addToRolePolicy(s3ReadPolicy);

    // EventBridge
    const ccnotifierEvent = new events.Rule(this, "CCNotifier", {
      ruleName: "CCNotifier",
      schedule: events.Schedule.cron({
        hour: "0-16,20-23",
        minute: "2",
      }),
    });
    ccnotifierEvent.addTarget(new targets.LambdaFunction(ccnotifierLambda, {}));

    const ccnotifierFileUploadedEvent = new events.Rule(
      this,
      "CCNotifierFileUploaded",
      {
        ruleName: "CCNotifierFileUploaded",
        eventPattern: {
          source: ["aws.s3"],
          detailType: ["Object Created"],
          detail: {
            bucket: {
              name: [csvFileBucket.bucketName],
            },
            object: {
              key: [
                {
                  suffix: ".csv",
                },
              ],
            },
          },
        },
      }
    );
    ccnotifierFileUploadedEvent.addTarget(
      new targets.LambdaFunction(ccnotifierLambda, {})
    );

    // API gateway
    const api = new apigw.RestApi(this, "ccnotifierRestApi", {
      restApiName: "ccnotifier-fn-api",
      deployOptions: { stageName: "prod" },
    });
    api.root
      .addResource("notice")
      .addMethod("GET", new apigw.LambdaIntegration(ccnotifierLambda));
  }
}
