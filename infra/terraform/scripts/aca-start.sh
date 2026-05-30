#!/usr/bin/env bash
# Scale staging Container Apps up (postgres -> api -> web). Use when outside Automation hours or after deploy.
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-multi-store-ecommerce-rg}"
MIN="${ACA_MIN_REPLICAS:-1}"
WARMUP="${POSTGRES_WARMUP_SECONDS:-45}"

APPS=(postgres api web)

for app in "${APPS[@]}"; do
  echo "Setting ${app} min-replicas=${MIN}..."
  az containerapp update -g "$RG" -n "$app" --min-replicas "$MIN" -o none
  if [[ "$app" == "postgres" ]]; then
    echo "Waiting ${WARMUP}s for Postgres..."
    sleep "$WARMUP"
  fi
done

echo "Done. API: check with: curl -fsS \"\${API_URL:-https://api...}/api/health\""
