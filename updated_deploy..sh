#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# EasyBlue Logistics — Unified Deployment & Database Provisioning
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "▶ 1/5  Installing dependencies"
bun install

echo "▶ 2/5  Type-checking"
bunx tsc --noEmit

echo "▶ 3/5  Building production bundle"
bun run build

echo "▶ 4/5  Verifying environment & secrets"
required_runtime=( SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY )
missing=()
for v in "${required_runtime[@]}"; do
  if [ -z "${!v:-}" ]; then missing+=("$v"); fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "✗ Missing required secrets: ${missing[*]}"
  echo "  Please set these in your environment or Lovable Cloud Secrets."
  exit 1
fi

echo "▶ 5/5  Database Provisioning (Optional/Manual Step)"
echo "  To provision your database, please follow the order in SUPABASE_INSTRUCTIONS.md"
echo "  Or run the following command if you have a local postgres instance:"
echo "  bash ./db/setup.sh"

echo
echo "✓ Build OK. Deployment ready."
echo "  - Frontend: Publish via Lovable editor."
echo "  - Backend: Deploys automatically on push."
echo "  - Database: Run SQL scripts in the specified order."
