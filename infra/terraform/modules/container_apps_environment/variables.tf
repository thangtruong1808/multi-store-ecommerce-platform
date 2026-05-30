variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "storage_mount_name" {
  type    = string
  default = "postgres-volume"
}

variable "storage_account_name" {
  type = string
}

variable "file_share_name" {
  type = string
}

variable "storage_access_key" {
  type      = string
  sensitive = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
