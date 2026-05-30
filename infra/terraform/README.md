# Terraform — Azure infrastructure

Infrastructure as Code for **shared ACR**, **staging**, and **production** Container Apps environments.

## Layout

```text
infra/terraform/
├── modules/           # Reusable Azure modules
└── environments/
    ├── shared/        # ACR (apply once)
    ├── staging/       # Staging ACA stack
    └── production/    # Production ACA stack
```

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.5
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az login`)
- Contributor access on your Azure subscription
- GitHub OIDC app registration (for CI/CD) — see [guide/github-actions-setup.md](../../guide/github-actions-setup.md)

## 1. Bootstrap remote state (one time)

Create a storage account for Terraform state (can be manual or a small bootstrap script):

```bash
RG=rg-multistore-shared
LOC=australiaeast
SA=tfstatemultistore   # globally unique, change if taken

az group create -n $RG -l $LOC
az storage account create -g $RG -n $SA -l $LOC --sku Standard_LRS
az storage container create --account-name $SA -n tfstate
```

Copy backend config per environment:

```bash
cp backend.hcl.example backend.hcl   # in shared/, staging/, production/
# Edit storage_account_name if needed
```

## 2. Apply order (greenfield)

```bash
# 1) Shared ACR
cd environments/shared
cp terraform.tfvars.example terraform.tfvars   # set acr_name
terraform init -backend-config=backend.hcl
terraform plan
terraform apply

# 2) Staging
cd ../staging
cp terraform.tfvars.example terraform.tfvars     # fill secrets + names
terraform init -backend-config=backend.hcl
terraform apply

# 3) Production
cd ../production
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
terraform apply
```

**Before first apply:** push placeholder images to ACR so Container Apps can start:

```bash
ACR=<your-acr-name>
az acr login -n $ACR
docker build -t $ACR.azurecr.io/multi-store-api:staging ./backend
docker build -t $ACR.azurecr.io/multi-store-web:staging \
  --build-arg VITE_API_BASE_URL=https://placeholder \
  ./frontend
docker push $ACR.azurecr.io/multi-store-api:staging
docker push $ACR.azurecr.io/multi-store-web:staging
```

Repeat with `:production` tag for production.

## 3. Database schema

After Postgres is running, apply schema once per environment:

```bash
# Connect via temporary external access or jump box, then:
psql ... -f database/Database-Schema-Generated.sql
```

See [guide/terraform-azure.md](../../guide/terraform-azure.md).

## 4. Update URLs after first deploy

Terraform outputs `api_url` and `web_url`. Update in `terraform.tfvars`:

- `cors_allowed_origins`
- `public_app_base_url`

Then `terraform apply` again. Update GitHub Environment variables for CD workflows.

## 5. GitHub Actions

- **Terraform apply:** Actions → *Terraform Apply* → choose environment (manual)
- **App deploy:** push to `develop` (staging) or `main` (production)

## Secrets

Never commit `terraform.tfvars` or `backend.hcl` with secrets. Only `*.example` files are tracked.

## Modules

| Module | Purpose |
|--------|---------|
| `resource_group` | Azure resource group |
| `acr` | Container registry |
| `log_analytics` | Log Analytics workspace |
| `storage` | Azure Files for Postgres + optional blob |
| `container_apps_environment` | ACA environment + file share mount |
| `postgres_app` | Postgres 16 container app |
| `api_app` | .NET API with health probes + ACR pull |
| `web_app` | nginx + React static site |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| ACR name taken | Change `acr_name` in shared `terraform.tfvars` |
| Storage account name taken | Change `storage_account_name` per environment |
| Container App fails to start | Ensure image tag exists in ACR before apply |
| API unhealthy | Check Postgres password in connection string secret |

## Related guides

- [guide/devops-overview.md](../../guide/devops-overview.md)
- [guide/terraform-azure.md](../../guide/terraform-azure.md)
- [guide/github-actions-setup.md](../../guide/github-actions-setup.md)
