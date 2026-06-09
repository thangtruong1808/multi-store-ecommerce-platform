# Terraform modules — beginner guide

This folder holds **reusable building blocks** for Azure infrastructure in this repo. You do **not** run `terraform apply` here directly. You apply from an **environment** folder (`environments/staging`, `environments/production`, or optional `environments/shared`).

For bootstrap, apply order, and cost profile, see the [parent README](../README.md).

---

## Mental model (like application code)

| Terraform module | Similar to in code |
|------------------|-------------------|
| `variables.tf` | Function parameters / constructor args |
| `main.tf` | Function body — creates Azure resources |
| `outputs.tf` | Return values for callers or other modules |
| `environments/staging/main.tf` | Code that **calls** the function and wires modules together |
| `terraform.tfvars` | Config file with real values (passwords, names, URLs) |
| **State file** (`staging.terraform.tfstate`) | Database of “what exists in Azure” — one file per environment, **not** one file per module |

A module is a **named, reusable package** of `.tf` files. Staging and production both call the same modules with different variable values.

---

## Folder layout in this repo

```text
modules/
├── resource_group/           # Azure resource group (or use existing)
├── log_analytics/            # Log Analytics workspace (ACA logs)
├── storage/                  # Storage account + Postgres file share (+ optional blob)
├── container_apps_environment/  # Container Apps Environment (CAE)
├── postgres_app/             # Postgres Container App
├── api_app/                  # .NET API Container App
├── web_app/                  # React web Container App
├── aca_schedule/             # Weekday Automation start/stop (optional)
└── acr/                      # Azure Container Registry (used from environments/shared)
```

Each module typically contains:

| File | Purpose |
|------|---------|
| `main.tf` | `resource "azurerm_..."` blocks — the real Azure API calls |
| `variables.tf` | Inputs the module accepts |
| `outputs.tf` | Values other modules or humans need after apply |

Some modules also have templates (e.g. `aca_schedule/runbook_*.ps1.tpl`).

---

## How staging uses modules (wiring diagram)

When you run `terraform apply` in `environments/staging`, Terraform builds resources in dependency order:

```text
terraform.tfvars  →  staging/variables.tf  →  staging/main.tf
                                                      │
    ┌─────────────────────────────────────────────────┘
    ▼
module.resource_group
    │
    ├──► module.log_analytics ──output id──► module.container_apps_environment
    ├──► module.storage ──outputs name, keys──► module.container_apps_environment
    │                                              │
    │                                              ├──► module.postgres
    │                                              ├──► module.api      (depends on postgres)
    │                                              └──► module.web       (depends on api)
    └──► module.aca_schedule (optional; scales apps Mon–Fri)
```

**Outputs flow between modules.** Example from staging:

```hcl
module "log_analytics" {
  source = "../../modules/log_analytics"
  name                = var.log_analytics_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
}

module "container_apps_environment" {
  log_analytics_workspace_id = module.log_analytics.id   # output → input
  storage_account_name       = module.storage.name
  ...
}
```

You do not duplicate `location` in every module call when it already comes from `module.resource_group.location`.

---

## State: one file per environment, not per module

Common misconception: *“Each module has its own state.”*

In this project:

| Environment | State key (in `tfstatemultistore`) |
|-------------|-------------------------------------|
| Staging | `staging.terraform.tfstate` |
| Production | `production.terraform.tfstate` |
| Shared (optional ACR) | `shared.terraform.tfstate` |

Inside that single state file, Terraform tracks every resource with an **address**, for example:

```text
module.api.azurerm_container_app.api
module.storage.azurerm_storage_account.this
module.log_analytics.azurerm_log_analytics_workspace.this
```

When you change one module, `terraform plan` shows only the resources that need updating. Modules organize **code**; they do not split state unless you deliberately use separate backends (we do not, except per environment).

---

## How to decide what variables a module needs

Use this checklist when reading or writing a module (example: `log_analytics`).

### Step 1 — Read the provider documentation

Open [Terraform Registry: azurerm_log_analytics_workspace](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace).

Note which arguments are **required** vs **optional** for Azure.

### Step 2 — Map arguments to module variables

In `log_analytics/main.tf` every non-hard-coded argument becomes a variable (or a default inside the module):

```hcl
resource "azurerm_log_analytics_workspace" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku                 # default in variables.tf
  retention_in_days   = var.retention_in_days   # default in variables.tf
  tags                = var.tags
}
```

### Step 3 — Split “environment-specific” vs “shared defaults”

