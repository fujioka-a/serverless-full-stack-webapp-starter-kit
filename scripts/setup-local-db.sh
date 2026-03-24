#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_CONTAINER_SERVICE="${1:-postgres}"
DB_NAME="${2:-sample}"
DB_USER="${3:-root}"

usage() {
  cat <<'EOF'
Usage:
  scripts/setup-local-db.sh [service-name] [db-name] [db-user]

Examples:
  scripts/setup-local-db.sh
  scripts/setup-local-db.sh postgres sample root
EOF
}

if [[ $# -gt 3 ]]; then
  usage
  exit 1
fi

docker compose -f "$ROOT_DIR/compose.yaml" up -d "$DB_CONTAINER_SERVICE"

DB_EXISTS="$(
  docker compose -f "$ROOT_DIR/compose.yaml" exec -T "$DB_CONTAINER_SERVICE" \
    psql -U "$DB_USER" -d postgres -At \
    -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'"
)"

if [[ "$DB_EXISTS" != "1" ]]; then
  docker compose -f "$ROOT_DIR/compose.yaml" exec -T "$DB_CONTAINER_SERVICE" \
    psql -U "$DB_USER" -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE $DB_NAME"
fi

echo "database ensured: $DB_NAME"
