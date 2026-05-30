# GitHub Actions — CI/CD setup

Wire **Azure OIDC**, **GitHub Environments**, and deploy workflows for `develop` → staging and `main` → production.

## Workflows in this repo

| File | Purpose |
|------|---------|
| [`ci.yml`](../.github/workflows/ci.yml) | Build backend, lint/typecheck frontend, Docker build smoke test |
| [`deploy-staging.yml`](../.github/workflows/deploy-staging.yml) | Push to `develop` → deploy staging |
| [`deploy-production.yml`](../.github/workflows/deploy-production.yml) | Push to `main` → deploy production |
| [`terraform-plan.yml`](../.github/workflows/terraform-plan.yml) | Terraform fmt/validate/plan on PR |
| [`terraform-apply.yml`](../.github/workflows/terraform-apply.yml) | Manual infra apply |

## 1. Azure AD app registration (OIDC)

1. Azure Portal → **Microsoft Entra ID** → **App registrations** → **New registration**  
   - Name: `github-multistore-actions`  
2. **Certificates & secrets** → **Federated credentials** → Add:  
   - Entity: GitHub Actions  
   - Org/repo: `YOUR_ORG/YOUR_REPO`  
   - Branch: `develop` (repeat for `main` or use environment subject)  
   - Or use Environment subject: `repo:ORG/REPO:environment:staging`  
3. Note **Application (client) ID** and **Directory (tenant) ID**.

### Federated credential examples

**Branch-based (simpler):**

- Subject: `repo:YOUR_ORG/multi-store-ecommerce-platform:ref:refs/heads/develop`
- Subject: `repo:YOUR_ORG/multi-store-ecommerce-platform:ref:refs/heads/main`

**Environment-based (recommended for production):**

- `repo:YOUR_ORG/multi-store-ecommerce-platform:environment:staging`
- `repo:YOUR_ORG/multi-store-ecommerce-platform:environment:production`

### Role assignments

Assign the app's **service principal** (Enterprise applications → your app):

| Scope | Role |
|-------|------|
| Subscription or RG | Contributor (or narrower custom role) |
| ACR resource | AcrPush (for build/push in deploy workflows) |

## 2. GitHub Environments

Repository → **Settings** → **Environments** → create:

### `staging`

**Secrets:**

| Name | Value |
|------|-------|
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_TENANT_ID` | Tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID |

**Variables:**

| Name | Example |
|------|---------|
| `ACR_NAME` | `multistoreacr` |
| `ACR_LOGIN_SERVER` | `multistoreacr.azurecr.io` |
| `AZURE_RESOURCE_GROUP` | `rg-multistore-staging` |
| `API_URL` | `https://api-xxxxx.australiaeast.azurecontainerapps.io` |
| `VITE_API_BASE_URL` | Same as `API_URL` |
| `VITE_PRODUCT_MEDIA_BASE_URL` | `https://account.blob.core.windows.net/product-photos` |
| `VITE_SUPPORT_EMAIL` | `you@example.com` |

### `production`

Same secrets as staging (can reuse OIDC app with environment federated credentials).

Same variables with **production** resource group and URLs.

**Protection rules (recommended):**

- Required reviewers before deploy
- Deployment branch: `main` only

### `shared` (optional)

For `terraform-apply.yml` when applying shared/ACR infra.

## 3. First deploy checklist

1. Terraform applied: shared + staging (+ production when ready) — [terraform-azure.md](./terraform-azure.md)  
2. Database schema applied on staging Postgres  
3. GitHub Environments configured (above)  
4. Push a commit to `develop`  
5. Actions tab → **Deploy Staging** → verify green  
6. Open `API_URL/api/health` and web URL in browser  

## 4. Production deploy

1. Merge `develop` → `main` (via PR)  
2. **Deploy Production** workflow runs  
3. Approve if environment protection enabled  
4. Verify production URLs  
5. Update Stripe **live** webhook to production API URL — [stripe-webhook-production-setup.md](./stripe-webhook-production-setup.md)  

## 5. Terraform in CI

PRs that change `infra/terraform/**` trigger `terraform-plan.yml`.

Full plans require `backend.hcl` available to the runner (often configured via GitHub secrets or a dedicated bootstrap). Until then, validate/fmt still runs.

Apply infra via **Actions → Terraform Apply → choose environment** (manual gate).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Azure login failed | Check federated credential subject matches branch/environment |
| ACR push denied | Grant AcrPush on ACR to the app's service principal |
| `containerapp update` not found | Verify `AZURE_RESOURCE_GROUP` and app names `api` / `web` |
| Health smoke test failed | API still starting; check Container App logs in Log Analytics |
| Web calls wrong API | Rebuild web with correct `VITE_API_BASE_URL` variable |

## Related

- [devops-overview.md](./devops-overview.md)
- [branching-and-environments.md](./branching-and-environments.md)
- [azure-container-registry.md](./azure-container-registry.md)
