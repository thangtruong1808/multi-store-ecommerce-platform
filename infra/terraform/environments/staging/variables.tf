variable "environment" {
  type    = string
  default = "staging"
}

variable "resource_group_name" {
  type    = string
  default = "multi-store-ecommerce-rg"
}

variable "location" {
  type    = string
  default = "australiacentral"
}

variable "use_existing_resource_group" {
  type        = bool
  default     = true
  description = "Use the existing Azure resource group instead of creating a new one."
}

variable "use_acr" {
  type        = bool
  default     = false
  description = "When false, pull public images from GHCR (no ACR cost)."
}

variable "acr_name" {
  type    = string
  default = ""

  validation {
    condition     = !var.use_acr || length(var.acr_name) > 0
    error_message = "acr_name must be set when use_acr is true."
  }
}

variable "acr_resource_group_name" {
  type    = string
  default = "multi-store-ecommerce-rg"
}

variable "ghcr_owner" {
  type        = string
  default     = "thangtruong1808"
  description = "GitHub user/org for ghcr.io/<owner>/multi-store-api:<tag> images."
}

variable "api_image_override" {
  type        = string
  default     = ""
  description = "Optional full image ref; overrides ghcr.io default when use_acr = false."
}

variable "web_image_override" {
  type    = string
  default = ""
}

variable "aca_min_replicas" {
  type        = number
  default     = 0
  description = "Idle min replicas (0 = scale to zero outside showcase hours)."
}

variable "aca_max_replicas" {
  type    = number
  default = 1
}

variable "postgres_file_share_quota_gb" {
  type    = number
  default = 10
}

variable "enable_aca_weekday_schedule" {
  type        = bool
  default     = true
  description = "Azure Automation: start 10:00, stop 17:00 Mon–Fri (AUS Central)."
}

variable "aca_schedule_start" {
  type    = string
  default = "10:00:00"
}

variable "aca_schedule_stop" {
  type    = string
  default = "17:00:00"
}

variable "aca_schedule_timezone" {
  type    = string
  default = "AUS Central Standard Time"
}

variable "aca_scheduled_min_replicas" {
  type    = number
  default = 1
}

variable "automation_name_prefix" {
  type    = string
  default = "aa-multistore-staging"
}

variable "log_analytics_name" {
  type    = string
  default = "law-multistore-staging"
}

variable "storage_account_name" {
  type        = string
  description = "Globally unique storage account name for postgres file share."
}

variable "container_apps_environment_name" {
  type    = string
  default = "cae-multistore-staging"
}

variable "image_tag" {
  type        = string
  default     = "staging"
  description = "ACR tag for api and web images."
}

variable "postgres_user" {
  type    = string
  default = "postgres"
}

variable "postgres_db" {
  type    = string
  default = "MULTIPLY"
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "aspnetcore_environment" {
  type    = string
  default = "Staging"
}

variable "cors_allowed_origins" {
  type        = string
  description = "Web storefront URL (https)."
}

variable "public_app_base_url" {
  type        = string
  description = "Web storefront URL (https)."
}

variable "maintenance_mode" {
  type    = bool
  default = false
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "jwt_issuer" {
  type    = string
  default = "multi-store-ecommerce-platform-api"
}

variable "jwt_audience" {
  type    = string
  default = "multi-store-ecommerce-platform-client"
}

variable "jwt_access_token_minutes" {
  type    = number
  default = 15
}

variable "jwt_refresh_token_days" {
  type    = number
  default = 7
}

variable "auth_cookie_secure" {
  type    = bool
  default = true
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "stripe_publishable_key" {
  type    = string
  default = ""
}

variable "azure_storage_enabled" {
  type    = bool
  default = true
}

variable "azure_storage_connection_string" {
  type      = string
  sensitive = true
  default   = ""
}

variable "azure_storage_container_name" {
  type    = string
  default = "product-photos"
}

variable "azure_storage_public_base_url" {
  type    = string
  default = ""
}

variable "azure_storage_max_upload_bytes" {
  type    = number
  default = 8388608
}

variable "create_blob_container" {
  type    = bool
  default = false
}

variable "acs_email_enabled" {
  type    = bool
  default = false
}

variable "acs_email_connection_string" {
  type      = string
  sensitive = true
  default   = ""
}

variable "acs_email_sender_address" {
  type    = string
  default = "DoNotReply@example.com"
}

variable "password_reset_token_minutes" {
  type    = number
  default = 30
}

variable "contact_form_to_email" {
  type    = string
  default = ""
}

variable "tags" {
  type = map(string)
  default = {
    project    = "multi-store"
    managed_by = "terraform"
  }
}
