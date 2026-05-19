# Azure Monitor and Log Analytics

Centralize logs from Azure Container Apps, query failures, and set alerts for the Multi-Store platform.

## Prerequisites

- Container Apps **environment** created with a Log Analytics workspace (see [azure-container-apps-deploy.md](./azure-container-apps-deploy.md))
- At least one revision running for `api` and `web`

## 1. Confirm diagnostics

Portal → **Container Apps** → **Environment** → **Logs** (or **Monitoring**).

You should see tables such as:

- `ContainerAppConsoleLogs` — stdout/stderr from containers  
- `ContainerAppSystemLogs` — platform events  

If logs are empty, verify workspace ID/key were set when creating the environment.

## 2. Useful Log Analytics queries

**API errors (last hour):**

```kusto
ContainerAppConsoleLogs
| where TimeGenerated > ago(1h)
| where ContainerAppName_s == "api"
| where Log_s contains "Error" or Log_s contains "Exception"
| project TimeGenerated, Log_s
| order by TimeGenerated desc
```

**All console output for web:**

```kusto
ContainerAppConsoleLogs
| where ContainerAppName_s == "web"
| where TimeGenerated > ago(30m)
| project TimeGenerated, Log_s
| order by TimeGenerated desc
```

**Stripe webhook warnings:**

```kusto
ContainerAppConsoleLogs
| where ContainerAppName_s == "api"
| where Log_s contains "Stripe"
| order by TimeGenerated desc
```

## 3. Health endpoint monitoring

Create an **Availability test** or **Container Apps probe** (configured in deploy guide on `/api/health`).

**Scheduled query alert** — API unhealthy:

```kusto
ContainerAppConsoleLogs
| where ContainerAppName_s == "api"
| where Log_s contains "Application startup" or Log_s contains "Now listening"
```

Alternatively use **Azure Monitor** → **Metrics** → Container App → **Replicas** / **Requests**.

Portal alert rule example:

| Setting | Value |
|---------|--------|
| Signal | Custom log search or metric |
| Condition | Replica count = 0 for `api` during business hours |
| Action group | Email / Teams webhook |

## 4. Recommended alerts

| Alert | Why |
|-------|-----|
| `api` replica count 0 during business hours | Outage |
| HTTP 5xx rate on `api` ingress | Server errors |
| Liveness probe failures | `/api/health` failing (DB down, crash) |
| High restart count | Crash loop |

## 5. Diagnostic settings (optional)

Storage account → **Diagnostic settings** → send metrics/logs to the same workspace for Blob/File Share operations auditing.

## 6. Application Insights (optional)

For deeper .NET tracing:

1. Create **Application Insights** resource.  
2. Add connection string to API as `APPLICATIONINSIGHTS_CONNECTION_STRING` (requires code change — not enabled by default in this repo).  
3. Use for dependency tracking (Postgres, Stripe, Blob).  

For now, **ContainerAppConsoleLogs** + health probes are sufficient for operations.

## 7. Dashboard

Portal → **Monitor** → **Workbooks** or **Dashboards** → pin:

- Replica counts per app  
- Log query chart for errors  
- Availability test for `https://YOUR-API-FQDN/api/health`  

## 8. Retention and cost

Log Analytics billing is by ingestion (GB). For dev:

- Reduce retention (Workspace → **Usage and estimated costs** → **Data retention** → 30 days).  
- Use [Automation start/stop](./azure-automation-start-stop.md) to reduce running time.  

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No logs | Recreate environment with workspace; redeploy apps |
| Too much noise | Filter queries by `ContainerAppName_s` |
| Missing request logs | Ingress access logs may need diagnostic setting on environment |

## Related

- [azure-container-apps-deploy.md](./azure-container-apps-deploy.md) — health probe on `/api/health`  
- [docker-local-and-compose.md](./docker-local-and-compose.md) — local `docker compose logs api`  
