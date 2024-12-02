import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ECR repository
    new ecr.Repository(this, "CCNotifierRepository", {
      repositoryName: "ccnotifier",
    });

    // VPC
    new ec2.Vpc(this, "CCNotifierVPC", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "batch",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      vpcName: "CCNotifierVPC",
    });
  }
}
