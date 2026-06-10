output "name" {
  value = azurerm_storage_account.photos.name
}

output "id" {
  value = azurerm_storage_account.photos.id
}

output "container_name" {
  value = azurerm_storage_container.photos.name
}

output "primary_connection_string" {
  value     = azurerm_storage_account.photos.primary_connection_string
  sensitive = true
}

output "public_base_url" {
  value       = "https://${azurerm_storage_account.photos.name}.blob.core.windows.net/${azurerm_storage_container.photos.name}"
  description = "Public URL prefix for product photo blobs."
}
