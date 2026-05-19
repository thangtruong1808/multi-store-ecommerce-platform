# Azure Automation — start/stop Container Apps on a schedule

Scale Container Apps to **zero replicas** outside business hours to reduce cost (similar to AWS EventBridge + Lambda). Suitable for dev/staging when downtime is acceptable.

*(Tiết kiệm chi phí: tự động bật/tắt theo giờ.)*

## Prerequisites

- Deployed apps — [azure-container-apps-deploy.md](./azure-container-apps-deploy.md)
- Azure CLI or Automation Account in Portal
- Contributor access on the resource group

## What gets stopped

| Container App | Typical schedule |
|---------------|------------------|
| `web` | Stop first at night |
| `api` | Stop after web |
| `postgres` | Stop last (data on Azure Files is preserved) |

**Start order (morning):** `postgres` → `api` → `web` (allow 2–5 minutes between steps for Postgres readiness).

## Limitations

- **Cold start** — first request after start may be slow (30s–2min).  
- **Stripe webhooks** fail while `api` is scaled to 0 — queue events in Stripe or accept missed webhooks for dev.  
- **Users** see maintenance or errors if they visit during off hours.  
- Not a substitute for production HA.

---

## Option A — Azure Automation runbook (recommended)

### 1. Create Automation Account

Portal → **Automation Accounts** → **Create** (same region as Container Apps).

### 2. Import Az modules

Automation Account → **Modules** → **Browse gallery** → import `Az.Accounts`, `Az.ContainerApp` (or use PowerShell 7.2 runtime with preinstalled Az).

### 3. Stop runbook (PowerShell)

Create runbook `Stop-MultiStoreApps`:

```powershell
param(
  [string]$ResourceGroup = "rg-multistore"
)

Connect-AzAccount -Identity
# If using system-assigned managed identity on Automation Account:
# Automation Account → Identity → On → assign Contributor on RG

$apps = @("web", "api", "postgres")
foreach ($name in $apps) {
  Write-Output "Scaling $name to 0..."
  az containerapp update `
    --name $name `
    --resource-group $ResourceGroup `
    --min-replicas 0 `
    --max-replicas 0
}
```

For runbooks without `az` CLI, use REST or `Update-AzContainerApp` when available in your Az module version:

```powershell
# Example pattern — verify cmdlet names for your Az.ContainerApp module version
Update-AzContainerApp -Name "api" -ResourceGroupName $ResourceGroup `
  -Configuration @{ Template = @{ Scale = @{ MinReplicas = 0; MaxReplicas = 0 } } }
```

### 4. Start runbook

`Start-MultiStoreApps` — reverse order:

```powershell
$apps = @("postgres", "api", "web")
foreach ($name in $apps) {
  az containerapp update --name $name --resource-group $ResourceGroup --min-replicas 1 --max-replicas 2
  if ($name -eq "postgres") { Start-Sleep -Seconds 120 }
}
```

### 5. Schedules

Automation Account → **Schedules**:

| Schedule | Runbook | Cron (example) |
|----------|---------|----------------|
| Weeknight stop | `Stop-MultiStoreApps` | `0 18 * * 1-5` (6 PM Mon–Fri) |
| Morning start | `Start-MultiStoreApps` | `0 8 * * 1-5` (8 AM Mon–Fri) |

Link each schedule to a **Runbook job** with the managed identity that has **Contributor** on `rg-multistore`.

### 6. Enable managed identity

Automation Account → **Identity** → System assigned **On** → **Azure role assignments** → Contributor on resource group.

---

## Option B — Logic Apps (brief)

Create a **Recurrence** trigger → **Azure CLI** action or HTTP call to ARM to patch `properties.template.scale`. Good if you already use Logic Apps; otherwise Automation is simpler for PowerShell.

---

## Manual scale (testing)

```bash
az containerapp update -g rg-multistore -n api --min-replicas 0 --max-replicas 0
az containerapp update -g rg-multistore -n api --min-replicas 1 --max-replicas 3
```

---

## Maintenance mode vs scale-to-zero

| Approach | Use when |
|----------|----------|
| `MAINTENANCE_MODE=true` on API | App is running but you want a friendly message (deploy, migration) |
| Scale to 0 | Save money overnight; full downtime |

You can combine: enable maintenance before deploy, then scale to zero on weekends.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Runbook auth fails | Enable managed identity + Contributor on RG |
| Postgres data missing | File Share mount must persist; do not delete environment storage |
| API starts before DB | Increase sleep after starting `postgres` |

## Related

- [azure-monitor-log-analytics.md](./azure-monitor-log-analytics.md) — alert if apps fail to start  
- [stripe-webhook-production-setup.md](./stripe-webhook-production-setup.md) — webhook impact during downtime  
