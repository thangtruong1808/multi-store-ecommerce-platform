variable "name" {
  type    = string
  default = "web"
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
  type    = bool
  default = false
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
  type = string
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

variable "tags" {
  type    = map(string)
  default = {}
}
