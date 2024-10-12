#!/bin/bash

ZONE_NAME=$(curl -s $ECS_CONTAINER_METADATA_URI_V4/task | jq -r .AvailabilityZone)
ZONE_ID=$(aws ec2 describe-availability-zones |
	jq -r ".AvailabilityZones[] | select(.ZoneName==\"${ZONE_NAME}\").ZoneId")
export ISUXPORTAL_SUPERVISOR_INSTANCE_NAME="${ZONE_ID}"

PUBLIC_IP=$($ECS_CONTAINER_METADATA_URI_V4 | jq -r '.Networks[0].IPv4Addresses[0]')
export ISUXBENCH_PUBLIC_IP="${PUBLIC_IP}"

exec "$@"
