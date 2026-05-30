# Azure + GitHub configuration (example)

Copy values into **GitHub → Repository → Settings → Environments**.  
Do **not** commit real passwords, Stripe keys, or `AZURE_CLIENT_ID` until the app registration exists.

Aligned with existing Azure resource group **`multi-store-ecommerce-rg`** in **`australiacentral`**.

## Showcase cost profile (GHCR, no ACR)

- Container images: **GitHub Container Registry** `ghcr.io/<owner>/multi-store-api:staging` (workflow pushes on `develop`).
- Terraform **`use_acr = false`** and **`create_acr = false`** — skip Azure Container Registry (~AU$8/mo).
- Container Apps **scale to zero** outside **10:00–17:00 Mon–Fri** (AUS Central) via Azure Automation (see [infra/terraform/README.md](../infra/terraform/README.md)).

### GHCR package visibility

For Azure Container Apps to pull without registry credentials, set each package to **Public** (GitHub → Packages → Package settings → Change visibility), or link the repo and use a public package policy.

## Subscription and Entra (same for all environments)

| GitHub secret | Value |
|---------------|--------|
| `AZURE_TENANT_ID` | `769ea2a6-a819-4ed2-84e8-2b4e7c11423b` |
| `AZURE_SUBSCRIPTION_ID` | `5836deed-e34c-4618-ab72-a65259fad1f2` |
| `AZURE_CLIENT_ID` | *(from app registration `github-multistore-actions`)* |

Human operator (Portal / `az login`): `devops@thangtruongtruganinagmail.onmicrosoft.com`  
IAM group with **Contributor**: `grp-multistore-devops`

## Environment: `staging`

**Secrets:** `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_ID`

**Variables:**

| Name | Example / placeholder |
|------|------------------------|
| `AZURE_RESOURCE_GROUP` | `multi-store-ecommerce-rg` |
| `GHCR_OWNER` | `thangtruong1808` *(optional; defaults to `github.repository_owner`)* |
| `API_URL` | `https://api-xxxxx.australiacentral.azurecontainerapps.io` |
| `VITE_API_BASE_URL` | same as `API_URL` |
| `VITE_PRODUCT_MEDIA_BASE_URL` | blob public URL for `product-photos` |
| `VITE_SUPPORT_EMAIL` | your support email |

`ACR_NAME` / `ACR_LOGIN_SERVER` are **not required** for the GHCR profile.

## Environment: `production`

Same **secrets** as staging. Variables same shape; production may still use ACR if you enable it in Terraform.

## Federated credential subjects (OIDC)

```
repo:thangtruong1808/multi-store-ecommerce-platform:environment:staging
repo:thangtruong1808/multi-store-ecommerce-platform:environment:production
```

## Service principal IAM

| Scope | Role |
|-------|------|
| Subscription or `multi-store-ecommerce-rg` | Contributor |

**AcrPush** is only needed if you set `create_acr = true` / `use_acr = true`.

## Related

- [workflows/deploy-staging.yml](./workflows/deploy-staging.yml)
- [../infra/terraform/README.md](../infra/terraform/README.md)
