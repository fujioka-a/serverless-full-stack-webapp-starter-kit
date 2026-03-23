import { CfnOutput, Duration, RemovalPolicy, TimeZone } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Schedule, ScheduleExpression } from 'aws-cdk-lib/aws-scheduler';
import { LambdaInvoke } from 'aws-cdk-lib/aws-scheduler-targets';
import { Construct } from 'constructs';
import { join } from 'path';

export interface ResourceLifecycleSchedulerProps {
  readonly stackName: string;
}

export class ResourceLifecycleScheduler extends Construct {
  constructor(scope: Construct, id: string, props: ResourceLifecycleSchedulerProps) {
    super(scope, id);

    const handler = new NodejsFunction(this, 'Handler', {
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      entry: join(__dirname, 'handler.ts'),
      handler: 'handler',
      timeout: Duration.minutes(5),
      environment: {
        STACK_NAME: props.stackName,
      },
      logGroup: new LogGroup(this, 'HandlerLogs', {
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });

    handler.addToRolePolicy(
      new PolicyStatement({
        actions: ['cloudformation:ListStackResources'],
        resources: ['*'],
      }),
    );
    handler.addToRolePolicy(
      new PolicyStatement({
        actions: ['rds:DescribeDBClusters', 'rds:StopDBCluster'],
        resources: ['*'],
      }),
    );
    handler.addToRolePolicy(
      new PolicyStatement({
        actions: ['ec2:DescribeInstances', 'ec2:StopInstances'],
        resources: ['*'],
      }),
    );

    new Schedule(this, 'DailyStopSchedule', {
      schedule: ScheduleExpression.cron({
        minute: '0',
        hour: '6',
        timeZone: TimeZone.ASIA_TOKYO,
      }),
      target: new LambdaInvoke(handler, {
        retryAttempts: 3,
      }),
      description: 'Checks the stack resources every morning and stops running Aurora clusters and EC2 instances.',
    });

    new CfnOutput(this, 'DailyStopSchedulerFunctionName', { value: handler.functionName });
  }
}
