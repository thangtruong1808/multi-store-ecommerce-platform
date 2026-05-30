output "id" {
  value = azurerm_container_app_environment.this.id
}

output "default_domain" {
  value = azurerm_container_app_environment.this.default_domain
}

output "storage_mount_name" {
  value = azurerm_container_app_environment_storage.postgres.name
}
