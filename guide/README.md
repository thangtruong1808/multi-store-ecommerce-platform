# Multi-Store — DevOps setup from scratch

This is the **main entry point** for understanding and deploying the project like a Junior/Medium DevOps workflow: **local Docker → Terraform (Azure) → GitHub Actions (CI/CD) → staging (`develop`) → production (`main`)**.

No application UI or feature code lives in this folder — only operations guides and pointers to repo config files.

> **GitHub visibility:** `docker-compose.yml`, `docker-compose.env.example`, and `infra/terraform/` **should** be on GitHub (no secrets inside). Only `.env` and `terraform.tfvars` stay local. See [what-is-safe-on-github.md](./what-is-safe-on-github.md).

---

## Big picture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  YOUR MACHINE (local)                                                   │
│  docker-compose.yml + root .env  →  http://localhost                    │
│  backend/.env + frontend/.env    →  dotnet run + Vite (optional)        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ git push
┌─────────────────────────────────────────────────────────────────────────┐
│  GITHUB                                                                 │
│  develop branch  →  CI + Deploy Staging                                 │
│  main branch     →  CI + Deploy Production                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AZURE                                                                  │
│  Shared ACR (images)                                                    │
│  Staging ACA:  postgres + api + web   ← develop                         │
│  Production ACA: postgres + api + web ← main                            │
│  Existing Blob container (product photos) ← shared by all environments  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Branches:**

| Branch | Deploys to | Image tags |
|--------|------------|------------|
| `develop` | Azure **staging** | `staging`, `sha-*` |
| `main` | Azure **production** | `production`, `latest` |

---

## Prerequisites on your machine

