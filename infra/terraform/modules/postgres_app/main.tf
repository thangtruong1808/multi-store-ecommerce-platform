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
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    volume {
      name          = "postgres-data"
      storage_type  = "AzureFile"
      storage_name  = var.storage_mount_name
      # postgres user in official image is uid/gid 999; SMB mounts cannot chmod at runtime.
      mount_options = "uid=999,gid=999,nobrl,mfsymlinks,cache=none,dir_mode=0750,file_mode=0750"
    }

    container {
      name   = "postgres"
      image  = var.image
      cpu    = var.cpu
      memory = var.memory

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

      # Mount Azure File at PGDATA directly — postgres cannot mkdir/chmod on SMB mount roots.
      env {
        name  = "PGDATA"
        value = "/var/lib/postgresql/data/pgdata"
      }

      volume_mounts {
        name = "postgres-data"
        path = "/var/lib/postgresql/data/pgdata"
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
