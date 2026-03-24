#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STACK_NAME="${1:-ServerlessWebappStarterKitStack}"
REGION="${2:-${AWS_REGION:-${AWS_DEFAULT_REGION:-us-west-2}}}"
OUTPUT_FILE="$ROOT_DIR/webapp/.env.local"

usage() {
  cat <<'EOF'
Usage:
  scripts/setup-local-webapp-env.sh [stack-name] [region]

Examples:
  scripts/setup-local-webapp-env.sh
  scripts/setup-local-webapp-env.sh ServerlessWebappStarterKitStack us-west-2
EOF
}

if [[ $# -gt 2 ]]; then
  usage
  exit 1
fi

get_output() {
  local output_key="$1"
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue | [0]" \
    --output text
}

# pls replace the output keys with the actual ones from your CloudFormation stack
USER_POOL_ID="$(get_output AuthUserPoolId12345ABCDEF)"
USER_POOL_CLIENT_ID="$(get_output AuthUserPoolClientId12345ABCDEF)"
COGNITO_DOMAIN="$(get_output AuthUserPoolDomainName12345ABCDEF)"
EVENT_HTTP_ENDPOINT="$(get_output EventBusHttpEndpoint12345ABCDEF)"
ASYNC_JOB_HANDLER_ARN="$(get_output AsyncJobHandlerArn12345ABCDEF)"

if [[ "$USER_POOL_ID" == "None" || -z "$USER_POOL_ID" ]]; then
  echo "failed to resolve stack outputs from $STACK_NAME in $REGION" >&2
  exit 1
fi

cat >"$OUTPUT_FILE" <<EOF
DATABASE_HOST=127.0.0.1
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=sample
DATABASE_PORT=5433
DATABASE_ENGINE=postgres
DATABASE_OPTION=
DATABASE_URL=postgres://root:password@127.0.0.1:5433/sample

COGNITO_DOMAIN=$COGNITO_DOMAIN
AMPLIFY_APP_ORIGIN=http://localhost:3010
USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_EVENT_HTTP_ENDPOINT=$EVENT_HTTP_ENDPOINT
NEXT_PUBLIC_AWS_REGION=$REGION
EVENT_HTTP_ENDPOINT=$EVENT_HTTP_ENDPOINT
AWS_REGION=$REGION
ASYNC_JOB_HANDLER_ARN=$ASYNC_JOB_HANDLER_ARN
EOF

echo "wrote $OUTPUT_FILE"
echo "stack:  $STACK_NAME"
echo "region: $REGION"
