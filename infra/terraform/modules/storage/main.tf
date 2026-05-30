resource "azurerm_storage_account" "this" {
  name                     = var.name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = var.replication_type
  tags                     = var.tags
}

resource "azurerm_storage_share" "postgres" {
  name                 = var.file_share_name
  storage_account_id = azurerm_storage_account.this.id
  quota                = var.file_share_quota_gb
}

resource "azurerm_storage_container" "photos" {
  count                 = var.create_blob_container ? 1 : 0
  name                  = var.blob_container_name
  storage_account_name  = azurerm_storage_account.this.name
  container_access_type = "blob"
}
