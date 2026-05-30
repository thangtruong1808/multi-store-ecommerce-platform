module "resource_group" {
  source = "../../modules/resource_group"

  name         = var.resource_group_name
  location     = var.location
  use_existing = var.use_existing_resource_group
  tags         = var.tags
}

module "acr" {
  count  = var.create_acr ? 1 : 0
  source = "../../modules/acr"

  name                = var.acr_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  sku                 = var.acr_sku
  admin_enabled       = true
  tags                = var.tags
}
