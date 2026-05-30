# What is safe on GitHub vs local-only

Use this page if you are unsure why `docker-compose.yml`, `infra/terraform/`, or `docker-compose.env.example` appear on GitHub.

## Short answer

| Location | On GitHub? | Why |
|----------|------------|-----|
| **`docker-compose.yml`** (repo root) | **Yes** | Standard DevOps — defines local stack; contains **no passwords** |
| **`docker-compose.env.example`** (repo root) | **Yes** | Template with placeholders only; you copy to **`.env`** locally |
| **`infra/terraform/`** | **Yes** | Infrastructure as Code (modules + `*.example` files); **no secrets** |
| **`.github/workflows/`** | **Yes** | CI/CD pipelines |
| **`guide/`** | **Yes** | Documentation |
| **Root `.env`** | **No** | Real passwords, Stripe keys, blob connection strings |
| **`backend/.env`**, **`frontend/.env`** | **No** | Local dev secrets |
| **`terraform.tfvars`**, **`backend.hcl`** | **No** | Azure/Terraform secrets |

**Secrets never go in GitHub.** They go in gitignored files or GitHub **Environment secrets** (Actions).

## Why not move Docker/Terraform into `guide/`?

| File | Must stay at repo root because |
|------|--------------------------------|
| `docker-compose.yml` | Docker Compose looks for it at the project root; paths to `backend/`, `frontend/`, `database/` are relative |
| `infra/terraform/` | GitHub Actions and Terraform CLI use `infra/terraform/environments/...` |
| `docker-compose.env.example` | Copied to root `.env` beside `docker-compose.yml` |

The **`guide/`** folder is for **reading** (markdown). Operational config stays at the root so tools work after `git clone`.

## What each public file contains

### `docker-compose.yml`

- Service names: `postgres`, `api`, `web`
- Port mappings, health checks
- `${POSTGRES_PASSWORD}` etc. read from **root `.env`** (gitignored)

No Stripe keys or blob connection strings are hard-coded in this file.

### `docker-compose.env.example`

- Variable **names** only
- Placeholders: `change-me`, empty strings
- Safe template for new developers

### `infra/terraform/`

- `.tf` modules and `terraform.tfvars.example` / `backend.hcl.example`
- Real values live in **`terraform.tfvars`** and **`backend.hcl`** (gitignored)

## If you already pushed secrets by mistake

1. **Rotate** every exposed key (Stripe, JWT, Azure storage, Postgres).
2. Remove from Git tracking (keeps local file):

```bash
cd /path/to/multi-store-ecommerce-platform

git rm --cached .env 2>/dev/null || true
git rm --cached backend/.env frontend/.env 2>/dev/null || true
git rm --cached infra/terraform/environments/*/terraform.tfvars 2>/dev/null || true
git rm --cached infra/terraform/environments/*/backend.hcl 2>/dev/null || true

git commit -m "Stop tracking secret env and Terraform var files"
git push
```

3. If secrets were in **old commits** on a public repo, consider [GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning), rotate keys, and optionally rewrite history (advanced).

## Commands people confuse (do NOT use for normal setup)

These **remove infrastructure from GitHub** and **break** clone + CI/CD for teammates:

```bash
# NOT recommended — only if you intentionally abandon repo-based DevOps
git rm --cached docker-compose.yml docker-compose.env.example
git rm -r --cached infra/terraform
```

After that, others cannot run `docker compose up` or `terraform apply` from a fresh clone.

## Private repo option

If the whole codebase must stay private, set the GitHub repository to **Private** — you still commit `docker-compose.yml` and `infra/terraform/` (without secrets). That is normal for company projects.

## Related

- [README.md](./README.md) — full setup from scratch
- [devops-overview.md](./devops-overview.md) — architecture
