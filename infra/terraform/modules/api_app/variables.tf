variable "name" {
  type    = string
  default = "api"
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "container_app_environment_id" {
  type = string
}

variable "acr_id" {
  type = string
}

variable "acr_login_server" {
  type = string
}

variable "image" {
  type        = string
  description = "Full image reference, e.g. myacr.azurecr.io/multi-store-api:staging"
}

variable "secrets" {
  type        = map(string)
  sensitive   = true
  description = "Secret name => value for Container App secrets."
  default     = {}
}

variable "env_vars" {
  type = map(object({
    value       = optional(string)
    secret_name = optional(string)
  }))
  description = "Plain and secret-ref environment variables."
  default     = {}
}

variable "min_replicas" {
  type    = number
  default = 1
}

variable "max_replicas" {
  type    = number
  default = 3
}

variable "cpu" {
  type    = number
  default = 0.5
}

variable "memory" {
  type    = string
  default = "1Gi"
}

variable "tags" {
  type    = map(string)
  default = {}
}
