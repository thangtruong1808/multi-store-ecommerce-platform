# Terraform — Azure infrastructure

Infrastructure as Code for **staging** and optional **production** Container Apps. The default **showcase / cost-optimized** profile uses **GHCR** (no ACR), **scale-to-zero**, and **weekday 10:00–17:00** schedules.

## Layout

```text
infra/terraform/
├── modules/
│   ├── aca_schedule/     # Azure Automation start/stop (Free tier)
│   ├── api_app/          # .NET API (optional ACR or public GHCR image)
│   ├── web_app/
│   ├── postgres_app/
│   └── ...
├── scripts/
│   ├── aca-start.sh      # Manual scale up
│   └── aca-stop.sh       # Manual scale to zero
└── environments/
    ├── shared/           # Optional ACR only (skip when create_acr = false)
    ├── staging/
    └── production/
```

## Showcase cost profile (~≤ AU$15/month)

| Choice | Savings |
|--------|---------|
| **GHCR** instead of ACR | ~AU$7–8/mo |
| **min_replicas = 0** idle | No ACA compute outside hours |
| **Automation** Mon–Fri 10:00–17:00 AUS Central | Matches portfolio demo hours |
| **Smaller CPU/RAM**, **10 GB** file share | Lower storage / compute |
| **Skip `shared/` apply** when `create_acr = false` | One less stack to manage |

**Still billed (low):** Terraform state storage, Log Analytics (light ingest), Postgres file share GB, existing blob/ACS.

**Outside 10:00–17:00:** URLs return errors until the next start window or you run `scripts/aca-start.sh`. Deploy workflow scales apps up after each `develop` push.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.5
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az login`)
- Contributor on subscription / resource group
- GitHub OIDC app — [`.github/azure-github-config.example.md`](../../.github/azure-github-config.example.md)
- **GHCR:** push images from `deploy-staging.yml`; set packages **Public** for anonymous ACA pull (or add registry secrets later)

## Azure layout

| Setting | Value |
|---------|--------|
| Resource group | `multi-store-ecommerce-rg` (existing) |
| Region | `australiacentral` |

## 1. Bootstrap remote state (one time)

```bash
RG=multi-store-ecommerce-rg
LOC=australiacentral
SA=tfstatemultistore

az storage account create -g $RG -n $SA -l $LOC --sku Standard_LRS
az storage container create --account-name $SA -n tfstate
```

Copy backend config (includes separate state **key** per environment):

```bash
cp backend.hcl.example backend.hcl   # in staging/ (and shared/ if used)
```

## 2. Apply order (GHCR showcase)

```bash
# Optional — skip entirely when create_acr = false
# cd environments/shared && terraform init -backend-config=backend.hcl && terraform apply

cd environments/staging
cp terraform.tfvars.example terraform.tfvars   # fill secrets + storage_account_name
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

**Before first apply:** push images to GHCR (merge to `develop` or build locally and push):

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
docker build -t ghcr.io/thangtruong1808/multi-store-api:staging ./backend
docker push ghcr.io/thangtruong1808/multi-store-api:staging
# same for multi-store-web with Vite build-args
```

## 3. Manual start / stop

```bash
export AZURE_RESOURCE_GROUP=multi-store-ecommerce-rg
bash infra/terraform/scripts/aca-start.sh
bash infra/terraform/scripts/aca-stop.sh
```

## 4. Database schema

After Postgres is running (inside showcase hours or after `aca-start.sh`):

```bash
psql ... -f database/Database-Schema-Generated.sql
```

## 5. Update URLs after first deploy

From `terraform output web_url` / `api_url`, set in `terraform.tfvars`:

- `cors_allowed_origins`
- `public_app_base_url`

Then `terraform apply` again. Update GitHub Environment variables (`API_URL`, `VITE_*`).

## 6. GitHub Actions

- **Deploy staging:** push to `develop` → build/push **GHCR** → update Container Apps → scale up → health check with retries (cold start).
- **Terraform apply:** Actions → *Terraform Apply* (manual).

## Secrets

Never commit `terraform.tfvars` or `backend.hcl`. Only `*.example` files are tracked.

## Modules

| Module | Purpose |
|--------|---------|
| `aca_schedule` | Weekday Automation runbooks (scale min replicas 1 / 0) |
| `api_app` / `web_app` | ACA with optional ACR identity or public image |
| `postgres_app` | Postgres 16 on Azure Files |
| `storage` | File share for Postgres data |
| `container_apps_environment` | ACA environment + mount |

## Optional: enable ACR again

`shared/terraform.tfvars`: `create_acr = true`, `acr_name = "..."`  
`staging/terraform.tfvars`: `use_acr = true`, `acr_name = "..."`  
Update `deploy-staging.yml` or use a separate workflow to push to ACR.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Container App ImagePullBackOff | GHCR package must be **public**, or add registry credentials to the app |
| 503 / timeout outside hours | Run `aca-start.sh` or wait until 10:00 Mon–Fri |
| API unhealthy after deploy | Cold start ~1–3 min; deploy workflow waits and retries health |
| Automation runbook failed | Portal → Automation account → Job → logs; ensure Contributor on RG |

## Related

- [`.github/azure-github-config.example.md`](../../.github/azure-github-config.example.md)
- [`.github/workflows/deploy-staging.yml`](../../.github/workflows/deploy-staging.yml)
