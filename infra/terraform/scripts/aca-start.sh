#!/usr/bin/env bash
# Scale Container Apps up (postgres -> api -> web). Use when outside Automation hours or after deploy.
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-multi-store-ecommerce-rg}"
MIN="${ACA_MIN_REPLICAS:-1}"
POSTGRES_MIN="${ACA_POSTGRES_MIN_REPLICAS:-1}"
WARMUP="${POSTGRES_WARMUP_SECONDS:-45}"

echo "Setting postgres min-replicas=${POSTGRES_MIN}..."
az containerapp update -g "$RG" -n postgres --min-replicas "$POSTGRES_MIN" -o none
echo "Waiting ${WARMUP}s for Postgres..."
sleep "$WARMUP"

for app in api web; do
  echo "Setting ${app} min-replicas=${MIN}..."
  az containerapp update -g "$RG" -n "$app" --min-replicas "$MIN" -o none
done

echo "Done. API: check with: curl -fsS \"\${API_URL:-https://api...}/api/health\""
