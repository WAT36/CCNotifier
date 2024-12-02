import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as batch from "aws-cdk-lib/aws-batch";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ECR repository
    const repository = new ecr.Repository(this, "CCNotifierRepository", {
      repositoryName: "ccnotifier",
    });

    // VPC
    const vpc = new ec2.Vpc(this, "CCNotifierVPC", {
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

    // securityGroup
    const batchSecurityGroup = new ec2.SecurityGroup(
      this,
      "BatchSecurityGroup",
      { vpc }
    );

    // IAM Role

    const batchTaskExecutionRole = new iam.Role(
      this,
      " CCNotifierBatchTaskExecutionRole",
      {
        roleName: "CCNotifierBatchTaskExecutionRole",
        assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AmazonECSTaskExecutionRolePolicy"
          ),
        ],
      }
    );

    const batchTaskRole = new iam.Role(this, "CCNotifierBatchTaskRole", {
      roleName: "CCNotifierBatchTaskRole",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // Batch
    // Compute Environment
    const batchComputeEnvironment = new batch.CfnComputeEnvironment(
      this,
      "CCNotifierBatchComputingEnvironment",
      {
        type: "MANAGED",
        computeEnvironmentName: "CCNotifierBatchComputingEnvironment",
        computeResources: {
          type: "FARGATE",
          maxvCpus: 256,
          subnets: vpc.publicSubnets.map((subnet) => subnet.subnetId),
          securityGroupIds: [batchSecurityGroup.securityGroupId],
        },
      }
    );

    // Job queue
    new batch.CfnJobQueue(this, "CCNotifierBatchJobQueue", {
      jobQueueName: "CCNotifierBatchJobQueue",
      priority: 1,
      computeEnvironmentOrder: [
        {
          order: 1,
          computeEnvironment: batchComputeEnvironment.attrComputeEnvironmentArn,
        },
      ],
    });

    // Job definition
    new batch.CfnJobDefinition(this, "CCNotifierBatchJobDefinition", {
      type: "container",
      jobDefinitionName: "CCNotifierBatchJobDefinition",
      retryStrategy: {
        attempts: 1,
        evaluateOnExit: [],
      },
      containerProperties: {
        image: repository.repositoryUri,
        jobRoleArn: batchTaskRole.roleArn,
        executionRoleArn: batchTaskExecutionRole.roleArn,
        user: "root",
        resourceRequirements: [
          {
            value: "1",
            type: "VCPU",
          },
          {
            value: "2048",
            type: "MEMORY",
          },
        ],
        logConfiguration: {
          logDriver: "awslogs",
        },
        networkConfiguration: {
          assignPublicIp: "ENABLED",
        },
        fargatePlatformConfiguration: {
          platformVersion: "LATEST",
        },
      },
      platformCapabilities: ["FARGATE"],
    });
  }
}
