# Azure Blob Storage — product photos

This guide explains how to configure Azure Blob Storage for dashboard product photo uploads. The API resizes images (max 1200px edge, WebP) and stores them in a public container. Keys are saved in PostgreSQL `app.product_images.image_s3_key`.

## Prerequisites

- An [Azure](https://portal.azure.com) subscription
- Backend and frontend running locally (or deployed)
- Dashboard user with role `admin` or `store_manager`

## 1. Create a storage account

1. In Azure Portal, create a **Storage account** (Performance: Standard, redundancy as you prefer).
2. Note the **Storage account name** (e.g. `mystorephotos`).

## 2. Create a blob container

1. Open the storage account → **Containers** → **+ Container**.
2. Name: `product-photos` (or match `AZURE_STORAGE_CONTAINER_NAME`).
3. **Public access level**: **Blob (anonymous read access for blobs only)** so the storefront and dashboard can load images via URL without SAS tokens.

## 3. Connection string

1. Storage account → **Access keys** → copy **Connection string** (key1).
2. Add to `backend/.env` (never commit this file):

```env
AZURE_STORAGE_ENABLED=true
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=product-photos
AZURE_STORAGE_PUBLIC_BASE_URL=https://YOUR_ACCOUNT.blob.core.windows.net/product-photos
AZURE_STORAGE_MAX_UPLOAD_BYTES=8388608
```

`AZURE_STORAGE_PUBLIC_BASE_URL` must be the public base URL for blobs (no trailing slash). Example:

`https://mystorephotos.blob.core.windows.net/product-photos`

## 4. Frontend (optional)

If the API is on a different host than the browser app, set in `frontend/.env`:

```env
VITE_PRODUCT_MEDIA_BASE_URL=https://YOUR_ACCOUNT.blob.core.windows.net/product-photos
```

If omitted, the dashboard loads `GET /api/products/media/config` after sign-in.

## 5. CORS (dashboard uploads)

If the browser reports CORS errors when loading images from Azure (uncommon for `<img src>`), configure CORS on the storage account:

- **Allowed origins**: your Vite dev URL and production SPA URL (e.g. `http://localhost:5173`)
- **Allowed methods**: GET, HEAD
- **Allowed headers**: `*`

Uploads go through your API, not directly to Azure from the browser.

## 6. Verify

1. Restart the backend after changing `.env`.
2. Sign in to the dashboard → **Products** → create or edit a product.
3. Upload a JPEG/PNG/WebP (max 8 MB). You should see a spinner, then a thumbnail preview.
4. Save the product. Open the blob container in Azure Portal and confirm a file under `products/.../*.webp`.
5. Remove a photo in the form and save — the blob should be deleted from Azure when it is no longer referenced.

## 7. Local dev without Azure

Set `AZURE_STORAGE_ENABLED=false` in `backend/.env`. Upload endpoints return `503` with a clear message; you can still save products without photos.

## Security notes

- Do not commit `backend/.env` or connection strings to Git.
- Use a dedicated container for product photos only.
- Rotate storage account keys if they are exposed.
- For production, consider Azure CDN in front of the container and point `AZURE_STORAGE_PUBLIC_BASE_URL` at the CDN origin.

## Local notes (gitignored)

Copy this file to `guide/azure-product-photos-setup.local.md` and add account-specific values. That path is listed in `.gitignore`.
