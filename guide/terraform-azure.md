# Terraform — Azure infrastructure

Provision **shared ACR**, **staging**, and **production** Container Apps stacks using [`infra/terraform/`](../infra/terraform/).

> **Primary path:** use Terraform. Manual Portal/CLI steps in [azure-container-apps-deploy.md](./azure-container-apps-deploy.md) are for troubleshooting only.

## Prerequisites

- Terraform >= 1.5, Azure CLI, `az login`
- Globally unique names ready: `acr_name`, `storage_account_name` (per env)
- [`infra/terraform/README.md`](../infra/terraform/README.md) bootstrap for remote state

## Apply order

```text
shared (ACR)  →  staging  →  production
```

Each environment has its own Terraform state key (`shared.terraform.tfstate`, etc.).

### 1. Shared — ACR

```bash
cd infra/terraform/environments/shared
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
# Edit terraform.tfvars — set acr_name (globally unique)

terraform init -backend-config=backend.hcl
terraform apply
```

Save outputs: `acr_name`, `acr_login_server`.

### 2. Push placeholder images

Container Apps need images in ACR before first successful revision:

```bash
ACR=<acr_name>
az acr login -n $ACR

# Staging tags
docker build -t $ACR.azurecr.io/multi-store-api:staging ./backend
docker push $ACR.azurecr.io/multi-store-api:staging
docker build -t $ACR.azurecr.io/multi-store-web:staging \
  --build-arg VITE_API_BASE_URL=https://placeholder \
  ./frontend
docker push $ACR.azurecr.io/multi-store-web:staging

# Production tags (repeat with :production)
```

### 3. Staging environment

```bash
cd infra/terraform/environments/staging
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
```

Fill `terraform.tfvars`:

- `acr_name`, `storage_account_name` (unique)
- `postgres_password`, `jwt_secret`
- Stripe **test** keys
- Azure Blob connection string (can reuse existing storage from [azure-product-photos-setup.md](./azure-product-photos-setup.md); set `create_blob_container = false`)
- Placeholder `cors_allowed_origins` / `public_app_base_url` (update after first apply)

```bash
terraform init -backend-config=backend.hcl
terraform apply
```

Note outputs:

```bash
terraform output api_url
terraform output web_url
```

Update `terraform.tfvars` with real `web_url` for CORS and `public_app_base_url`, then `terraform apply` again.

### 4. Production environment

Same as staging under `environments/production/` with:

- Different resource names (`rg-multistore-prod`, etc.)
- `image_tag = "production"`
- Production secrets (Stripe live, strong JWT)
- Separate `postgres_password`

### 5. Database schema

Connect to Postgres (temporary external ingress or Azure Cloud Shell + internal tooling) and run:

```sql
-- From database/Database-Schema-Generated.sql (on your machine)
```

Tables live in schema **`app`**, database **`MULTIPLY`**.

Repeat for **each** environment (staging and production are isolated).

## GitHub Actions integration

After Terraform creates resources, configure GitHub — [github-actions-setup.md](./github-actions-setup.md).

Infra changes: **Actions → Terraform Apply** (manual) or local `terraform apply`.

App deploys: automatic on branch push (no Terraform needed for routine code releases).

## Naming alignment

| Setting | Value |
|---------|-------|
| Postgres user | `postgres` |
| Postgres database | `MULTIPLY` |
| API health | `GET /api/health` |

Matches local [`docker-compose.yml`](../docker-compose.yml).

## Troubleshooting

| Issue | Action |
|-------|--------|
| Image pull errors | Verify ACR tags exist; check managed identity AcrPull role |
| API 503 health | Check Postgres password in connection string secret |
| CORS errors | `CORS_ALLOWED_ORIGINS` must exactly match `web_url` |
| Plan fails in CI | Add `backend.hcl` and secrets in GitHub for full remote plans |

## Related

- [devops-overview.md](./devops-overview.md)
- [azure-storage-blob-and-file-share.md](./azure-storage-blob-and-file-share.md)
- [azure-monitor-log-analytics.md](./azure-monitor-log-analytics.md)
