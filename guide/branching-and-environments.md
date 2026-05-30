# Branching and environments

## Branches

| Branch | Role |
|--------|------|
| `develop` | Integration branch for staging — merge feature branches here |
| `main` | Production — only merge tested code from `develop` (or hotfixes) |

## Daily workflow

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/my-change
   ```
2. Develop locally (Docker Compose or Vite + `dotnet run`).
3. Open a **pull request into `develop`**. CI runs build, lint, and Docker smoke tests.
4. Merge to `develop` → **automatic deploy to staging** (GitHub Actions).
5. Verify on staging URLs (`web` and `api` FQDNs from Terraform outputs).
6. When ready for production, open PR **`develop` → `main`** (or merge after review).
7. Merge to `main` → **automatic deploy to production** (optionally with required approvers on GitHub Environment `production`).

## Staging vs production differences

| Item | Staging | Production |
|------|---------|------------|
| Azure RG | `rg-multistore-staging` | `rg-multistore-prod` |
| Image tags | `staging`, `sha-*` | `production`, `latest`, `sha-*` |
| Stripe | Test keys (`sk_test_`) | Live keys (`sk_live_`) |
| ASP.NET env | `Staging` | `Production` |
| Data | Separate Postgres volume | Separate Postgres volume |

Never point staging at production database or vice versa.

## Hotfix (production urgent fix)

1. Branch from `main`: `git checkout -b hotfix/description`
2. Fix, PR to `main`, deploy production.
3. Back-merge `main` into `develop` so branches stay aligned:
   ```bash
   git checkout develop
   git merge main
   git push
   ```

## What does *not* auto-deploy

- Terraform infrastructure changes — use **Terraform Apply** workflow or local `terraform apply`
- Database schema migrations — apply SQL manually or add a migration pipeline later
- Stripe Dashboard webhook URL changes

## Related

- [devops-overview.md](./devops-overview.md)
- [github-actions-setup.md](./github-actions-setup.md)
