output "automation_account_name" {
  value       = var.enabled ? azurerm_automation_account.this[0].name : null
  description = "Azure Automation account running weekday start/stop runbooks."
}

output "weekday_start_time" {
  value = var.weekday_start_time
}

output "weekday_stop_time" {
  value = var.weekday_stop_time
}

output "timezone" {
  value = var.timezone
}
