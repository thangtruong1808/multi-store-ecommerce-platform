variable "name_prefix" {
  type        = string
  description = "Prefix for Automation account and runbooks."
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "subscription_id" {
  type = string
}

variable "enabled" {
  type        = bool
  default     = true
  description = "When false, no Automation resources are created (manual start/stop scripts only)."
}

variable "container_app_names_start_order" {
  type        = list(string)
  description = "Apps to start in order (e.g. postgres before api)."
}

variable "container_app_names_stop_order" {
  type        = list(string)
  description = "Apps to stop in order (e.g. web before postgres)."
}

variable "weekday_start_time" {
  type        = string
  default     = "10:00:00"
  description = "Local time HH:MM:SS when apps scale up (Mon–Fri)."
}

variable "weekday_stop_time" {
  type        = string
  default     = "17:00:00"
  description = "Local time HH:MM:SS when apps scale to zero (Mon–Fri)."
}

variable "timezone" {
  type        = string
  default     = "Australia/Darwin"
  description = "IANA timezone for Azure Automation schedule (australiacentral ≈ Australia/Darwin, UTC+9:30)."
}

variable "schedule_utc_offset" {
  type        = string
  default     = "+09:30"
  description = "RFC3339 offset appended to weekday_start_time / weekday_stop_time (match timezone)."
}

variable "scheduled_min_replicas" {
  type        = number
  default     = 1
  description = "minReplicas while showcase hours are active."
}

variable "schedule_anchor_date" {
  type        = string
  default     = "2026-06-02"
  description = "ISO date used only to anchor weekly schedules (must be valid; time-of-day matters)."
}

variable "postgres_warmup_seconds" {
  type        = number
  default     = 45
  description = "Pause after starting postgres before starting api/web."
}

variable "tags" {
  type    = map(string)
  default = {}
}
