# Deployment and operations guides

Step-by-step documentation for running Multi-Store Ecommerce Platform locally with Docker and on Azure.

## Recommended reading order

| Step | Guide | Topic |
|------|--------|--------|
| 1 | [docker-local-and-compose.md](./docker-local-and-compose.md) | Docker Compose on your machine |
| 2 | [azure-container-registry.md](./azure-container-registry.md) | Push images to ACR |
| 3 | [azure-storage-blob-and-file-share.md](./azure-storage-blob-and-file-share.md) | Blob photos + File Share for Postgres |
| 4 | [azure-container-apps-deploy.md](./azure-container-apps-deploy.md) | Deploy postgres, api, web to ACA |
| 5 | [stripe-webhook-production-setup.md](./stripe-webhook-production-setup.md) | Stripe checkout webhooks |
| 6 | [azure-monitor-log-analytics.md](./azure-monitor-log-analytics.md) | Logs and alerts |
| 7 | [azure-automation-start-stop.md](./azure-automation-start-stop.md) | Scheduled scale to zero (cost saving) |

## Feature-specific Azure setup (existing)

| Guide | Topic |
|--------|--------|
| [azure-product-photos-setup.md](./azure-product-photos-setup.md) | Blob storage for product images |
| [azure-communication-services-email-setup.md](./azure-communication-services-email-setup.md) | Transactional email (password reset, contact) |

## Architecture summary

```text
Browser → ACA "web" (nginx + React)
       → ACA "api" (.NET 8) → ACA "postgres" (data on Azure Files)
       → Azure Blob (images)
       → Azure Communication Services (email)
       → Stripe (webhooks → api)
```

## Repository Docker files

| File | Purpose |
|------|---------|
| [`docker-compose.yml`](../docker-compose.yml) | Local postgres + api + web |
| [`docker-compose.env.example`](../docker-compose.env.example) | Environment template |
| [`backend/Dockerfile`](../backend/Dockerfile) | API image |
| [`frontend/Dockerfile`](../frontend/Dockerfile) | Web image (nginx) |

## Health and maintenance

- API health: `GET /api/health`  
- Planned maintenance: `MAINTENANCE_MODE=true` on API  
- Static page: `/maintenance.html` (also in [`frontend/public/maintenance.html`](../frontend/public/maintenance.html))  
- SPA maintenance UI when API is unreachable (built into the React app)  
