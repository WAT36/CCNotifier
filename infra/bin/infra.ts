#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { InfraStack } from '../lib/infra-stack';
import { CertStack } from '../lib/cert-stack';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = new cdk.App();

const accountId = process.env.CDK_DEFAULT_ACCOUNT;
const mainRegion = process.env.REGION || 'ap-northeast-1';

// ACM証明書はCloudFrontのためus-east-1で作成する必要がある
const certStack = new CertStack(app, 'CCNotifierCertStack', {
  env: { account: accountId, region: 'us-east-1' },
  crossRegionReferences: true
});

new InfraStack(app, 'CCNotifierInfraStack', {
  env: { account: accountId, region: mainRegion },
  crossRegionReferences: true,
  certificate: certStack.certificate
});
