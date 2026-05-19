# Azure Storage — Blob (photos) and File Share (PostgreSQL data)

One storage account can host **both**:

1. **Blob container** — product images (public read)  
2. **Azure Files share** — persistent volume for the PostgreSQL container on Azure Container Apps  

## Prerequisites

- Azure resource group
- [azure-container-apps-deploy.md](./azure-container-apps-deploy.md) planned or in progress

---

## Part A — Blob storage (product photos)

Detailed steps (container, public access, env vars) are in:

**[azure-product-photos-setup.md](./azure-product-photos-setup.md)**

Summary for ACA **API** container settings:

```env
AZURE_STORAGE_ENABLED=true
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=product-photos
AZURE_STORAGE_PUBLIC_BASE_URL=https://YOUR_ACCOUNT.blob.core.windows.net/product-photos
```

Frontend build (optional):

```env
VITE_PRODUCT_MEDIA_BASE_URL=https://YOUR_ACCOUNT.blob.core.windows.net/product-photos
```

---

## Part B — File Share for PostgreSQL data

### 1. Create storage account (or reuse photo account)

Portal → **Storage accounts** → **Create**

- Redundancy: LRS is fine for dev/staging  
- Note **Storage account name**  

### 2. Create a file share

Storage account → **File shares** → **+ File share**

| Setting | Example |
|---------|---------|
| Name | `postgres-data` |
| Tier | Transaction optimized (or Hot) |
| Quota | 32 GiB+ (grow as needed) |

### 3. Get credentials

**Access keys** → copy **Connection string** (for ACA environment storage).

### 4. Link storage to Container Apps **environment**

Portal → **Container Apps** → your **Environment** → **Azure Files** (or **Storage** / **Volumes** depending on UI):

1. **Add** storage  
2. Name: `postgres-volume` (logical name in ACA)  
3. Storage type: Azure Files  
4. Account + share: `postgres-data`  
5. Access mode: **Read/Write**  

CLI example:

```bash
az containerapp env storage set \
  --name cae-multistore \
  --resource-group rg-multistore \
  --storage-name postgres-volume \
  --azure-file-account-name YOUR_STORAGE_ACCOUNT \
  --azure-file-account-key YOUR_KEY \
  --azure-file-share-name postgres-data \
  --access-mode ReadWrite
```

### 5. Mount on the Postgres container app

When creating/updating the **postgres** Container App:

| Setting | Value |
|---------|--------|
| Volume name | `pgdata` |
| Storage | `postgres-volume` (from environment) |
| Mount path | `/var/lib/postgresql/data` |

**Important:** Mount only on the **postgres** container, not the API. The official `postgres:16-alpine` image expects an empty data directory on first run.

### 6. Postgres container environment

```env
POSTGRES_USER=app
POSTGRES_PASSWORD=<strong-secret>
POSTGRES_DB=multistore
```

API connection string (separate **api** app):

```env
ConnectionStrings__Default=Host=<postgres-internal-hostname>;Port=5432;Database=multistore;Username=app;Password=<same-password>
```

Use the **internal FQDN** of the postgres Container App (ACA internal ingress or service discovery — see deploy guide).

### 7. Initialize schema (once)

After Postgres is running with an empty volume:

```bash
# From a machine with psql or use Azure Cloud Shell
psql "host=... port=5432 dbname=multistore user=app password=..." \
  -f database/Database-Schema-Generated.sql
```

Or run a one-off `kubectl`/ACA exec job — apply [`Database-Schema-Generated.sql`](../database/Database-Schema-Generated.sql) once.

---

## Backup and limitations

| Topic | Guidance |
|-------|----------|
| Backup | Periodic `pg_dump` to Blob, or [File share snapshots](https://learn.microsoft.com/azure/storage/files/storage-files-prevent-file-share-deletion#share-snapshots) |
| HA | Single Postgres container + File Share is **not** high availability — acceptable for cost-optimized dev/staging with [Automation start/stop](./azure-automation-start-stop.md) |
| Performance | Azure Files works for small/medium workloads; use **Azure Database for PostgreSQL** for production HA if needed later |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Postgres won’t start | Ensure mount is empty on first boot; check permissions on `/var/lib/postgresql/data` |
| API cannot connect | Use internal hostname, same password, security rules between apps in same environment |
| Slow DB | Consider larger share quota / premium file account |

## Next step

[azure-container-apps-deploy.md](./azure-container-apps-deploy.md)
