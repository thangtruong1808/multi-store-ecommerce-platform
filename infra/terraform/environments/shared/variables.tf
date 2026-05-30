variable "resource_group_name" {
  type    = string
  default = "rg-multistore-shared"
}

variable "location" {
  type    = string
  default = "australiaeast"
}

variable "acr_name" {
  type        = string
  description = "Globally unique ACR name (letters/numbers only)."
}

variable "acr_sku" {
  type    = string
  default = "Basic"
}

variable "tags" {
  type = map(string)
  default = {
    project     = "multi-store"
    managed_by  = "terraform"
    environment = "shared"
  }
}
