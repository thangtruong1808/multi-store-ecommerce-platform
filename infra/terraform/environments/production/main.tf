data "azurerm_client_config" "current" {}

data "azurerm_container_registry" "shared" {
  count               = var.use_acr ? 1 : 0
  name                = var.acr_name
  resource_group_name = var.acr_resource_group_name
}

locals {
  tags = merge(var.tags, {
    environment = var.environment
  })

  ghcr_api_image      = var.api_image_override != "" ? var.api_image_override : "ghcr.io/${var.ghcr_owner}/multi-store-api:${var.image_tag}"
  ghcr_web_image      = var.web_image_override != "" ? var.web_image_override : "ghcr.io/${var.ghcr_owner}/multi-store-web:${var.image_tag}"
  ghcr_postgres_image = var.postgres_image_override != "" ? var.postgres_image_override : "ghcr.io/${var.ghcr_owner}/multi-store-postgres:${var.image_tag}"

  api_image      = var.use_acr ? "${data.azurerm_container_registry.shared[0].login_server}/multi-store-api:${var.image_tag}" : local.ghcr_api_image
  web_image      = var.use_acr ? "${data.azurerm_container_registry.shared[0].login_server}/multi-store-web:${var.image_tag}" : local.ghcr_web_image
  postgres_image = local.ghcr_postgres_image

  acr_id           = var.use_acr ? data.azurerm_container_registry.shared[0].id : ""
  acr_login_server = var.use_acr ? data.azurerm_container_registry.shared[0].login_server : ""

  connection_string = "Host=postgres;Port=5432;Database=${var.postgres_db};Username=${var.postgres_user};Password=${var.postgres_password}"

  acs_email_configured = var.acs_email_enabled && var.acs_email_connection_string != ""

  api_secrets = merge({
    db-connection-string            = local.connection_string
    jwt-secret                      = var.jwt_secret
    stripe-secret-key               = var.stripe_secret_key
    stripe-webhook-secret           = var.stripe_webhook_secret
    azure-storage-connection-string = var.azure_storage_connection_string
    }, local.acs_email_configured ? {
    acs-email-connection-string = var.acs_email_connection_string
  } : {})

  api_env = merge({
    ASPNETCORE_ENVIRONMENT          = { value = var.aspnetcore_environment }
    ASPNETCORE_URLS                 = { value = "http://+:8080" }
    ConnectionStrings__Default      = { secret_name = "db-connection-string" }
    CORS_ALLOWED_ORIGINS            = { value = var.cors_allowed_origins }
    PUBLIC_APP_BASE_URL             = { value = var.public_app_base_url }
    MAINTENANCE_MODE                = { value = tostring(var.maintenance_mode) }
    JWT_SECRET                      = { secret_name = "jwt-secret" }
    JWT_ISSUER                      = { value = var.jwt_issuer }
    JWT_AUDIENCE                    = { value = var.jwt_audience }
    JWT_ACCESS_TOKEN_MINUTES        = { value = tostring(var.jwt_access_token_minutes) }
    JWT_REFRESH_TOKEN_DAYS          = { value = tostring(var.jwt_refresh_token_days) }
    AUTH_COOKIE_SECURE              = { value = tostring(var.auth_cookie_secure) }
    STRIPE_SECRET_KEY               = { secret_name = "stripe-secret-key" }
    STRIPE_WEBHOOK_SECRET           = { secret_name = "stripe-webhook-secret" }
    STRIPE_PUBLISHABLE_KEY          = { value = var.stripe_publishable_key }
    AZURE_STORAGE_ENABLED           = { value = tostring(var.azure_storage_enabled) }
    AZURE_STORAGE_CONNECTION_STRING = { secret_name = "azure-storage-connection-string" }
    AZURE_STORAGE_CONTAINER_NAME    = { value = var.azure_storage_container_name }
    AZURE_STORAGE_PUBLIC_BASE_URL   = { value = var.azure_storage_public_base_url }
    AZURE_STORAGE_MAX_UPLOAD_BYTES  = { value = tostring(var.azure_storage_max_upload_bytes) }
    ACS_EMAIL_ENABLED               = { value = tostring(var.acs_email_enabled) }
    ACS_EMAIL_SENDER_ADDRESS        = { value = var.acs_email_sender_address }
    PASSWORD_RESET_TOKEN_MINUTES    = { value = tostring(var.password_reset_token_minutes) }
    CONTACT_FORM_TO_EMAIL           = { value = var.contact_form_to_email }
    }, local.acs_email_configured ? {
    ACS_EMAIL_CONNECTION_STRING = { secret_name = "acs-email-connection-string" }
  } : {
    ACS_EMAIL_CONNECTION_STRING = { value = "" }
  })
}

