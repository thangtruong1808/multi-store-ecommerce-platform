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

output "postgres_image" {
  value       = local.postgres_image
  description = "Image reference used by the Postgres Container App (Azure Files compatible)."
}
