import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export class CertStack extends cdk.Stack {
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: process.env.HOSTZONE_ID!,
      zoneName: process.env.HOSTZONE_NAME!
    });

    this.certificate = new acm.Certificate(this, 'FrontendCertificate', {
      domainName: process.env.FRONT_DOMAIN_NAME!,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });
  }
}
