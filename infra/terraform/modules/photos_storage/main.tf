resource "azurerm_storage_account" "photos" {
  name                     = var.name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = var.replication_type
  tags                     = var.tags
}

# Public blob access so product photo URLs work without SAS tokens.
resource "azurerm_storage_container" "photos" {
  name                  = var.container_name
  storage_account_id    = azurerm_storage_account.photos.id
  container_access_type = "blob"
}
