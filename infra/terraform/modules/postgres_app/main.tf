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
      # postgres:16-alpine uid/gid 70; dir_mode 0700 required by Postgres (rejects 0777 on PGDATA).
      mount_options = "uid=70,gid=70,nobrl,mfsymlinks,cache=none,dir_mode=0700,file_mode=0600"
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

      # Dedicated mount path — /var/lib/postgresql/data conflicts with the image layer on ACA Azure Files.
      env {
        name  = "PGDATA"
        value = "/mnt/postgres-data"
      }

      volume_mounts {
        name = "postgres-data"
        path = "/mnt/postgres-data"
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
