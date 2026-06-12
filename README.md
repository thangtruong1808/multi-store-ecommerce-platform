# Multi-Store E-Commerce Platform

A production-style **multi-store e-commerce** portfolio built to demonstrate **frontend**, **full-stack**, and **DevOps** skills: responsive React storefront, role-based admin dashboard, Stripe payments, and automated deployment to **Azure Container Apps** with Terraform.

> **Live demo:** URLs come from Terraform outputs (`web_url`, `api_url`) after deploy. See [Infrastructure & deployment](infra/terraform/README.md).

---

## Highlights (for resume / interviews)

| Area | What this repo demonstrates |
|------|-----------------------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS — responsive storefront, cart/checkout, dashboard UI, Redux Toolkit, Zod validation, accessible loading states |
| **Full-stack** | ASP.NET Core 8 REST API, PostgreSQL 16, JWT + cookie auth, RBAC (admin / store_manager / staff / customer), Stripe Checkout + webhooks, invoice PDF, Azure Blob media |
| **DevOps** | Terraform modules, GitHub Actions CI/CD, OIDC to Azure, GHCR images, scale-to-zero + weekday schedules, custom Postgres on Azure Files |

Full platform and cost details: **[infra/terraform/README.md](infra/terraform/README.md)**.

---

## Features

### Storefront (customer)

- Multi-level category browse, product search, product detail with image gallery
- Shopping cart, wishlist, Stripe Checkout, order history and invoice download
- Sign in, register (optional demo roles), profile, password reset

### Dashboard (admin / store_manager)

- Overview statistics (Recharts)
- CRUD: stores, categories, products (multi-image upload to Azure Blob), vouchers, users
- Scoped access: store managers and staff limited to assigned stores

### Platform

- Integration and unit tests (backend + frontend)
- GitHub Actions: CI on PR; deploy on `develop` (staging) and `main` (production)

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React 18, Vite 8, TypeScript, Tailwind CSS, Redux Toolkit, React Router, Zod, Vitest |
| Backend | ASP.NET Core 8, C#, Npgsql, BCrypt, JWT, Stripe.net |
| Database | PostgreSQL 16 |
| Cloud | Azure Container Apps, Azure Files, Blob Storage, Communication Services, Automation |
| IaC / CI | Terraform, GitHub Actions, GHCR, Azure OIDC |

---

## Project structure

```text
multi-store-ecommerce-platform/
├── frontend/          # React SPA (storefront + dashboard)
├── backend/           # ASP.NET Core Web API
├── database/          # SQL schema scripts
├── infra/
│   ├── terraform/     # Azure IaC — see infra/terraform/README.md
│   └── docker/        # Custom Postgres image for Azure Files
├── .github/workflows/ # CI, deploy staging/production, Terraform
└── package.json       # Root scripts (run frontend + backend together)
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **.NET SDK** 8.0+
- **PostgreSQL** 16 (local or Docker) for backend development

---

## Local development

### 1. Environment files

Copy examples and adjust values:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Key variables:

| File | Variable | Purpose |
|------|----------|---------|
| `frontend/.env` | `VITE_API_BASE_URL` | Backend URL (default `http://localhost:5080`) |
| `backend/.env` | `ConnectionStrings__Default` | PostgreSQL connection |
| `backend/.env` | `CORS_ALLOWED_ORIGINS` | Frontend origin (e.g. `http://localhost:5173`) |
| `backend/.env` | Stripe, JWT, Azure storage keys | See `backend/.env.example` |

Apply the database schema:

```bash
psql -f database/Database-Schema-Generated.sql   # connection flags per your local Postgres
```

### 2. Install and run

```bash
npm install
npm install --prefix frontend
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:5080 |
| Health check | http://localhost:5080/api/health |

Run services separately:

```bash
npm run dev:frontend
npm run dev:backend
```

### 3. Tests

```bash
# Backend unit tests
dotnet test backend.UnitTests

# Backend integration tests (requires Postgres)
dotnet test backend.IntegrationTests

# Frontend
npm run test:run --prefix frontend
```

---

## Deployment (Azure)

Infrastructure and CI/CD are documented in **[infra/terraform/README.md](infra/terraform/README.md)**.

Quick reference:

| Branch | GitHub workflow | Image tag |
|--------|-----------------|-----------|
| `develop` | Deploy Staging | `:staging` + `:sha-*` |
| `main` | Deploy Production | `:production` + `:sha-*` |

Manual scale (same resource group as Terraform):

```bash
bash infra/terraform/scripts/aca-start.sh
bash infra/terraform/scripts/aca-stop.sh
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [infra/terraform/README.md](infra/terraform/README.md) | Architecture, Terraform, cost profile, bootstrap, troubleshooting |
| [infra/terraform/modules/README.md](infra/terraform/modules/README.md) | Terraform module guide |
| [.github/azure-github-config.example.md](.github/azure-github-config.example.md) | GitHub OIDC and Environment variables |
| [infra/docker/postgres-azurefiles/README.md](infra/docker/postgres-azurefiles/README.md) | Custom Postgres container for Azure Files |

---

## License

Portfolio / demonstration project. Adjust licensing before commercial use.
