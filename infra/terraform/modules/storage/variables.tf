variable "name" {
  type        = string
  description = "Storage account name (globally unique, lowercase alphanumeric)."
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "file_share_name" {
  type    = string
  default = "postgres-data"
}

variable "file_share_quota_gb" {
  type    = number
  default = 10
}

variable "create_blob_container" {
  type    = bool
  default = false
}

variable "blob_container_name" {
  type    = string
  default = "product-photos"
}

variable "replication_type" {
  type    = string
  default = "LRS"
}

variable "tags" {
  type    = map(string)
  default = {}
}
