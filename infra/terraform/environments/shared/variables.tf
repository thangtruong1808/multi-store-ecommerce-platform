variable "resource_group_name" {
  type    = string
  default = "multi-store-ecommerce-rg"
}

variable "location" {
  type    = string
  default = "australiacentral"
}

variable "use_existing_resource_group" {
  type        = bool
  default     = true
  description = "Use the existing Azure resource group (multi-store-ecommerce-rg) instead of creating a new one."
}

variable "create_acr" {
  type        = bool
  default     = false
  description = "When false, skip ACR (~AU$8/mo). Use GHCR for images instead (recommended for showcase)."
}

variable "acr_name" {
  type        = string
  default     = ""
  description = "Globally unique ACR name (required when create_acr = true)."

  validation {
    condition     = !var.create_acr || length(var.acr_name) > 0
    error_message = "acr_name must be set when create_acr is true."
  }
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
