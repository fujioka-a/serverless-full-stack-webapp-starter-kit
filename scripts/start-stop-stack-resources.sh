#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/start-stop-stack-resources.sh <start|stop|status> <stack-name> [region]

Examples:
  scripts/start-stop-stack-resources.sh status ServerlessWebappStarterKitStack ap-northeast-1
  scripts/start-stop-stack-resources.sh stop ServerlessWebappStarterKitStack
  scripts/start-stop-stack-resources.sh start ServerlessWebappStarterKitStack
EOF
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
  exit 1
fi

ACTION="$1"
STACK_NAME="$2"
REGION="${3:-${AWS_REGION:-${AWS_DEFAULT_REGION:-}}}"

if [[ -z "$REGION" ]]; then
  echo "region is required. Pass it as the 3rd argument or set AWS_REGION/AWS_DEFAULT_REGION." >&2
  exit 1
fi

case "$ACTION" in
  start|stop|status)
    ;;
  *)
    echo "invalid action: $ACTION" >&2
    usage
    exit 1
    ;;
esac

aws_cf() {
  aws cloudformation "$@" --stack-name "$STACK_NAME" --region "$REGION"
}

aws_rds() {
  aws rds "$@" --region "$REGION"
}

aws_ec2() {
  aws ec2 "$@" --region "$REGION"
}

readarray_safe() {
  local query="$1"
  RESULT=()
  while IFS= read -r line; do
    RESULT+=("$line")
  done < <(aws_cf list-stack-resources --query "$query" --output text | tr '\t' '\n' | sed '/^None$/d;/^$/d')
}

print_section() {
  local title="$1"
  echo
  echo "== $title =="
}

print_stack_summary() {
  echo "stack:  $STACK_NAME"
  echo "region: $REGION"
}

describe_cluster_status() {
  local cluster_id="$1"
  aws_rds describe-db-clusters \
    --db-cluster-identifier "$cluster_id" \
    --query 'DBClusters[0].Status' \
    --output text
}

describe_instance_state() {
  local instance_id="$1"
  aws_ec2 describe-instances \
    --instance-ids "$instance_id" \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text
}

run_status() {
  local cluster_id
  local instance_id

  print_stack_summary

  print_section "Aurora Clusters"
  if [[ ${#DB_CLUSTERS[@]} -eq 0 ]]; then
    echo "(none)"
  else
    for cluster_id in "${DB_CLUSTERS[@]}"; do
      echo "$cluster_id: $(describe_cluster_status "$cluster_id")"
    done
  fi

  print_section "EC2 Instances"
  if [[ ${#EC2_INSTANCES[@]} -eq 0 ]]; then
    echo "(none)"
  else
    for instance_id in "${EC2_INSTANCES[@]}"; do
      echo "$instance_id: $(describe_instance_state "$instance_id")"
    done
  fi
}

run_rds_action() {
  local action_name="$1"
  local cluster_id

  if [[ ${#DB_CLUSTERS[@]} -eq 0 ]]; then
    return
  fi

  print_section "Aurora Clusters"
  for cluster_id in "${DB_CLUSTERS[@]}"; do
    echo "$action_name cluster: $cluster_id"
    if [[ "$ACTION" == "start" ]]; then
      aws_rds start-db-cluster --db-cluster-identifier "$cluster_id" >/dev/null
    else
      aws_rds stop-db-cluster --db-cluster-identifier "$cluster_id" >/dev/null
    fi
  done
}

run_ec2_action() {
  local action_name="$1"

  if [[ ${#EC2_INSTANCES[@]} -eq 0 ]]; then
    return
  fi

  print_section "EC2 Instances"
  echo "$action_name instances: ${EC2_INSTANCES[*]}"
  if [[ "$ACTION" == "start" ]]; then
    aws_ec2 start-instances --instance-ids "${EC2_INSTANCES[@]}" >/dev/null
  else
    aws_ec2 stop-instances --instance-ids "${EC2_INSTANCES[@]}" >/dev/null
  fi
}

readarray_safe "StackResourceSummaries[?ResourceType=='AWS::RDS::DBCluster'].PhysicalResourceId"
DB_CLUSTERS=("${RESULT[@]}")
readarray_safe "StackResourceSummaries[?ResourceType=='AWS::EC2::Instance'].PhysicalResourceId"
EC2_INSTANCES=("${RESULT[@]}")

if [[ "$ACTION" == "status" ]]; then
  run_status
  exit 0
fi

print_stack_summary
run_rds_action "$ACTION"
run_ec2_action "$ACTION"

print_section "Next Check"
"$0" status "$STACK_NAME" "$REGION"
