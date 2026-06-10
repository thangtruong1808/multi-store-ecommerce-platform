output "resource_group_name" {
  value = module.resource_group.name
}

output "api_url" {
  value = module.api.url
}

output "web_url" {
  value = module.web.url
}

output "api_fqdn" {
  value = module.api.fqdn
}

output "web_fqdn" {
  value = module.web.fqdn
}

output "container_apps_environment_id" {
  value = module.container_apps_environment.id
}

output "api_image" {
  value       = local.api_image
  description = "Image reference used by the API Container App (GHCR when use_acr = false)."
}

output "web_image" {
  value = local.web_image
}

output "postgres_image" {
  value       = local.postgres_image
  description = "Image reference used by the Postgres Container App (Azure Files compatible)."
}

output "showcase_hours" {
  value = var.enable_aca_weekday_schedule ? "${var.aca_schedule_start}-${var.aca_schedule_stop} Mon-Fri (${var.aca_schedule_timezone})" : "disabled — use scripts/aca-start.sh"
}

output "automation_account_name" {
  value = module.aca_schedule.automation_account_name
}

output "photos_public_base_url" {
  value       = var.create_photos_storage ? module.photos_storage[0].public_base_url : var.azure_storage_public_base_url
  description = "Product photo URL prefix (use for VITE_PRODUCT_MEDIA_BASE_URL)."
}