| Kind | Where it lives | Example |
|------|----------------|---------|
| Different per staging/production | `environments/*/variables.tf` + `terraform.tfvars` | `log_analytics_name = "law-multistore-staging"` |
| Same for all environments | Default in `modules/*/variables.tf` | `retention_in_days = 30` |
| Comes from another module | Pass `module.xxx.output` in `staging/main.tf` | `location = module.resource_group.location` |

### Step 4 — Add outputs only when something else needs them

`log_analytics` exports `id` because `container_apps_environment` requires `log_analytics_workspace_id`. Do not output every Azure attribute — only what downstream modules or operators need.

### Step 5 — Validate

```bash
cd environments/staging
terraform validate
terraform plan
```

Missing required arguments or wrong field names fail at **plan** time. Invalid Azure values (e.g. duplicate storage account name) often fail at **apply** time.

---

## Two kinds of “names” (do not confuse them)

| Name type | Example | Who defines it |
|-----------|---------|----------------|
| **Terraform resource label** | `resource "azurerm_log_analytics_workspace" "this"` | You — used only in code and state |
| **Terraform variable name** | `var.log_analytics_name` | You — your naming convention |
| **Azure resource name** | `law-multistore-staging` | You — must follow [Azure naming rules](https://learn.microsoft.com/azure/azure-resource-manager/management/resource-name-rules) |
| **Resource argument (field)** | `location`, `resource_group_name` | **Provider schema** — typos cause plan errors |

You choose Azure names and variable names. **Argument labels** in the `resource` block must match the `azurerm` provider exactly.

---

## Module reference (this repo)

| Module | Creates | Key outputs used elsewhere |
|--------|---------|----------------------------|
| `resource_group` | Resource group | `name`, `location` |
| `log_analytics` | Log Analytics workspace | `id` → CAE |
| `storage` | Storage account, file share, optional blob | `name`, `primary_access_key`, `file_share_name` → CAE |
| `container_apps_environment` | CAE + env storage mount | `id`, `default_domain`, `storage_mount_name` → apps |
| `postgres_app` | Postgres Container App | Internal hostname `postgres` for API |
| `api_app` | API Container App | `url`, `fqdn` |
| `web_app` | Web Container App | `url`, `fqdn` |
| `aca_schedule` | Automation account, runbooks, schedules | Optional cost saving outside showcase hours |
| `acr` | Container Registry | Only when `shared/` apply with `create_acr = true` |

### Complexity comparison

| Module | Why variable count differs |
|--------|----------------------------|
| `log_analytics` | Small — one Azure resource, few knobs |
| `api_app` | Large — image, secrets map, env vars, scale, probes, ingress, optional ACR identity |

Same design rules apply; only the number of inputs grows with what you must configure.

---

## Worked example: `log_analytics` end-to-end

**1. Module variables** (`modules/log_analytics/variables.tf`) — inputs the module accepts.

**2. Module creates resource** (`modules/log_analytics/main.tf`) — calls Azure.

**3. Module outputs** (`modules/log_analytics/outputs.tf`) — `id`, `name`, etc.

**4. Staging calls module** (`environments/staging/main.tf`):

- Passes `name` from `var.log_analytics_name` (set in `terraform.tfvars`).
- Passes `resource_group_name` and `location` from `module.resource_group`.
- Does **not** pass `sku` or `retention_in_days` — module defaults apply.

**5. Downstream consumer** — `container_apps_environment` uses `module.log_analytics.id`.

---

## What you run vs what you only read

| Action | Directory |
|--------|-----------|
| `terraform init` / `plan` / `apply` | `environments/staging` or `environments/production` |
| Read / edit reusable definitions | `modules/` (usually via PR review with a senior or platform engineer) |
| Optional ACR stack | `environments/shared` — skip when using GHCR (`use_acr = false`) |

---

## Tips for interviews and day-to-day

1. **Modules = DRY** — staging and production share `api_app`; only `tfvars` differ.
2. **Plan before apply** — always read the diff; watch for unexpected destroys.
3. **Secrets stay in `terraform.tfvars`** (gitignored), never in committed `.tf` files.
4. **Provider docs are the contract** — like API documentation for Azure resources.
5. **Start minimal** — add variables when staging and production need different values (YAGNI).

---

## Further reading

- [Parent README — bootstrap, apply order, GHCR](../README.md)
- [Terraform: Module composition](https://developer.hashicorp.com/terraform/language/modules)
- [Azure RM provider docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