module "resource_group" {
  source = "../../modules/resource_group"

  name         = var.resource_group_name
  location     = var.location
  use_existing = var.use_existing_resource_group
  tags         = local.tags
}

module "log_analytics" {
  source = "../../modules/log_analytics"

  name                = var.log_analytics_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  tags                = local.tags
}

module "storage" {
  source = "../../modules/storage"

  name                  = var.storage_account_name
  resource_group_name   = module.resource_group.name
  location              = module.resource_group.location
  file_share_quota_gb   = var.postgres_file_share_quota_gb
  create_blob_container = var.create_blob_container
  blob_container_name   = var.azure_storage_container_name
  tags                  = local.tags
}

module "container_apps_environment" {
  source = "../../modules/container_apps_environment"

  name                       = var.container_apps_environment_name
  resource_group_name        = module.resource_group.name
  location                   = var.aca_location
  log_analytics_workspace_id = module.log_analytics.id
  storage_account_name       = module.storage.name
  file_share_name            = module.storage.file_share_name
  storage_access_key         = module.storage.primary_access_key
  tags                       = local.tags
}

module "postgres" {
  source = "../../modules/postgres_app"

  name                         = "postgres"
  resource_group_name          = module.resource_group.name
  container_app_environment_id = module.container_apps_environment.id
  storage_mount_name           = module.container_apps_environment.storage_mount_name
  postgres_user                = var.postgres_user
  postgres_db                  = var.postgres_db
  postgres_password            = var.postgres_password
  image                        = local.postgres_image
  environment_default_domain   = module.container_apps_environment.default_domain
  min_replicas                 = var.aca_min_replicas
  max_replicas                 = 1
  cpu                          = 0.5
  memory                       = "1Gi"
  tags                         = local.tags
}

module "api" {
  source = "../../modules/api_app"

  name                         = "api"
  resource_group_name          = module.resource_group.name
  location                     = module.resource_group.location
  container_app_environment_id = module.container_apps_environment.id
  use_acr                      = var.use_acr
  acr_id                       = local.acr_id
  acr_login_server             = local.acr_login_server
  image                        = local.api_image
  secrets                      = local.api_secrets
  env_vars                     = local.api_env
  min_replicas                 = var.aca_min_replicas
  max_replicas                 = var.aca_max_replicas
  tags                         = local.tags

  depends_on = [module.postgres]
}

module "web" {
  source = "../../modules/web_app"

  name                         = "web"
  resource_group_name          = module.resource_group.name
  location                     = module.resource_group.location
  container_app_environment_id = module.container_apps_environment.id
  use_acr                      = var.use_acr
  acr_id                       = local.acr_id
  acr_login_server             = local.acr_login_server
  image                        = local.web_image
  min_replicas                 = var.aca_min_replicas
  max_replicas                 = var.aca_max_replicas
  tags                         = local.tags

  depends_on = [module.api]
}

module "aca_schedule" {
  source = "../../modules/aca_schedule"

  name_prefix                     = var.automation_name_prefix
  resource_group_name             = module.resource_group.name
  location                        = module.resource_group.location
  subscription_id                 = data.azurerm_client_config.current.subscription_id
  enabled                         = var.enable_aca_weekday_schedule
  container_app_names_start_order = ["postgres", "api", "web"]
  container_app_names_stop_order  = ["web", "api", "postgres"]
  weekday_start_time              = var.aca_schedule_start
  weekday_stop_time               = var.aca_schedule_stop
  timezone                        = var.aca_schedule_timezone
  schedule_utc_offset             = var.aca_schedule_utc_offset
  scheduled_min_replicas          = var.aca_scheduled_min_replicas
  tags                            = local.tags
}
