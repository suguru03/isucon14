#!/bin/bash

ZONE_NAME=$(curl -s $ECS_CONTAINER_METADATA_URI_V4/task | jq -r .AvailabilityZone)
ZONE_ID=$(aws ec2 describe-availability-zones |
	jq -r ".AvailabilityZones[] | select(.ZoneName==\"${ZONE_NAME}\").ZoneId")
export ISUXPORTAL_SUPERVISOR_INSTANCE_NAME="${ZONE_ID}"

TASK_ARN=$(curl -s $ECS_CONTAINER_METADATA_URI_V4/task | jq -r '.TaskARN // .TaskArn')
CLUSTER_ARN=$(echo "$TASK_METADATA" | jq -r '.Cluster')

CLUSTER_NAME=$(echo "$CLUSTER_ARN" | awk -F'/' '{print $NF}')

TASK_DESC=$(aws ecs describe-tasks --cluster "$CLUSTER_NAME" --tasks "$TASK_ARN")
ENI_ID=$(echo "$TASK_DESC" | jq -r '.tasks[0].attachments[0].details[] | select(.name=="networkInterfaceId") | .value')

ENI_DESC=$(aws ec2 describe-network-interfaces --network-interface-ids "$ENI_ID")
PUBLIC_IP=$(echo "$ENI_DESC" | jq -r '.NetworkInterfaces[0].Association.PublicIp')
export ISUXBENCH_PUBLIC_IP="${PUBLIC_IP}"

exec "$@"
