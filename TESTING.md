# Testing guide

Tests are organized by **feature folders** (for example `Users/`, `Products/`, `System/`) so you can find CRUD, validation, and API scenarios quickly.

## Backend

| Project | Path | Purpose |
|---------|------|---------|
| Unit | `backend.UnitTests/Unit/` | Pure logic (media keys, checkout line items, roles) |
| Integration | `backend.IntegrationTests/Integration/` | HTTP tests via `WebApplicationFactory` |

### Commands

```bash
# Unit tests
dotnet test backend.UnitTests/backend.UnitTests.csproj

# Integration (CI scope: health + validation, no DB schema)
dotnet test backend.IntegrationTests/backend.IntegrationTests.csproj \
  --filter "Category=Integration&Category!=IntegrationDb"

# Full DB integration (local docker compose + schema)
export RUN_INTEGRATION_DB=true
export ConnectionStrings__Default="Host=localhost;Port=5433;Database=MULTIPLY;Username=postgres;Password=change-me"
dotnet test backend.IntegrationTests/backend.IntegrationTests.csproj \
  --filter "Category=IntegrationDb"
```

### Feature folders (backend)

- `System/` — health API, `ProductStoreScope` role helpers
- `Users/` — register/login validation, BCrypt, duplicate email (IntegrationDb)
- `Products/` — product/avatar media key rules
- `Categories/` — category image key rules
- `Checkout/` — Stripe line item cent allocation
- `Vouchers/` — voucher dashboard role helpers

## Frontend

| Path | Tool |
|------|------|
| `frontend/tests/` | Vitest + Testing Library (jsdom) |

### Commands

```bash
cd frontend
npm run test        # watch mode
npm run test:run    # CI / single run
```

### Feature folders (frontend)

- `System/` — `healthApi`, `useSystemHealth`
- `Users/` — `authConstants`, `RouteGuards` (dashboard access behavior)
- `Products/` — `productFormValidation`, `productMediaUrl`
- `Checkout/` — `checkoutEligibility` (mocked fetch)
- `Dashboard/` — `chartFormatUtils`

## CI (GitHub Actions)

On every push/PR to `develop` or `main`, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs:

1. Backend build  
2. Backend unit tests  
3. Backend integration tests (Postgres service; health + auth validation only)  
4. Frontend typecheck + lint  
5. Frontend unit tests  
6. Docker smoke build (after all tests pass)

Failed jobs appear as red checks on the commit/PR (GitHub notifications use your account settings).

## Adding tests for a new feature

1. Create a subfolder under `backend.UnitTests/Unit/<Feature>/` and/or `backend.IntegrationTests/Integration/<Feature>/`.
2. Add matching tests under `frontend/tests/<Feature>/`.
3. Use traits for integration scope:
   - `[Trait("Category", "Integration")]` — runs in CI (no schema)
   - `[Trait("Category", "IntegrationDb")]` — local only unless `RUN_INTEGRATION_DB=true`
4. Open a PR; CI must pass before merge.

## Notes

- `backend/Program.cs` skips loading `backend/.env` when `ASPNETCORE_ENVIRONMENT=Testing` so integration tests do not pick up local secrets.
- Full database schema lives under gitignored `database/`; use docker compose for IntegrationDb tests.
