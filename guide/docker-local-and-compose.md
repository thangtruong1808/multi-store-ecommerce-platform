# Docker — local development with Compose

This guide runs the full stack locally with Docker: **PostgreSQL**, **.NET API**, and **nginx + React storefront**. It mirrors the production layout on Azure Container Apps (see [azure-container-apps-deploy.md](./azure-container-apps-deploy.md)).

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows: enable WSL2 backend)
- Git clone of this repository
- Optional: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) for later deploy guides

## 1. Configure environment

This project uses **three** env files (names are not renamed—only values differ by mode):

| File | Used for |
|------|----------|
| `backend/.env` | Local `dotnet run` (port 5080) |
| `frontend/.env` | Local `npm run dev` (port 5173) |
| **Root** `.env` | **Docker Compose only** (gitignored) |

From the repository root (first time):

```bash
cp docker-compose.env.example .env
```

Then copy API secret **values** from `backend/.env` into root `.env` (same variable names). Edit Docker-specific values:

Edit root `.env`:

| Variable | Local Docker value |
|----------|-------------------|
| `POSTGRES_PASSWORD` | Strong password (used by API connection string via Compose) |
| `JWT_SECRET` | Long random string (32+ characters) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost` |
| `PUBLIC_APP_BASE_URL` | `http://localhost` |
| `AUTH_COOKIE_SECURE` | `false` |
| `VITE_API_BASE_URL` | Leave **empty** so the browser calls `/api` through nginx (no CORS issues) |

Add Stripe / Azure keys when you need checkout, blob photos, or email (see other guides).

## 2. Start the stack

```bash
docker compose up --build
```

First start may take several minutes (image build + npm install).

| URL | Service |
|-----|---------|
| http://localhost | Storefront (nginx → React `dist/`) |
| http://localhost/api/health | API health (via nginx proxy) |
| http://localhost:8080/api/health | API direct (optional) |
| http://localhost/maintenance.html | Static maintenance page |
| `localhost:5432` | PostgreSQL (for tools like pgAdmin) |

## 3. Database schema

On **first** Postgres volume creation, Compose mounts [`database/Database-Schema-Generated.sql`](../database/Database-Schema-Generated.sql) into `/docker-entrypoint-initdb.d/`, so the schema is applied automatically.

If you already had a `postgres_data` volume without the schema:

```bash
docker compose down -v
docker compose up --build
```

(`-v` removes volumes — **deletes local DB data**.)

## 4. Smoke test

1. Open http://localhost — home page loads after a short “Connecting to the store…” spinner.
2. `curl http://localhost/api/health` → `{"status":"ok","database":"ok"}`.
3. Register / sign in, browse products, cart (Stripe keys required for checkout).

## 5. Test maintenance mode

**API down (in-app maintenance):**

```bash
docker compose stop api
```

Refresh http://localhost — you should see the React maintenance page (not the browser “can’t be reached” error). Keep `web` running.

**Planned maintenance flag:**

Set `MAINTENANCE_MODE=true` in `.env`, then:

```bash
docker compose up -d --build api
```

**Static maintenance HTML only:**

Open http://localhost/maintenance.html (used when the whole frontend host is replaced in production).

## 6. Useful commands

```bash
# Stop all services
docker compose down

# Rebuild after code changes
docker compose up --build

# API logs
docker compose logs -f api

# Frontend rebuild (VITE_* changed — requires rebuild)
docker compose build web --no-cache
docker compose up -d web
```

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 80 or 8080 in use | Stop IIS/other services or change ports in `docker-compose.yml` |
| API unhealthy | `docker compose logs api` — check DB password and `JWT_SECRET` |
| Blank page / API errors | Ensure `VITE_API_BASE_URL` is empty in `.env` and rebuild `web` |
| CORS errors | `CORS_ALLOWED_ORIGINS` must match `http://localhost` exactly |
| Schema missing | `docker compose down -v` and start fresh (see §3) |

## Next steps

1. [azure-container-registry.md](./azure-container-registry.md) — push images to ACR  
2. [azure-storage-blob-and-file-share.md](./azure-storage-blob-and-file-share.md) — Blob + File Share for Postgres on Azure  
3. [azure-container-apps-deploy.md](./azure-container-apps-deploy.md) — deploy to Azure Container Apps  
