variable "name" {
  type        = string
  description = "Storage account name for product photos (globally unique, lowercase alphanumeric)."
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "container_name" {
  type        = string
  default     = "product-photos"
  description = "Blob container holding product photos (public blob access)."
}

variable "replication_type" {
  type    = string
  default = "LRS"
}

variable "tags" {
  type    = map(string)
  default = {}
}
