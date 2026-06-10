#!/usr/bin/env bash
# Drop and recreate the EasyBlue Logistics database. DESTRUCTIVE.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "${SCRIPT_DIR}/../.env" ]; then
  set -a; . "${SCRIPT_DIR}/../.env"; set +a
fi

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-easyblue_logistics}"
SUPERUSER="${PG_SUPERUSER:-postgres}"

read -r -p "This will DROP database '${PGDATABASE}'. Continue? [y/N] " ans
[[ "${ans:-N}" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }

dropdb -h "${PGHOST}" -p "${PGPORT}" -U "${SUPERUSER}" --if-exists "${PGDATABASE}"
"${SCRIPT_DIR}/setup.sh"
