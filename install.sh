#!/usr/bin/env bash
# EasyBlue Logistics — Installables Requirement Script
# Installs Node toolchain dependencies and prepares the local environment.
set -euo pipefail

echo "==> EasyBlue Logistics :: Environment bootstrap"

# ---- 1. Verify Node.js (>= 20) ----------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed. Install Node.js >= 20 from https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "ERROR: Node.js >= 20 required (found $(node -v))."
  exit 1
fi
echo "  - Node.js $(node -v) OK"

# ---- 2. Package manager (prefer bun, fallback npm) --------------------------
if command -v bun >/dev/null 2>&1; then
  PM="bun"
elif command -v npm >/dev/null 2>&1; then
  PM="npm"
else
  echo "ERROR: Neither bun nor npm found."
  exit 1
fi
echo "  - Package manager: ${PM}"

# ---- 3. Install JS dependencies --------------------------------------------
echo "==> Installing JavaScript dependencies"
if [ "${PM}" = "bun" ]; then
  bun install
else
  npm install
fi

# ---- 4. Verify PostgreSQL client -------------------------------------------
if command -v psql >/dev/null 2>&1; then
  echo "  - psql $(psql --version | awk '{print $3}') OK"
else
  echo "  - WARNING: psql not found. Install PostgreSQL client to run db/*.sql scripts."
  echo "      macOS:  brew install postgresql"
  echo "      Ubuntu: sudo apt-get install -y postgresql-client"
fi

# ---- 5. .env scaffold -------------------------------------------------------
if [ ! -f .env ]; then
  cat > .env <<'EOF'
# EasyBlue Logistics — local environment
DATABASE_URL=postgres://easyblue:easyblue@localhost:5432/easyblue_logistics
PGHOST=localhost
PGPORT=5432
PGUSER=easyblue
PGPASSWORD=easyblue
PGDATABASE=easyblue_logistics
EOF
  echo "  - Created .env with default Postgres connection settings"
else
  echo "  - .env already present (left untouched)"
fi

echo "==> Done. Next steps:"
echo "    1) Provision the database:    ./db/setup.sh"
echo "    2) Start the dev server:      ${PM} run dev"
echo ""
echo "    Schema now includes users.display_name and users.profile_photo_url"
echo "    used by the in-app profile bubble and per-role /history page."
