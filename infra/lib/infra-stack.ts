import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as batch from "aws-cdk-lib/aws-batch";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as dotenv from "dotenv";

dotenv.config();

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
      "CCNotifierBatchSecurityGroup",
      { vpc }
    );
    const vpcEndpointSecurityGroup = new ec2.SecurityGroup(
      this,
      "CCNotifierVPCEndpointSecurityGroup",
      { vpc }
    );
    vpcEndpointSecurityGroup.addIngressRule(
      batchSecurityGroup,
      ec2.Port.tcp(443)
    );

    // vpc endpoint
    new ec2.InterfaceVpcEndpoint(this, "CCNotifierVPCEndpoint-ECR", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      securityGroups: [vpcEndpointSecurityGroup],
    });
    new ec2.InterfaceVpcEndpoint(this, "CCNotifierVPCEndpoint-ECR_DOCKER", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      securityGroups: [vpcEndpointSecurityGroup],
    });
    new ec2.InterfaceVpcEndpoint(this, "CCNotifierVPCEndpoint-ECS", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECS,
      securityGroups: [vpcEndpointSecurityGroup],
    });
    new ec2.InterfaceVpcEndpoint(this, "CCNotifierVPCEndpoint-ECS_AGENT", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECS_AGENT,
      securityGroups: [vpcEndpointSecurityGroup],
    });
    new ec2.InterfaceVpcEndpoint(this, "CCNotifierVPCEndpoint-ECS_TELEMETRY", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
      securityGroups: [vpcEndpointSecurityGroup],
    });
    new ec2.InterfaceVpcEndpoint(this, "CCNotifierVPCEndpoint-SSM", {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      securityGroups: [vpcEndpointSecurityGroup],
    });
    new ec2.InterfaceVpcEndpoint(
      this,
      "CCNotifierVPCEndpoint-CLOUDWATCH_LOGS",
      {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        securityGroups: [vpcEndpointSecurityGroup],
      }
    );
    new ec2.GatewayVpcEndpoint(this, "CCNotifierVPCEndpoint-S3", {
      vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

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
          iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess"),
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
    const jobQueue = new batch.CfnJobQueue(this, "CCNotifierBatchJobQueue", {
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
    const batchContainerProperties = {
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
      secrets: [
        {
          name: "API_KEY",
          valueFrom: process.env.API_KEY || "",
        },
        {
          name: "API_SECRET_KEY",
          valueFrom: process.env.API_SECRET_KEY || "",
        },
        {
          name: "API_ENDPONT",
          valueFrom: process.env.API_ENDPONT || "",
        },
        {
          name: "API_PUBLIC_ENDPONT",
          valueFrom: process.env.API_PUBLIC_ENDPONT || "",
        },
        {
          name: "DATABASE_URL",
          valueFrom: process.env.DATABASE_URL || "",
        },
        {
          name: "SHOP_URL_PAGE",
          valueFrom: process.env.SHOP_URL_PAGE || "",
        },
      ],
    };
    const jobDefinition = new batch.CfnJobDefinition(
      this,
      "CCNotifierBatchJobDefinition",
      {
        type: "container",
        jobDefinitionName: "CCNotifierBatchJobDefinition",
        retryStrategy: {
          attempts: 1,
          evaluateOnExit: [],
        },
        containerProperties: {
          ...batchContainerProperties,
        },
        platformCapabilities: ["FARGATE"],
      }
    );
    const allUpdateJobDefinition = new batch.CfnJobDefinition(
      this,
      "CCNotifierAllUpdateBatchJobDefinition",
      {
        type: "container",
        jobDefinitionName: "CCNotifierAllUpdateBatchJobDefinition",
        retryStrategy: {
          attempts: 1,
          evaluateOnExit: [],
        },
        containerProperties: {
          ...batchContainerProperties,
          environment: [
            {
              name: "ALLUPDATE",
              value: "on",
            },
          ],
        },
        platformCapabilities: ["FARGATE"],
      }
    );

    // EventBridge
    new events.Rule(this, "CCNotifierBatchEvent", {
      ruleName: "CCNotifierBatchEvent",
      schedule: events.Schedule.cron({
        month: "12",
        day: "4",
        hour: "20",
        minute: "0",
      }),
      targets: [
        new targets.BatchJob(
          jobQueue.attrJobQueueArn,
          jobQueue,
          `arn:aws:batch:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:job-definition/${jobDefinition.jobDefinitionName}`,
          jobDefinition,
          {}
        ),
      ],
    });
    new events.Rule(this, "CCNotifierAllUpdateBatchEvent", {
      ruleName: "CCNotifierAllUpdateBatchEvent",
      schedule: events.Schedule.cron({
        month: "12",
        day: "4",
        hour: "20",
        minute: "0",
      }),
      targets: [
        new targets.BatchJob(
          jobQueue.attrJobQueueArn,
          jobQueue,
          `arn:aws:batch:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:job-definition/${allUpdateJobDefinition.jobDefinitionName}`,
          allUpdateJobDefinition,
          {}
        ),
      ],
    });
  }
}