| Tool | Used for |
|------|----------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Local full stack |
| [Git](https://git-scm.com/) | Branches `develop` / `main` |
| [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) | `az login`, ACR, Container Apps |
| [Terraform](https://www.terraform.io/downloads) >= 1.5 | Infrastructure as Code |
| GitHub repo with **Actions** enabled | CI/CD |

**Azure subscription** with permission to create resource groups, ACR, Container Apps, and storage.

---

## You already have Azure Blob for product photos

If your blob container is already set up (see [azure-product-photos-setup.md](./azure-product-photos-setup.md)), **do not create a second container** for photos in Terraform.

**Collect these values** from your existing setup (likely in `backend/.env` today):

| Variable | Example | Used in |
|----------|---------|---------|
| `AZURE_STORAGE_CONNECTION_STRING` | `DefaultEndpointsProtocol=https;AccountName=...` | API (upload photos) |
| `AZURE_STORAGE_CONTAINER_NAME` | `product-photos` | API |
| `AZURE_STORAGE_PUBLIC_BASE_URL` | `https://multistorephotos.blob.core.windows.net/product-photos` | API + frontend build |
| `VITE_PRODUCT_MEDIA_BASE_URL` | Same public base URL | Frontend Docker build / GitHub vars |

You will **reuse the same blob account** for:

- Local Docker (root `.env`)
- Staging API (Terraform `terraform.tfvars` + GitHub vars)
- Production API (separate `terraform.tfvars`, same blob URLs)

Staging and production **API/DB are separate**; **photos can stay in one shared blob container** (same URLs in both environments).

In Terraform staging/production `terraform.tfvars`, keep:

```hcl
create_blob_container = false   # default — you already have the container
azure_storage_enabled = true
azure_storage_connection_string = "<your existing connection string>"
azure_storage_public_base_url   = "https://YOUR_ACCOUNT.blob.core.windows.net/product-photos"
```

**Read:** [azure-product-photos-setup.md](./azure-product-photos-setup.md) (reference only if you need to verify CORS or public access).

---

## Step-by-step setup (from zero to production)

Follow the phases in order. Each phase lists **guides to read**, **files to create/edit**, and **how to verify**.

---

### Phase 0 — Understand the workflow (15 min)

**Goal:** Know what is automated vs manual.

| Read | Why |
|------|-----|
| [devops-overview.md](./devops-overview.md) | Architecture, automation table, security |
| [branching-and-environments.md](./branching-and-environments.md) | `develop` vs `main` daily flow |

**Repo files to skim (no edits yet):**

| File | Purpose |
|------|---------|
| [`.github/workflows/`](../.github/workflows/) | CI/CD pipeline definitions |
| [`infra/terraform/`](../infra/terraform/) | Azure infrastructure modules |
| [`docker-compose.yml`](../docker-compose.yml) | Local postgres + api + web |

---

### Phase 1 — Local Docker (first runnable stack)

**Goal:** Confirm the app builds and runs at `http://localhost` before touching Azure.

| Read | Why |
|------|-----|
| [docker-local-and-compose.md](./docker-local-and-compose.md) | Full local Docker instructions |

**Files to create/edit (on your machine, never commit secrets):**

| Action | File |
|--------|------|
| Copy template | `docker-compose.env.example` → **root** `.env` |
| Copy values | From `backend/.env` / `frontend/.env` into root `.env` (same variable **names**) |
| Optional dev mode | Keep `backend/.env` + `frontend/.env` for `dotnet run` + Vite |

**Important root `.env` values for Docker:**

| Variable | Local Docker value |
|----------|-------------------|
| `POSTGRES_*` | Password, user `postgres`, DB `MULTIPLY` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost` |
| `PUBLIC_APP_BASE_URL` | `http://localhost` |
| `VITE_API_BASE_URL` | **empty** (nginx proxies `/api`) |
| `VITE_PRODUCT_MEDIA_BASE_URL` | Your **existing** blob public URL |
| `AZURE_STORAGE_*` | Your **existing** blob connection (for uploads) |

**Commands:**

```bash
docker compose up --build
```

**Verify:**

- http://localhost loads
- http://localhost/api/health → `{"status":"ok","database":"ok"}`
- Register a user; optional: upload a product photo (uses your existing blob)

**Optional:** pgAdmin to Docker Postgres on `localhost:5433` if compose maps `5433:5432` — tables in schema **`app`**.

---

### Phase 2 — Git branches

**Goal:** Wire repo to staging/production deploy paths.

| Read | Why |
|------|-----|
| [branching-and-environments.md](./branching-and-environments.md) | Branch rules |

**Actions:**

1. Ensure branches exist: `develop`, `main`
2. Day-to-day: feature branch → PR → **`develop`**
3. Release: merge **`develop` → `main`** when staging looks good

No config files required in this phase.

---

### Phase 3 — Terraform remote state (one time)

**Goal:** Store Terraform state safely in Azure (team-ready).

| Read | Why |
|------|-----|
| [`infra/terraform/README.md`](../infra/terraform/README.md) | Bootstrap commands |
| [terraform-azure.md](./terraform-azure.md) | Full IaC walkthrough |

**Files to create (gitignored, per environment later):**

| File | From |
|------|------|
| `infra/terraform/environments/shared/backend.hcl` | `backend.hcl.example` |
| Same for `staging/`, `production/` | Each folder's `backend.hcl.example` |

**Commands (example — adjust names):**

```bash
az group create -n rg-multistore-shared -l australiaeast
az storage account create -g rg-multistore-shared -n tfstatemultistore -l australiaeast --sku Standard_LRS
az storage container create --account-name tfstatemultistore -n tfstate
```

**Verify:** Storage container `tfstate` exists in Azure Portal.

---

### Phase 4 — Terraform: shared ACR

**Goal:** One container registry for staging + production images.

| Read | Why |
|------|-----|
| [terraform-azure.md](./terraform-azure.md) § Shared ACR |
| [`infra/terraform/environments/shared/`](../infra/terraform/environments/shared/) | Terraform root |

**Files to create/edit:**

| File | Action |
|------|--------|
| `environments/shared/terraform.tfvars` | Copy from `terraform.tfvars.example`; set unique `acr_name` |
| `environments/shared/backend.hcl` | Copy from `backend.hcl.example` |

**Commands:**

```bash
cd infra/terraform/environments/shared
terraform init -backend-config=backend.hcl
terraform apply
```

**Verify:** `terraform output acr_login_server` — note ACR name and login server.

---

### Phase 5 — Terraform: staging + production stacks

**Goal:** Create Container Apps (postgres, api, web) for each environment.

| Read | Why |
|------|-----|
| [terraform-azure.md](./terraform-azure.md) § Staging / Production |
| [azure-storage-blob-and-file-share.md](./azure-storage-blob-and-file-share.md) | Postgres **File Share** (not your photo blob) |

**Note:** Terraform creates a **separate storage account per environment** for **Postgres data** (Azure Files). That is **not** your product-photos blob account.

**Before first `terraform apply`:** push placeholder images to ACR (see [terraform-azure.md](./terraform-azure.md) § placeholder images).

**Files to create/edit (per environment, gitignored):**

| Environment | Directory | Key secrets in `terraform.tfvars` |
|-------------|-----------|-----------------------------------|
| Staging | `environments/staging/` | `postgres_password`, `jwt_secret`, Stripe **test** keys, **existing blob** vars |
| Production | `environments/production/` | Strong unique passwords, Stripe **live** keys, same blob URLs |

**Apply order:**

```bash
# Staging
cd infra/terraform/environments/staging
cp terraform.tfvars.example terraform.tfvars   # fill in + your blob values
terraform init -backend-config=backend.hcl
terraform apply

# Production (when ready)
cd ../production
# same pattern
```

**After first apply:**

1. Note `terraform output api_url` and `web_url`
2. Update `cors_allowed_origins` and `public_app_base_url` in `terraform.tfvars` to match **web_url**
3. Run `terraform apply` again

**Database schema (once per environment):**

Connect to Postgres and run `database/Database-Schema-Generated.sql` (tables in schema **`app`**). See [terraform-azure.md](./terraform-azure.md).

**Verify:**

- `curl https://<staging-api-url>/api/health` → ok
- Staging web URL loads (may be empty catalog until you add data)

---

### Phase 6 — GitHub Actions (CI/CD)

**Goal:** Push to `develop` deploys staging; push to `main` deploys production.

| Read | Why |
|------|-----|
| [github-actions-setup.md](./github-actions-setup.md) | OIDC, secrets, variables |

**Azure (one time):** App registration + federated credentials for GitHub OIDC.

**GitHub → Settings → Environments:**

Create **`staging`** and **`production`**.

**Secrets (both environments):**

| Secret | Source |
|--------|--------|
| `AZURE_CLIENT_ID` | App registration |
| `AZURE_TENANT_ID` | Entra ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription |

**Variables (staging example — use your Terraform outputs):**

| Variable | Example |
|----------|---------|
| `ACR_NAME` | From shared Terraform |
| `ACR_LOGIN_SERVER` | `youracr.azurecr.io` |
| `AZURE_RESOURCE_GROUP` | `rg-multistore-staging` |
| `API_URL` | Staging api FQDN (https) |
| `VITE_API_BASE_URL` | Same as `API_URL` |
| `VITE_PRODUCT_MEDIA_BASE_URL` | **Your existing blob public URL** |
| `VITE_SUPPORT_EMAIL` | Contact email |

Repeat variables for **`production`** with production RG and URLs.

**Repo files (already in project — read only):**

| File | Role |
|------|------|
| `.github/workflows/ci.yml` | Build + lint on PR |
| `.github/workflows/deploy-staging.yml` | Push `develop` → staging |
| `.github/workflows/deploy-production.yml` | Push `main` → production |
| `.github/workflows/terraform-apply.yml` | Manual infra apply |

**Verify:**

1. Push a small commit to `develop`
2. GitHub **Actions** → **Deploy Staging** succeeds
3. Staging site shows latest build; photos load from **existing blob** if products have `imageS3Key`

---

### Phase 7 — Stripe webhooks (staging then production)

**Goal:** Checkout works in each environment.

| Read | Why |
|------|-----|
| [stripe-webhook-production-setup.md](./stripe-webhook-production-setup.md) | Two endpoints (test vs live) |

**Actions:**

- Staging Stripe webhook → `https://<staging-api>/api/webhooks/stripe` + test `whsec_`
- Production webhook → `https://<production-api>/api/webhooks/stripe` + live `whsec_`

Secrets live in Terraform `terraform.tfvars` (API Container App), not in GitHub (unless you add them later).

---

### Phase 8 — Monitor and cost (optional)

| Read | When |
|------|------|
| [azure-monitor-log-analytics.md](./azure-monitor-log-analytics.md) | Logs and alerts |
| [azure-automation-start-stop.md](./azure-automation-start-stop.md) | Scale to zero on a schedule |

---

## Daily DevOps workflow (after setup)

```text
1. Code locally (Docker or Vite + dotnet run)
2. PR → develop          → CI runs
3. Merge develop         → auto deploy staging → QA on staging URL
4. PR develop → main     → review
5. Merge main            → auto deploy production
6. Infra change only     → edit infra/terraform → terraform apply (or Actions workflow)
```

Details: [branching-and-environments.md](./branching-and-environments.md)

---

## Master file checklist

Files you will touch during setup (secrets never committed):

| Phase | File | Commit to Git? |
|-------|------|----------------|
| Local | Root `.env` | **No** (gitignored) |
| Local | `backend/.env`, `frontend/.env` | **No** |
| Terraform | `infra/terraform/environments/*/terraform.tfvars` | **No** |
| Terraform | `infra/terraform/environments/*/backend.hcl` | **No** |
| Terraform | `infra/terraform/` (`.tf`, `*.example`) | **Yes** — IaC, no secrets |
| CI/CD | `.github/workflows/*.yml` | **Yes** |
| Local stack | `docker-compose.yml`, `docker-compose.env.example` | **Yes** — templates at repo root |
| Docs | `guide/*.md` | **Yes** |

Details: [what-is-safe-on-github.md](./what-is-safe-on-github.md).

**Your existing blob:** values flow from `backend/.env` → root `.env` → Terraform `terraform.tfvars` → GitHub `VITE_PRODUCT_MEDIA_BASE_URL`.

---

## All guides (index)

### DevOps path (recommended order)

| Step | Guide | Topic |
|------|--------|--------|
| 0 | [devops-overview.md](./devops-overview.md) | Architecture, branches, automation |
| 1 | [docker-local-and-compose.md](./docker-local-and-compose.md) | Docker Compose locally |
| 2 | [terraform-azure.md](./terraform-azure.md) | IaC: ACR + staging + production |
| 3 | [github-actions-setup.md](./github-actions-setup.md) | OIDC, GitHub environments |
| 4 | [branching-and-environments.md](./branching-and-environments.md) | `develop` / `main` workflow |
| 5 | [stripe-webhook-production-setup.md](./stripe-webhook-production-setup.md) | Stripe (staging + prod) |
| 6 | [azure-monitor-log-analytics.md](./azure-monitor-log-analytics.md) | Logs and alerts |
| 7 | [azure-automation-start-stop.md](./azure-automation-start-stop.md) | Cost saving schedules |

### Reference

| Guide | Topic |
|--------|--------|
| [what-is-safe-on-github.md](./what-is-safe-on-github.md) | **Why** docker-compose & Terraform are on GitHub |
| [azure-product-photos-setup.md](./azure-product-photos-setup.md) | **Your existing blob** — reference |
| [azure-communication-services-email-setup.md](./azure-communication-services-email-setup.md) | Email (password reset, contact) |

### Manual fallback (troubleshooting)

| Guide | Topic |
|--------|--------|
| [azure-container-registry.md](./azure-container-registry.md) | Manual ACR push |
| [azure-storage-blob-and-file-share.md](./azure-storage-blob-and-file-share.md) | File Share for Postgres volume |
| [azure-container-apps-deploy.md](./azure-container-apps-deploy.md) | Manual Portal/CLI deploy |

---

## Health and maintenance

- API health: `GET /api/health`
- Planned maintenance: `MAINTENANCE_MODE=true` on API Container App
- Static page: `/maintenance.html`
- In-app maintenance UI when API is down (React — no extra deploy step)

---

## Quick troubleshooting

| Problem | Check |
|---------|--------|
| Photos missing on staging/prod | `VITE_PRODUCT_MEDIA_BASE_URL` in GitHub vars; rebuild web via deploy workflow |
| Upload fails on API | `AZURE_STORAGE_*` in Terraform `terraform.tfvars`; `AZURE_STORAGE_ENABLED=true` |
| CORS errors | `CORS_ALLOWED_ORIGINS` must exactly match **web** URL (https, no trailing slash) |
| Deploy fails OIDC | [github-actions-setup.md](./github-actions-setup.md) federated credential subject |
| Local vs Azure DB confused | Local Docker = port 5433; Windows Postgres = 5432 — separate databases |

---

**Start here:** Phase 0 → Phase 1 (local Docker) → Phase 4–6 (Azure + GitHub). Your blob is already done — reuse those values in Phase 1, 5, and 6.
