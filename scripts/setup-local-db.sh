#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_CONTAINER_SERVICE="${1:-postgres}"
DB_NAME="${2:-sample}"
DB_USER="${3:-root}"
WEBAPP_DIR="$ROOT_DIR/webapp"
PRISMA_SCHEMA_PATH="$WEBAPP_DIR/prisma/schema.prisma"

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

if [[ ! -f "$PRISMA_SCHEMA_PATH" ]]; then
  echo "skip schema sync: prisma schema not found at $PRISMA_SCHEMA_PATH"
  exit 0
fi

if [[ ! -d "$WEBAPP_DIR/node_modules" ]]; then
  echo "skip schema sync: $WEBAPP_DIR/node_modules is missing. Run 'cd webapp && npm ci' first."
  exit 0
fi

if (
  cd "$WEBAPP_DIR"
  npx prisma db push --skip-generate >/dev/null
); then
  echo "schema synced with prisma db push"
  exit 0
fi

echo "prisma db push failed; resetting local public schema and applying generated SQL"

TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

(
  cd "$WEBAPP_DIR"
  npx prisma migrate diff \
    --from-empty \
    --to-schema-datamodel prisma/schema.prisma \
    --script >"$TMP_SQL"
)

docker compose -f "$ROOT_DIR/compose.yaml" exec -T "$DB_CONTAINER_SERVICE" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO "$DB_USER";
GRANT ALL ON SCHEMA public TO public;
SQL

docker compose -f "$ROOT_DIR/compose.yaml" exec -T "$DB_CONTAINER_SERVICE" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f - <"$TMP_SQL"

echo "schema synced via generated SQL fallback"
