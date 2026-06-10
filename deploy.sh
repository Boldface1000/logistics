#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# EasyBlue Logistics — one-shot install / build / deploy script.
#
# Local dev:           bun run scripts/deploy.sh
# Lovable Cloud ships frontend on "Publish" in the editor; backend (DB,
# edge functions, storage) ships automatically on every change.
# ---------------------------------------------------------------------------
set -euo pipefail

echo "▶ 1/4  Installing dependencies"
bun install

echo "▶ 2/4  Type-checking"
bunx tsc --noEmit

echo "▶ 3/4  Building production bundle"
bun run build

echo "▶ 4/4  Verifying secrets"
required_runtime=( SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY )
optional_runtime=( GMAIL_USER GMAIL_APP_PASSWORD FCM_PROJECT_ID FCM_CLIENT_EMAIL FCM_PRIVATE_KEY )

missing=()
for v in "${required_runtime[@]}"; do
  if [ -z "${!v:-}" ]; then missing+=("$v"); fi
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "✗ Missing required secrets: ${missing[*]}"
  echo "  Add via Lovable Cloud → Connectors → Secrets"
  exit 1
fi

for v in "${optional_runtime[@]}"; do
  if [ -z "${!v:-}" ]; then
    echo "  ℹ optional secret unset: $v (feature will fall back to console.log)"
  fi
done

echo
echo "✓ Build OK. To ship the frontend, click Publish in the Lovable editor."
echo "  Backend changes (DB, storage, edge functions) deploy automatically."
