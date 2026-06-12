#!/usr/bin/env bash
# Scale api/web to zero. Postgres stays at min-replicas=1 (Azure Files + WAL safety).
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-multi-store-ecommerce-rg}"
APPS=(web api)

for app in "${APPS[@]}"; do
  echo "Setting ${app} min-replicas=0..."
  az containerapp update -g "$RG" -n "$app" --min-replicas 0 -o none
done

echo "api/web scaled to zero. Postgres left running (aca_postgres_min_replicas=1)."
