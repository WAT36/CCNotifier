import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';

/**
 * テスト用ヘルパー: InfraStack インスタンスと Template を生成する。
 *
 * Route53/CloudFront で必要な環境変数はテスト用ダミー値で設定する。
 * 証明書は CertStack 相当の Stack スコープ内で生成する。
 */
function createTestStack(): { stack: InfraStack; template: Template } {
  // 環境変数をテスト用ダミー値で設定
  process.env.HOSTZONE_ID = 'Z0000000000000000000';
  process.env.HOSTZONE_NAME = 'example.com';
  process.env.FRONT_DOMAIN_NAME = 'app.example.com';
  process.env.COGNITO_DOMAIN = 'ccnotifier-test';

  const app = new cdk.App();

  // CloudFront 用証明書は us-east-1 の別スタックで作成する（本番と同一パターン）
  const certStack = new cdk.Stack(app, 'CertStack', {
    env: { account: '123456789012', region: 'us-east-1' }
  });
  const cert = new acm.Certificate(certStack, 'TestCert', {
    domainName: 'app.example.com'
  });

  const stack = new InfraStack(app, 'TestStack', {
    env: { account: '123456789012', region: 'ap-northeast-1' },
    crossRegionReferences: true,
    certificate: cert
  });

  return { stack, template: Template.fromStack(stack) };
}

// ---------------------------------------------------------------------------
// タスク 6.4: CDK スナップショットテスト
// Requirements: 5.1, 5.3, 6.1, 6.2, 6.3, 6.4
// ---------------------------------------------------------------------------

describe('InfraStack - Archive Bucket', () => {
  let template: Template;

  beforeAll(() => {
    template = createTestStack().template;
  });

  // 6.1 & 6.2: Archive_Bucket の存在と BlockPublicAccess: ALL
  it('Archive_Bucket が作成されており BlockPublicAccess: ALL が設定されていること', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'ccnotifier-price-rate-archive',
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      }
    });
  });

  // 6.4: ライフサイクルルール（GLACIER 移行 365 日）
  it('Archive_Bucket にライフサイクルルール（GLACIER 移行 365 日）が設定されていること', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'ccnotifier-price-rate-archive',
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Status: 'Enabled',
            Transitions: Match.arrayWith([
              Match.objectLike({
                StorageClass: 'GLACIER',
                TransitionInDays: 365
              })
            ])
          })
        ])
      }
    });
  });
});

describe('InfraStack - Lambda IAM Policy', () => {
  let template: Template;

  beforeAll(() => {
    template = createTestStack().template;
  });

  // 6.3: Lambda ロールに Archive_Bucket への s3:PutObject 権限が付与されていること
  it('Lambda ロールに Archive_Bucket への s3:PutObject 権限が付与されていること', () => {
    // Lambda の DefaultPolicy に s3:PutObject が含まれ、
    // Archive Bucket の ARN を参照していることを確認する
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:PutObject',
            Effect: 'Allow',
            Resource: Match.objectLike({
              'Fn::Join': Match.arrayWith([
                Match.arrayWith([
                  Match.objectLike({
                    'Fn::GetAtt': Match.arrayWith(['CCNotifierArchiveBucket2DA4642B'])
                  })
                ])
              ])
            })
          })
        ])
      }
    });
  });
});

describe('InfraStack - EventBridge Rule', () => {
  let template: Template;

  beforeAll(() => {
    template = createTestStack().template;
  });

  // 5.1 & 5.3: EventBridge ルールの cron 式
  it('アーカイブ用 EventBridge ルールの cron 式が cron(2 0 1 * ? *) であること', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Name: 'CCNotifierArchivePriceRateHistory',
      ScheduleExpression: 'cron(2 0 1 * ? *)',
      State: 'ENABLED'
    });
  });

  // 5.3: Lambda ターゲット入力に { "job": "archivePriceRateHistory" } が設定されていること
  it('Lambda ターゲット入力に { "job": "archivePriceRateHistory" } が設定されていること', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Name: 'CCNotifierArchivePriceRateHistory',
      Targets: Match.arrayWith([
        Match.objectLike({
          Input: JSON.stringify({ job: 'archivePriceRateHistory' })
        })
      ])
    });
  });
});
