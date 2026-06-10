# Postgres image for Azure Container Apps + Azure Files

Official `postgres:16-alpine` runs `initdb` with `chmod` on `PGDATA`. Azure Files (SMB) does not allow that.

This image:

1. Runs `initdb` on `/tmp` (local disk)
2. Copies the cluster to `PGDATA` on the Azure File mount
3. Starts Postgres with `fsync=off` (required for SMB runtime)

Published as `ghcr.io/<owner>/multi-store-postgres:<tag>` by deploy workflows.

**First deploy:** build and push once (or merge to `develop` so GitHub Actions pushes the image), then set the GHCR package **Public** for ACA pull.

```bash
docker build -t ghcr.io/YOUR_OWNER/multi-store-postgres:staging .
docker push ghcr.io/YOUR_OWNER/multi-store-postgres:staging
```

Local docker compose still uses stock `postgres:16-alpine` with a named volume (no SMB).
