data "azurerm_resource_group" "existing" {
  count = var.use_existing ? 1 : 0
  name  = var.name
}

resource "azurerm_resource_group" "this" {
  count    = var.use_existing ? 0 : 1
  name     = var.name
  location = var.location
  tags     = var.tags
}

locals {
  name     = var.use_existing ? data.azurerm_resource_group.existing[0].name : azurerm_resource_group.this[0].name
  location = var.use_existing ? data.azurerm_resource_group.existing[0].location : azurerm_resource_group.this[0].location
  id       = var.use_existing ? data.azurerm_resource_group.existing[0].id : azurerm_resource_group.this[0].id
}
