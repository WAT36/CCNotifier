import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dotenv from "dotenv";
import * as path from "path";
import { Duration, RemovalPolicy } from "aws-cdk-lib";

dotenv.config({ path: path.join(__dirname, "../../.env") });

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ECR repository
    const repository = new ecr.Repository(this, "CCNotifierRepository", {
      repositoryName: "ccnotifier",
      lifecycleRules: [
        {
          // 最新の5つのイメージを保持し、それ以外は削除
          maxImageCount: 5,
          rulePriority: 1,
          description: "Keep only the latest 5 images",
        },
      ],
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

    const biPageBucket = new s3.Bucket(this, "CCNotifierBIStaticPageBuckets", {
      bucketName: "ccnotifier-bi-page-buckets",
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "404.html", // なければ index.html でもOK
      publicReadAccess: true, // ← Web 公開
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, // ポリシーで公開し、ACLは禁止
      removalPolicy: RemovalPolicy.RETAIN, // 本番：RETAIN 推奨（削除保護）
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

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
          REGION: process.env.REGION || "",
          CSV_UPLOAD_BUCKET_NAME: process.env.CSV_UPLOAD_BUCKET_NAME || "",
        },
      }
    );

    // IAMポリシーを作成（読み取り権限）
    const s3ReadPolicy = new iam.PolicyStatement({
      actions: ["s3:GetObject", "s3:ListBucket"], // 読み取り権限
      resources: [csvFileBucket.bucketArn, csvFileBucket.bucketArn + "/*"], // リソース
    });
    ccnotifierLambda.addToRolePolicy(s3ReadPolicy);

    // IAMポリシーを作成（書き込み権限 - CSVアップロード用）
    const s3WritePolicy = new iam.PolicyStatement({
      actions: ["s3:PutObject"], // 書き込み権限
      resources: [csvFileBucket.bucketArn + "/*"], // バケット内のオブジェクト
    });
    ccnotifierLambda.addToRolePolicy(s3WritePolicy);

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
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // プロキシ統合で全てのリクエストをLambdaに転送
    const proxyResource = api.root.addResource("{proxy+}");
    proxyResource.addMethod(
      "ANY",
      new apigw.LambdaIntegration(ccnotifierLambda, {
        proxy: true, // プロキシ統合を有効化
      })
    );

    // ルートパス（/）も処理できるように追加
    api.root.addMethod(
      "ANY",
      new apigw.LambdaIntegration(ccnotifierLambda, {
        proxy: true,
      })
    );

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, "CCNotifierUserPool", {
      userPoolName: "ccnotifier-user-pool",
      selfSignUpEnabled: false, // セルフサインアップ無効
      signInAliases: {
        username: true, // サインインにユーザー名を使用
        email: false,
        phone: false,
        preferredUsername: false,
      },
      standardAttributes: {},
      customAttributes: {
        name: new cognito.StringAttribute({
          mutable: true,
        }),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA, // 使用できる場合はEメール、それ以外はSMS
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用、本番環境では削除
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(
      this,
      "CCNotifierUserPoolClient",
      {
        userPool,
        userPoolClientName: "ccnotifier-user-pool-client",
        generateSecret: false, // パブリッククライアントの場合
        authFlows: {
          userPassword: true, // パスワード認証
          userSrp: true, // SRP認証フローを有効化
        },
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
          },
          scopes: [
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.PROFILE,
          ],
          callbackUrls: ["http://localhost:3000/callback"], // フロントエンドのコールバックURL
          logoutUrls: ["http://localhost:3000/logout"], // フロントエンドのログアウトURL
        },
      }
    );

    // Cognito User Pool Domain
    const userPoolDomain = new cognito.UserPoolDomain(
      this,
      "CCNotifierUserPoolDomain",
      {
        userPool,
        cognitoDomain: {
          domainPrefix: process.env.COGNITO_DOMAIN || "ccnotifier", // 環境変数から取得
        },
      }
    );
  }
}
