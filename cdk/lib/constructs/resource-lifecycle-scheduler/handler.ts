import {
  CloudFormationClient,
  ListStackResourcesCommand,
  type StackResourceSummary,
} from '@aws-sdk/client-cloudformation';
import { EC2Client, DescribeInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import { RDSClient, DescribeDBClustersCommand, StopDBClusterCommand } from '@aws-sdk/client-rds';
import type { Handler } from 'aws-lambda';

const cloudFormation = new CloudFormationClient({});
const ec2 = new EC2Client({});
const rds = new RDSClient({});

const stackName = process.env.STACK_NAME;

if (!stackName) {
  throw new Error('STACK_NAME is required');
}

const listStackResources = async () => {
  const resources: StackResourceSummary[] = [];
  let nextToken: string | undefined;

  do {
    const response = await cloudFormation.send(
      new ListStackResourcesCommand({
        StackName: stackName,
        NextToken: nextToken,
      }),
    );
    resources.push(...(response.StackResourceSummaries ?? []));
    nextToken = response.NextToken;
  } while (nextToken);

  return resources;
};

const stopClusterIfRunning = async (dbClusterIdentifier: string) => {
  const response = await rds.send(
    new DescribeDBClustersCommand({
      DBClusterIdentifier: dbClusterIdentifier,
    }),
  );

  const cluster = response.DBClusters?.[0];
  const status = cluster?.Status ?? 'unknown';
  if (status !== 'available') {
    console.log(JSON.stringify({ resourceType: 'rds', dbClusterIdentifier, action: 'skip', status }));
    return;
  }

  await rds.send(
    new StopDBClusterCommand({
      DBClusterIdentifier: dbClusterIdentifier,
    }),
  );
  console.log(JSON.stringify({ resourceType: 'rds', dbClusterIdentifier, action: 'stop', status }));
};

const stopInstanceIfRunning = async (instanceId: string) => {
  const response = await ec2.send(
    new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    }),
  );

  const state = response.Reservations?.[0]?.Instances?.[0]?.State?.Name ?? 'unknown';
  if (state !== 'running') {
    console.log(JSON.stringify({ resourceType: 'ec2', instanceId, action: 'skip', state }));
    return;
  }

  await ec2.send(
    new StopInstancesCommand({
      InstanceIds: [instanceId],
    }),
  );
  console.log(JSON.stringify({ resourceType: 'ec2', instanceId, action: 'stop', state }));
};

export const handler: Handler = async () => {
  const resources = await listStackResources();
  const dbClusters = resources
    .filter((resource) => resource.ResourceType === 'AWS::RDS::DBCluster' && resource.PhysicalResourceId)
    .map((resource) => resource.PhysicalResourceId!);
  const ec2Instances = resources
    .filter((resource) => resource.ResourceType === 'AWS::EC2::Instance' && resource.PhysicalResourceId)
    .map((resource) => resource.PhysicalResourceId!);

  console.log(JSON.stringify({ stackName, dbClusters, ec2Instances }));

  for (const dbClusterIdentifier of dbClusters) {
    await stopClusterIfRunning(dbClusterIdentifier);
  }

  for (const instanceId of ec2Instances) {
    await stopInstanceIfRunning(instanceId);
  }
};
