resource "azurerm_user_assigned_identity" "web" {
  count               = var.use_acr ? 1 : 0
  name                = "${var.name}-identity"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_role_assignment" "acr_pull" {
  count                = var.use_acr ? 1 : 0
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.web[0].principal_id
}

resource "azurerm_container_app" "web" {
  name                         = var.name
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  dynamic "identity" {
    for_each = var.use_acr ? [1] : []
    content {
      type         = "UserAssigned"
      identity_ids = [azurerm_user_assigned_identity.web[0].id]
    }
  }

  dynamic "registry" {
    for_each = var.use_acr ? [1] : []
    content {
      server   = var.acr_login_server
      identity = azurerm_user_assigned_identity.web[0].id
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "web"
      image  = var.image
      cpu    = var.cpu
      memory = var.memory
    }
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = var.tags
}
