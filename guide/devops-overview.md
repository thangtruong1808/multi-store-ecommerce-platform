# DevOps overview

This project uses **Infrastructure as Code (Terraform)**, **CI/CD (GitHub Actions)**, and **Azure Container Apps (ACA)** for staging and production.

## Branch → environment mapping

| Git branch | GitHub Environment | Azure stack | Purpose |
|------------|-------------------|-------------|---------|
| `develop` | `staging` | `rg-multistore-staging` | Test fixes and new features before production |
| `main` | `production` | `rg-multistore-prod` | Live storefront |

**Local development** is separate: Docker Compose on your machine (`http://localhost`) or `dotnet run` + Vite — not tied to Azure branches.

## Architecture

```text
Browser → ACA web (nginx + React)
       → ACA api (.NET 8) → ACA postgres (Azure Files volume)
       → Azure Blob (product photos)
       → Azure Communication Services (email)
       → Stripe (webhooks → api)
```

Shared **Azure Container Registry (ACR)** stores images; staging and production pull different tags (`staging`, `production`).

## What is automated

| Layer | Tool | Trigger |
|-------|------|---------|
| Build & lint | GitHub Actions `ci.yml` | PR / push to `develop` or `main` |
| Deploy app (staging) | `deploy-staging.yml` | Push to `develop` |
| Deploy app (production) | `deploy-production.yml` | Push to `main` |
| Infra plan | `terraform-plan.yml` | PR changing `infra/terraform/**` |
| Infra apply | `terraform-apply.yml` | Manual workflow dispatch |

## What stays manual (one-time or rare)

- Bootstrap Terraform remote state storage
- Azure AD app registration for GitHub OIDC
- GitHub Environment secrets and variables
- Apply database schema per environment
- Stripe webhook endpoints (separate URLs for staging vs production)
- Optional: custom domains on Container Apps

## Kubernetes note

Azure Container Apps is a **managed container platform** built on Kubernetes. You do not manage an AKS cluster, nodes, or Helm charts in this repo. That keeps operational cost lower while still following standard DevOps practices (IaC, CI/CD, immutable images, environment separation).

If you later need full Kubernetes control, add an AKS module and Kubernetes manifests as a separate track.

## Recommended setup order

1. [docker-local-and-compose.md](./docker-local-and-compose.md) — verify Docker locally  
2. [terraform-azure.md](./terraform-azure.md) — provision shared → staging → production  
3. [github-actions-setup.md](./github-actions-setup.md) — OIDC, secrets, first deploy  
4. [branching-and-environments.md](./branching-and-environments.md) — daily workflow  
5. [stripe-webhook-production-setup.md](./stripe-webhook-production-setup.md) — payments  

Manual Portal/CLI guides remain available for troubleshooting.

## Repository DevOps files

| Path | Purpose |
|------|---------|
| [`infra/terraform/`](../infra/terraform/) | Terraform modules and environments |
| [`.github/workflows/`](../.github/workflows/) | CI/CD pipelines |
| [`docker-compose.yml`](../docker-compose.yml) | Local full stack |
| [`docker-compose.env.example`](../docker-compose.env.example) | Local env template |

## Security

- Never commit `.env`, `terraform.tfvars`, or `backend.hcl` with secrets  
- Use GitHub Environments with protection rules on `production`  
- Use Azure OIDC for Actions (no long-lived service principal passwords in GitHub)  
- Rotate Stripe and JWT secrets if ever exposed  
