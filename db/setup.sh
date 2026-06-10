#!/usr/bin/env bash
# EasyBlue Logistics — PostgreSQL provisioning script
# Creates the database, role, schema, tables, and seed data.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if present
if [ -f "${SCRIPT_DIR}/../.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "${SCRIPT_DIR}/../.env"
  set +a
fi

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-easyblue}"
PGPASSWORD="${PGPASSWORD:-easyblue}"
PGDATABASE="${PGDATABASE:-easyblue_logistics}"
SUPERUSER="${PG_SUPERUSER:-postgres}"

export PGPASSWORD

echo "==> Creating role + database (requires superuser '${SUPERUSER}')"
psql -h "${PGHOST}" -p "${PGPORT}" -U "${SUPERUSER}" -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${PGUSER}') THEN
    CREATE ROLE ${PGUSER} LOGIN PASSWORD '${PGPASSWORD}';
  END IF;
END
\$\$;
SQL

if ! psql -h "${PGHOST}" -p "${PGPORT}" -U "${SUPERUSER}" -lqt | cut -d \| -f 1 | grep -qw "${PGDATABASE}"; then
  createdb -h "${PGHOST}" -p "${PGPORT}" -U "${SUPERUSER}" -O "${PGUSER}" "${PGDATABASE}"
fi

run() {
  echo "==> Applying $1"
  psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -v ON_ERROR_STOP=1 -f "${SCRIPT_DIR}/$1"
}

run schema.sql
run seed.sql

echo "==> Database '${PGDATABASE}' ready."
