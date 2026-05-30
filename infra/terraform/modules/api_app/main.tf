resource "azurerm_user_assigned_identity" "api" {
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
  principal_id         = azurerm_user_assigned_identity.api[0].principal_id
}

resource "azurerm_container_app" "api" {
  name                         = var.name
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  dynamic "identity" {
    for_each = var.use_acr ? [1] : []
    content {
      type         = "UserAssigned"
      identity_ids = [azurerm_user_assigned_identity.api[0].id]
    }
  }

  dynamic "registry" {
    for_each = var.use_acr ? [1] : []
    content {
      server   = var.acr_login_server
      identity = azurerm_user_assigned_identity.api[0].id
    }
  }

  dynamic "secret" {
    for_each = var.secrets
    content {
      name  = secret.key
      value = secret.value
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "api"
      image  = var.image
      cpu    = var.cpu
      memory = var.memory

      dynamic "env" {
        for_each = var.env_vars
        content {
          name        = env.key
          value       = lookup(env.value, "value", null)
          secret_name = lookup(env.value, "secret_name", null)
        }
      }

      liveness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/api/health"

        initial_delay           = var.liveness_probe_initial_delay
        interval_seconds        = 15
        timeout                 = 5
        failure_count_threshold = 3
      }

      readiness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/api/health"

        initial_delay           = var.readiness_probe_initial_delay
        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 5
        success_count_threshold = 1
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = var.tags
}
