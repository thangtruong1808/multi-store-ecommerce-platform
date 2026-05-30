resource "azurerm_container_app" "postgres" {
  name                         = var.name
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  secret {
    name  = "postgres-password"
    value = var.postgres_password
  }

  template {
    min_replicas = 1
    max_replicas = 1

    volume {
      name         = "postgres-data"
      storage_type = "AzureFile"
      storage_name = var.storage_mount_name
    }

    container {
      name   = "postgres"
      image  = "docker.io/library/postgres:16-alpine"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      env {
        name  = "POSTGRES_USER"
        value = var.postgres_user
      }

      env {
        name  = "POSTGRES_DB"
        value = var.postgres_db
      }

      volume_mounts {
        name = "postgres-data"
        path = "/var/lib/postgresql/data"
      }
    }
  }

  ingress {
    external_enabled = false
    target_port      = 5432
    transport        = "tcp"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = var.tags
}
