variable "name" {
  type        = string
  description = "Resource group name."
}

variable "location" {
  type        = string
  description = "Azure region (used when creating a new resource group)."
}

variable "use_existing" {
  type        = bool
  default     = false
  description = "When true, reference an existing resource group instead of creating one."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags (applied only when creating a new resource group)."
}
