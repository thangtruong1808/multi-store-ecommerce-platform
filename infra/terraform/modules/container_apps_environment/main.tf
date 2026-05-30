resource "azurerm_container_app_environment" "this" {
  name                       = var.name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id
  tags                       = var.tags
}

resource "azurerm_container_app_environment_storage" "postgres" {
  name                         = var.storage_mount_name
  container_app_environment_id = azurerm_container_app_environment.this.id
  account_name                 = var.storage_account_name
  share_name                   = var.file_share_name
  access_key                   = var.storage_access_key
  access_mode                  = "ReadWrite"
}
