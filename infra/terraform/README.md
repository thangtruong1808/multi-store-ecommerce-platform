# Terraform — Azure infrastructure



Infrastructure as Code for **staging** and optional **production** Container Apps. The default **showcase / cost-optimized** profile uses **GHCR** (no ACR), **scale-to-zero**, and **weekday 10:00–17:00** schedules.



## Layout



```text

infra/terraform/

├── modules/              # Reusable modules — see [modules/README.md](modules/README.md)

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

| **max_replicas = 2** | Horizontal scale under load; extra replica cost only while it runs |

| **Automation** Mon–Fri 10:00–17:00 Australia/Sydney (AEST) | Matches portfolio demo hours |

| **Smaller CPU/RAM**, **10 GB** file share | Lower storage / compute |

| **Skip `shared/` apply** when `create_acr = false` | One less stack to manage |



**Still billed (low):** Terraform state storage, Log Analytics (light ingest), Postgres file share GB, existing blob/ACS.



**Outside 10:00–17:00:** URLs return errors until the next start window or you run `scripts/aca-start.sh`. Deploy workflow scales apps up after each `develop` push.

Recommended order

1. az login                    ← Azure (devops)
2. Bootstrap (az only)         ← NO git, NO tfvars
3. git clone                   ← get Terraform code
4. cd .../environments/staging
5. cp backend.hcl.example → backend.hcl
6. cp terraform.tfvars.example → terraform.tfvars
7. Edit terraform.tfvars       ← secrets, storage_account_name, etc.
8. terraform init -backend-config=backend.hcl
9. terraform plan
10. terraform apply             ← when ready (costs money)

Static public IP (no need)
Everything important for the running app lives inside ACA (or in fixed Azure services with fixed URLs/connection strings).

One diagram: OFF vs ON

OFF (min_replicas = 0):
  web:     (no container)
  api:     (no container)
  postgres:(no container)  ← data still on Azure File

ON (min_replicas = 1):
  web:     running  ──►  same URL
  api:     running  ──►  same URL  ──►  Host=postgres (same as before)
  postgres:running  ──►  same data

Internet
   │
   ▼
┌─────────────────────────────────────────────────┐
│  Container Apps Environment (cae-multistore-…)  │
│                                                 │
│   web  ──►  api  ──►  postgres (DB)             │
│              │              │                   │
│         GHCR image    data on Azure File share  │
└─────────────────────────────────────────────────┘

Separate (unchanged when ACA sleeps):
  • Blob photos (multistorephotos)
  • Stripe (calls your API URL)
  • ACS email

max_replicas = 2

What happens in Pattern C at 10k simultaneous checkouts
1. When users click “Pay” (before Stripe)
Each purchase hits your API:

POST /api/checkout/session — DB transaction, create order, call Stripe to create a session
That runs on the same API Container App as product pages, cart, login, dashboard, etc.

With your Terraform defaults (aca_max_replicas = 1), one replica serves everything. So:

Checkout requests queue behind each other
Browsing gets slower or times out
Cold starts make it worse if the app was scaled to zero

So yes: more replicas ≈ more capacity + automatic distribution of requests — like scaling out a service behind a load balancer in AWS.

project này không dùng Kubernetes (AKS).

Simple mental model
Option A — Pattern C + higher max_replicas
  "Make the SAME API bigger/fatter"
  ✅ More HTTP capacity
  ❌ Still one DB, still mixed traffic, still sync webhook work

Option B — Functions + queue for webhooks
  "Split payment callbacks into a separate lane"
  ✅ Main API mostly serves users; webhooks processed separately
  ✅ Can ack Stripe fast and retry async work
  ❌ More architecture and infra

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



## 1. Bootstrap remote state (one time) = Khởi tạo ban đầu (setup lần đầu tiên)
It only sets up where Terraform stores its state.


```bash

RG=multi-store-ecommerce-rg

LOC=australiacentral

SA=tfstatemultistore


az storage account create -g $RG -n $SA -l $LOC --sku Standard_LRS

az storage container create --account-name $SA -n tfstate

```


Copy backend config (includes separate state **key** per environment):

```bash
cd infra/terraform/environments/staging
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
What you do next (your flow)
1. terraform apply          → Azure infra created (local, after az login)
2. (optional) terraform output web_url / api_url
   → update terraform.tfvars + GitHub vars (API_URL, VITE_*)
   → terraform apply again if you changed tfvars
3. On your PC: checkout develop, commit, push
   git checkout develop
   git add ...
   git commit -m "..."
   git push origin develop
4. GitHub Actions runs automatically
5. Site can be live (if health check passes + apps scaled/warm)

Branch: deploy staging runs on push to develop (not main). main triggers production deploy.

You don’t have to be “in Azure CLI” for step 3 — only git push from your project folder (any terminal: Git Bash, PowerShell, etc.).


- **Deploy staging:** push to `develop` → build/push **GHCR** → update Container Apps → scale up → health check with retries (cold start).

- **Terraform apply:** Actions → *Terraform Apply* (manual).
OIDC là viết tắt của OpenID Connect.  

What GitHub runs on push to develop
Workflow	      Trigger	                What it does
CI              push to develop         Build/test backend + frontend — no GHCR deploy
Deploy Staging  push to develop         Docker build → push GHCR → az containerapp update → scale up → health check

One-line summary
Yes: after terraform apply, commit and git push origin develop from your repo (on develop) triggers GitHub to build Docker images, push to GHCR, and update Container Apps — that’s how the running app gets your code, without you building Docker locally (unless you choose to).

No: terraform apply does not trigger that by itself; the push to develop does.

No: you don’t need az login on your laptop for the GitHub deploy step (only for local Terraform/az).

If staging environment secrets/vars are already set and API_URL matches Terraform outputs, your sequence is the right one for the interview demo path.
## Secrets



Never commit `terraform.tfvars` or `backend.hcl`. Only `*.example` files are tracked.


Bạn tự đặt tên resource trên cloud và tên biến Terraform, nhưng mọi argument trong block resource phải khớp đúng schema của provider Azure
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

