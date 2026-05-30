#!/usr/bin/env bash
# Scale staging Container Apps to zero (web -> api -> postgres).
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-multi-store-ecommerce-rg}"
APPS=(web api postgres)

for app in "${APPS[@]}"; do
  echo "Setting ${app} min-replicas=0..."
  az containerapp update -g "$RG" -n "$app" --min-replicas 0 -o none
done

echo "All apps scaled to zero."
