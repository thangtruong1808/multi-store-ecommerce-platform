# Azure Container Registry (ACR)

Store Docker images for the **API** (`multi-store-api`) and **web** (`multi-store-web`) containers. Azure Container Apps pulls from ACR at deploy time.

> **Primary path:** GitHub Actions builds and pushes images on push to `develop` (tag `staging`) or `main` (tag `production`). See [github-actions-setup.md](./github-actions-setup.md). Terraform creates the shared ACR — [terraform-azure.md](./terraform-azure.md). Manual steps below are for troubleshooting or first-time bootstrap before CI is configured.

## Prerequisites

- Azure subscription and resource group (e.g. `rg-multistore`)
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) installed (`az login`)
- Docker Desktop running locally
- Images build successfully with [docker-local-and-compose.md](./docker-local-and-compose.md)

## 1. Create a registry

```bash
az group create --name rg-multistore --location australiaeast

az acr create \
  --resource-group rg-multistore \
  --name multistoreacr \
  --sku Basic \
  --admin-enabled true
```

Registry name must be globally unique (letters/numbers only, 5–50 chars). Change `multistoreacr` if taken.

Note login server: `multistoreacr.azurecr.io`

## 2. Log in to ACR

```bash
az acr login --name multistoreacr
```

## 3. Build and push images

From the **repository root**:

**API:**

```bash
docker build -t multistoreacr.azurecr.io/multi-store-api:latest ./backend
docker push multistoreacr.azurecr.io/multi-store-api:latest
```

**Web** (production API URL — replace with your ACA API FQDN after deploy, or rebuild later):

```bash
docker build -t multistoreacr.azurecr.io/multi-store-web:latest \
  --build-arg VITE_API_BASE_URL=https://YOUR-API-FQDN \
  --build-arg VITE_PRODUCT_MEDIA_BASE_URL=https://YOUR-STORAGE.blob.core.windows.net/product-photos \
  ./frontend

docker push multistoreacr.azurecr.io/multi-store-web:latest
```

For same-origin `/api` behind a single hostname, leave `VITE_API_BASE_URL` empty and configure nginx + ingress in [azure-container-apps-deploy.md](./azure-container-apps-deploy.md).

## 4. Verify images in ACR

```bash
az acr repository list --name multistoreacr --output table
az acr repository show-tags --name multistoreacr --repository multi-store-api --output table
```

## 5. Grant Container Apps access to ACR

When creating the Container Apps environment (see deploy guide), use either:

**Admin credentials** (simple for dev): enable admin user on ACR (already done above), store username/password as ACA registry secret.

**Managed identity** (recommended for production):

```bash
# After Container Apps environment exists
az containerapp env create ...  # see deploy guide

# Assign AcrPull to the environment's system-assigned identity
```

Portal: Container Apps environment → **Containers** → your app → **Registry** → Azure Container Registry → select `multistoreacr`, identity **System assigned**.

## 6. Version tags (recommended)

CI uses environment tags automatically:

| Branch | API / web tags |
|--------|----------------|
| `develop` | `staging`, `sha-<commit>` |
| `main` | `production`, `latest`, `sha-<commit>` |

Manual tagging example:

```bash
TAG=$(git rev-parse --short HEAD)
docker build -t multistoreacr.azurecr.io/multi-store-api:$TAG ./backend
docker push multistoreacr.azurecr.io/multi-store-api:$TAG
```

## 7. Optional — build in Azure (ACR Tasks)

Build without local Docker:

```bash
az acr build --registry multistoreacr --image multi-store-api:latest ./backend
az acr build --registry multistoreacr \
  --image multi-store-web:latest \
  --build-arg VITE_API_BASE_URL= \
  ./frontend
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `NAME_ALREADY_EXISTS` | Pick another ACR name |
| `denied: requested access` | Run `az acr login` again; check admin enabled |
| ACA pull fails | Confirm registry secret / AcrPull role on environment identity |
| Wrong API URL in browser | Rebuild `multi-store-web` with correct `VITE_API_BASE_URL` |

## Next step

[terraform-azure.md](./terraform-azure.md) (primary) or [azure-container-apps-deploy.md](./azure-container-apps-deploy.md) (manual fallback)
