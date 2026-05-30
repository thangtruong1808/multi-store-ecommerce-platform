variable "name" {
  type    = string
  default = "postgres"
}

variable "resource_group_name" {
  type = string
}

variable "container_app_environment_id" {
  type = string
}

variable "storage_mount_name" {
  type = string
}

variable "postgres_user" {
  type    = string
  default = "postgres"
}

variable "postgres_db" {
  type    = string
  default = "MULTIPLY"
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "environment_default_domain" {
  type        = string
  description = "Container Apps environment default domain suffix."
}

variable "tags" {
  type    = map(string)
  default = {}
}
