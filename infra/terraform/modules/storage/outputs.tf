output "name" {
  value = azurerm_storage_account.this.name
}

output "id" {
  value = azurerm_storage_account.this.id
}

output "primary_access_key" {
  value     = azurerm_storage_account.this.primary_access_key
  sensitive = true
}

output "primary_connection_string" {
  value     = azurerm_storage_account.this.primary_connection_string
  sensitive = true
}

output "file_share_name" {
  value = azurerm_storage_share.postgres.name
}

output "blob_container_name" {
  value = var.create_blob_container ? azurerm_storage_container.photos[0].name : null
}
