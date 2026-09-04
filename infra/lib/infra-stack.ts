import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface InfraStackProps extends cdk.StackProps {
  certificate: acm.ICertificate;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // ECR repository
    const repository = new ecr.Repository(this, 'CCNotifierRepository', {
      repositoryName: 'ccnotifier',
      lifecycleRules: [
        {
          // 最新の5つのイメージを保持し、それ以外は削除
          maxImageCount: 5,
          rulePriority: 1,
          description: 'Keep only the latest 5 images'
        }
      ]
    });

    // S3
    // TODO ライフサイクルルール追加　一週間くらい経ったらoldに移すようなルールつけたい
    const csvFileBucket = new s3.Bucket(this, 'CCNotifierCsvFileUploadsBuckets', {
      bucketName: 'ccnotifier-csv-uploads-buckets',
      eventBridgeEnabled: true
    });

    const biPageBucket = new s3.Bucket(this, 'CCNotifierBIStaticPageBuckets', {
      bucketName: 'ccnotifier-bi-page-buckets',
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: '404.html', // なければ index.html でもOK
      publicReadAccess: true, // ← Web 公開
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, // ポリシーで公開し、ACLは禁止
      removalPolicy: RemovalPolicy.RETAIN, // 本番：RETAIN 推奨（削除保護）
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*']
        }
      ]
    });

    // Archive Bucket（priceRateHistory アーカイブ用）
    const archiveBucket = new s3.Bucket(this, 'CCNotifierArchiveBucket', {
      bucketName: 'ccnotifier-price-rate-archive',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(365)
            }
          ]
        }
      ]
    });

    // Lambda
    const ccnotifierLambda = new lambda.Function(this, 'CCNotifierImageFunctions', {
      code: new lambda.EcrImageCode(repository, {}),
      handler: lambda.Handler.FROM_IMAGE,
      runtime: lambda.Runtime.FROM_IMAGE,
      timeout: Duration.minutes(15),
      memorySize: 512,
      functionName: 'CCNotifierImageFunctions',
      // TODO parameter storeから取りたい
      environment: {
        API_ENDPONT: process.env.API_ENDPONT || '',
        API_KEY: process.env.API_KEY || '',
        API_PUBLIC_ENDPONT: process.env.API_PUBLIC_ENDPONT || '',
        API_SECRET_KEY: process.env.API_SECRET_KEY || '',
        DATABASE_URL: process.env.DATABASE_URL || '',
        SHOP_URL: process.env.SHOP_URL || '',
        SHOP_URL_PAGE: process.env.SHOP_URL_PAGE || '',
        WEBHOOK_URL: process.env.WEBHOOK_URL || '',
        REGION: process.env.REGION || '',
        CSV_UPLOAD_BUCKET_NAME: process.env.CSV_UPLOAD_BUCKET_NAME || '',
        ORDER_LIST_API_URL: process.env.ORDER_LIST_API_URL || ''
      }
    });

    // IAMポリシーを作成（読み取り権限）
    const s3ReadPolicy = new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:ListBucket'], // 読み取り権限
      resources: [csvFileBucket.bucketArn, csvFileBucket.bucketArn + '/*'] // リソース
    });
    ccnotifierLambda.addToRolePolicy(s3ReadPolicy);

    // IAMポリシーを作成（書き込み権限 - CSVアップロード用）
    const s3WritePolicy = new iam.PolicyStatement({
      actions: ['s3:PutObject'], // 書き込み権限
      resources: [csvFileBucket.bucketArn + '/*'] // バケット内のオブジェクト
    });
    ccnotifierLambda.addToRolePolicy(s3WritePolicy);

    // IAMポリシーを作成（Archive_Bucket への書き込み権限）
    const archiveBucketWritePolicy = new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [archiveBucket.bucketArn + '/*']
    });
    ccnotifierLambda.addToRolePolicy(archiveBucketWritePolicy);

    // EventBridge
    // 定期バッチはrateCheck/chartPatterns/sneakerの3ジョブに分割し、それぞれ別ルールから
    // job名をLambdaへの入力として渡す。1回の実行時間を短くしてLambdaタイムアウトのリスクを下げるため
    const rateCheckEvent = new events.Rule(this, 'CCNotifierRateCheck', {
      ruleName: 'CCNotifierRateCheck',
      schedule: events.Schedule.cron({
        hour: '0-16,20-23',
        minute: '2'
      })
    });
    rateCheckEvent.addTarget(
      new targets.LambdaFunction(ccnotifierLambda, {
        event: events.RuleTargetInput.fromObject({ job: 'rateCheck' })
      })
    );

    const chartPatternsEvent = new events.Rule(this, 'CCNotifierChartPatterns', {
      ruleName: 'CCNotifierChartPatterns',
      schedule: events.Schedule.cron({
        hour: '0-16,20-23',
        minute: '4'
      })
    });
    chartPatternsEvent.addTarget(
      new targets.LambdaFunction(ccnotifierLambda, {
        event: events.RuleTargetInput.fromObject({ job: 'chartPatterns' })
      })
    );

    const sneakerEvent = new events.Rule(this, 'CCNotifierSneaker', {
      ruleName: 'CCNotifierSneaker',
      schedule: events.Schedule.cron({
        hour: '0-16,20-23',
        minute: '6'
      })
    });
    sneakerEvent.addTarget(
      new targets.LambdaFunction(ccnotifierLambda, {
        event: events.RuleTargetInput.fromObject({ job: 'sneaker' })
      })
    );

    // 月次アーカイブ EventBridge ルール（毎月1日 UTC 0:02）
    const archivePriceRateHistoryEvent = new events.Rule(this, 'CCNotifierArchivePriceRateHistory', {
      ruleName: 'CCNotifierArchivePriceRateHistory',
      schedule: events.Schedule.expression('cron(2 0 1 * ? *)')
    });
    archivePriceRateHistoryEvent.addTarget(
      new targets.LambdaFunction(ccnotifierLambda, {
        event: events.RuleTargetInput.fromObject({ job: 'archivePriceRateHistory' })
      })
    );

    const ccnotifierFileUploadedEvent = new events.Rule(this, 'CCNotifierFileUploaded', {
      ruleName: 'CCNotifierFileUploaded',
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [csvFileBucket.bucketName]
          },
          object: {
            key: [
              {
                suffix: '.csv'
              }
            ]
          }
        }
      }
    });
    ccnotifierFileUploadedEvent.addTarget(new targets.LambdaFunction(ccnotifierLambda, {}));

    // API gateway
    const api = new apigw.RestApi(this, 'ccnotifierRestApi', {
      restApiName: 'ccnotifier-fn-api',
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      }
    });

    // プロキシ統合で全てのリクエストをLambdaに転送
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod(
      'ANY',
      new apigw.LambdaIntegration(ccnotifierLambda, {
        proxy: true // プロキシ統合を有効化
      })
    );

    // ルートパス（/）も処理できるように追加
    api.root.addMethod(
      'ANY',
      new apigw.LambdaIntegration(ccnotifierLambda, {
        proxy: true
      })
    );

    // Route53 Hosted Zone (既存ドメインをインポート)
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: process.env.HOSTZONE_ID!,
      zoneName: process.env.HOSTZONE_NAME!
    });

    // CloudFront Distribution (フロントエンド用)
    const frontDistribution = new cloudfront.Distribution(this, 'CCNotifierFrontDistribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(biPageBucket.bucketWebsiteDomainName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      domainNames: [process.env.FRONT_DOMAIN_NAME!],
      certificate: props.certificate
    });

    // Route53 Aレコード (フロント用ドメイン → CloudFront)
    const frontDomain = process.env.FRONT_DOMAIN_NAME!;
    const hostzoneName = process.env.HOSTZONE_NAME!;
    const subDomain = frontDomain.endsWith(`.${hostzoneName}`)
      ? frontDomain.slice(0, frontDomain.length - hostzoneName.length - 1)
      : frontDomain;

    new route53.ARecord(this, 'CCNotifierFrontARecord', {
      zone: hostedZone,
      recordName: subDomain,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(frontDistribution))
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'CCNotifierUserPool', {
      userPoolName: 'ccnotifier-user-pool',
      selfSignUpEnabled: false, // セルフサインアップ無効
      signInAliases: {
        username: true, // サインインにユーザー名を使用
        email: false,
        phone: false,
        preferredUsername: false
      },
      standardAttributes: {},
      customAttributes: {
        name: new cognito.StringAttribute({
          mutable: true
        })
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA, // 使用できる場合はEメール、それ以外はSMS
      removalPolicy: cdk.RemovalPolicy.DESTROY // 開発環境用、本番環境では削除
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'CCNotifierUserPoolClient', {
      userPool,
      userPoolClientName: 'ccnotifier-user-pool-client',
      generateSecret: false, // パブリッククライアントの場合
      authFlows: {
        userPassword: true, // パスワード認証
        userSrp: true // SRP認証フローを有効化
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:3000/callback'], // フロントエンドのコールバックURL
        logoutUrls: ['http://localhost:3000/logout'] // フロントエンドのログアウトURL
      }
    });

    // Cognito User Pool Domain
    const userPoolDomain = new cognito.UserPoolDomain(this, 'CCNotifierUserPoolDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix: process.env.COGNITO_DOMAIN || 'ccnotifier' // 環境変数から取得
      }
    });
  }
}
