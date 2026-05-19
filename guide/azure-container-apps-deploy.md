# Azure Container Apps — deploy API, web, and PostgreSQL

Deploy three workloads in one **Container Apps environment**:

| Container App | Image | Ingress | Port |
|---------------|-------|---------|------|
| `postgres` | `postgres:16-alpine` | Internal only | 5432 |
| `api` | `multi-store-api` from ACR | External HTTPS | 8080 |
| `web` | `multi-store-web` from ACR | External HTTPS | 80 |

## Prerequisites

- Images in ACR — [azure-container-registry.md](./azure-container-registry.md)
- File Share for Postgres — [azure-storage-blob-and-file-share.md](./azure-storage-blob-and-file-share.md)
- Log Analytics workspace — [azure-monitor-log-analytics.md](./azure-monitor-log-analytics.md) (create first or with environment)
- Stripe, JWT, and optional Azure Blob / ACS values from [`backend/.env.example`](../backend/.env.example)

## Recommended order

1. Log Analytics workspace  
2. Container Apps **environment** (+ Azure Files storage binding)  
3. Container App **postgres** (volume mount)  
4. Container App **api** (secrets, health probe)  
5. Container App **web**  
6. Apply database schema  
7. Configure Stripe webhook — [stripe-webhook-production-setup.md](./stripe-webhook-production-setup.md)  

---

## 1. Variables (shell)

```bash
RG=rg-multistore
LOCATION=australiaeast
ACR=multistoreacr
ENV=cae-multistore
LOG=law-multistore
```

Adjust names to match your subscription.

---

## 2. Log Analytics workspace

```bash
az monitor log-analytics workspace create \
  --resource-group $RG \
  --workspace-name $LOG

LOG_ID=$(az monitor log-analytics workspace show -g $RG -n $LOG --query customerId -o tsv)
LOG_KEY=$(az monitor log-analytics workspace get-shared-keys -g $RG -n $LOG --query primarySharedKey -o tsv)
```

---

## 3. Container Apps environment

```bash
az containerapp env create \
  --name $ENV \
  --resource-group $RG \
  --location $LOCATION \
  --logs-workspace-id $LOG_ID \
  --logs-workspace-key $LOG_KEY
```

Add Azure Files storage (see [azure-storage-blob-and-file-share.md](./azure-storage-blob-and-file-share.md)) before creating the postgres app.

---

## 4. Postgres container app

Portal: **Create** → Container App → name `postgres`, environment `$ENV`, image `postgres:16-alpine`.

- **Ingress**: disabled (internal only)  
- **CPU / Memory**: 0.5 CPU, 1 Gi (adjust as needed)  
- **Volume**: mount environment storage `postgres-volume` → `/var/lib/postgresql/data`  
- **Secrets**: `POSTGRES_PASSWORD`  
- **Env**: `POSTGRES_USER=app`, `POSTGRES_DB=multistore`, `POSTGRES_PASSWORD=secretref:postgres-password`  

Note the **internal** hostname (e.g. `postgres.internal.<env-domain>`) for the API connection string.

---

## 5. API container app

Image: `multistoreacr.azurecr.io/multi-store-api:latest` (ACR credentials or managed identity).

**Ingress:** external, target port **8080**, HTTPS only.

**Health probe:**

| Type | Path | Port |
|------|------|------|
| Readiness / Liveness | `/api/health` | 8080 |

**Environment variables** (use secrets for sensitive values):

```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
ConnectionStrings__Default=Host=postgres;Port=5432;Database=multistore;Username=app;Password=...
CORS_ALLOWED_ORIGINS=https://YOUR-WEB-FQDN
PUBLIC_APP_BASE_URL=https://YOUR-WEB-FQDN
AUTH_COOKIE_SECURE=true
MAINTENANCE_MODE=false
JWT_SECRET=...
JWT_ISSUER=multi-store
JWT_AUDIENCE=multi-store
JWT_ACCESS_TOKEN_MINUTES=15
JWT_REFRESH_TOKEN_DAYS=7
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
AZURE_STORAGE_ENABLED=true
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=product-photos
AZURE_STORAGE_PUBLIC_BASE_URL=...
ACS_EMAIL_ENABLED=true
ACS_EMAIL_CONNECTION_STRING=...
ACS_EMAIL_SENDER_ADDRESS=...
CONTACT_FORM_TO_EMAIL=...
```

Email setup: [azure-communication-services-email-setup.md](./azure-communication-services-email-setup.md)

Record API FQDN: `https://api-xxxxx.australiaeast.azurecontainerapps.io`

---

## 6. Web container app

Image: `multistoreacr.azurecr.io/multi-store-web:latest`

**Ingress:** external, target port **80**.

**Option A — same-origin API (nginx proxy in image)**  
Rebuild web with empty `VITE_API_BASE_URL`; add ACA ingress rules or use a single custom domain with path routing later.

**Option B — direct API URL (simpler for two FQDNs)**  
Build with:

```bash
--build-arg VITE_API_BASE_URL=https://YOUR-API-FQDN
```

Ensure `CORS_ALLOWED_ORIGINS` on API matches the **web** FQDN exactly.

Record web FQDN: `https://web-xxxxx.australiaeast.azurecontainerapps.io`

---

## 7. Apply database schema

Connect with `psql` or Azure Data Studio to Postgres (jump box, VPN, or temporary external ingress on postgres **only for setup** — disable after).

Run [`database/Database-Schema-Generated.sql`](../database/Database-Schema-Generated.sql).

---

## 8. Post-deploy smoke test

1. `curl https://YOUR-API-FQDN/api/health` → `status: ok`  
2. Open web FQDN — storefront loads  
3. Sign in, browse, cart  
4. Stripe test checkout (webhook guide)  
5. Set `MAINTENANCE_MODE=true` on API → maintenance page on refresh  

---

## 9. Custom domain (optional)

Portal → each Container App → **Custom domains** → bind certificate (managed cert available).

Update `CORS_ALLOWED_ORIGINS`, `PUBLIC_APP_BASE_URL`, and rebuild `multi-store-web` if `VITE_API_BASE_URL` changed.

---

## CLI create example (API only)

```bash
az containerapp create \
  --name api \
  --resource-group $RG \
  --environment $ENV \
  --image multistoreacr.azurecr.io/multi-store-api:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server multistoreacr.azurecr.io \
  --registry-username ... \
  --registry-password ... \
  --env-vars ASPNETCORE_URLS=http://+:8080 \
  --secrets jwt-secret=... \
  --system-env-vars ...
```

Use Portal for postgres volume mounts if CLI flags are cumbersome.

---

## Related guides

- [azure-automation-start-stop.md](./azure-automation-start-stop.md) — scale to zero on a schedule  
- [azure-monitor-log-analytics.md](./azure-monitor-log-analytics.md) — logs and alerts  
- [stripe-webhook-production-setup.md](./stripe-webhook-production-setup.md)  
