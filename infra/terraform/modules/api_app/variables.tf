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

variable "use_acr" {
  type        = bool
  default     = false
  description = "When true, pull from ACR with managed identity. When false, use a public image (e.g. GHCR)."
}

variable "acr_id" {
  type    = string
  default = ""
}

variable "acr_login_server" {
  type    = string
  default = ""
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
  default = 0
}

variable "max_replicas" {
  type    = number
  default = 1
}

variable "cpu" {
  type    = number
  default = 0.25
}

variable "memory" {
  type    = string
  default = "0.5Gi"
}

variable "liveness_probe_initial_delay" {
  type        = number
  default     = 60
  description = "Extra delay for cold start after scale-from-zero (Postgres warmup)."
}

variable "readiness_probe_initial_delay" {
  type    = number
  default = 45
}

variable "tags" {
  type    = map(string)
  default = {}
}
