locals {
  start_apps = join(", ", [for a in var.container_app_names_start_order : "\"${a}\""])
  stop_apps  = join(", ", [for a in var.container_app_names_stop_order : "\"${a}\""])

  start_runbook_content = templatefile("${path.module}/runbook_start.ps1.tpl", {
    subscription_id         = var.subscription_id
    resource_group_name     = var.resource_group_name
    scheduled_min_replicas  = var.scheduled_min_replicas
    postgres_warmup_seconds = var.postgres_warmup_seconds
    start_apps              = local.start_apps
  })

  stop_runbook_content = templatefile("${path.module}/runbook_stop.ps1.tpl", {
    subscription_id     = var.subscription_id
    resource_group_name = var.resource_group_name
    stop_apps           = local.stop_apps
  })

  # azurerm_automation_schedule.start_time requires RFC3339 with offset (azurerm provider 4.x).
  schedule_start = "${var.schedule_anchor_date}T${var.weekday_start_time}${var.schedule_utc_offset}"
  schedule_stop  = "${var.schedule_anchor_date}T${var.weekday_stop_time}${var.schedule_utc_offset}"
}

resource "azurerm_automation_account" "this" {
  count               = var.enabled ? 1 : 0
  name                = substr(replace("${var.name_prefix}-aca-schedule", "_", "-"), 0, 50)
  location            = var.location
  resource_group_name = var.resource_group_name
  sku_name            = "Free"

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

resource "azurerm_role_assignment" "automation_contributor" {
  count                = var.enabled ? 1 : 0
  scope                = "/subscriptions/${var.subscription_id}/resourceGroups/${var.resource_group_name}"
  role_definition_name = "Contributor"
  principal_id         = azurerm_automation_account.this[0].identity[0].principal_id
}

resource "azurerm_automation_runbook" "start" {
  count                   = var.enabled ? 1 : 0
  name                    = "aca-weekday-start"
  location                = var.location
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.this[0].name
  log_verbose             = true
  log_progress            = true
  runbook_type            = "PowerShell"
  content                 = local.start_runbook_content
}

resource "azurerm_automation_runbook" "stop" {
  count                   = var.enabled ? 1 : 0
  name                    = "aca-weekday-stop"
  location                = var.location
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.this[0].name
  log_verbose             = true
  log_progress            = true
  runbook_type            = "PowerShell"
  content                 = local.stop_runbook_content
}

resource "azurerm_automation_schedule" "weekday_start" {
  count                   = var.enabled ? 1 : 0
  name                    = "aca-weekday-start-1000"
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.this[0].name
  frequency               = "Week"
  interval                = 1
  timezone                = var.timezone
  week_days               = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  start_time              = local.schedule_start
  description             = "Scale Container Apps up for showcase hours."
}

resource "azurerm_automation_schedule" "weekday_stop" {
  count                   = var.enabled ? 1 : 0
  name                    = "aca-weekday-stop-1700"
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.this[0].name
  frequency               = "Week"
  interval                = 1
  timezone                = var.timezone
  week_days               = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  start_time              = local.schedule_stop
  description             = "Scale Container Apps to zero outside showcase hours."
}

resource "azurerm_automation_job_schedule" "start" {
  count                   = var.enabled ? 1 : 0
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.this[0].name
  schedule_name           = azurerm_automation_schedule.weekday_start[0].name
  runbook_name            = azurerm_automation_runbook.start[0].name
}

resource "azurerm_automation_job_schedule" "stop" {
  count                   = var.enabled ? 1 : 0
  resource_group_name     = var.resource_group_name
  automation_account_name = azurerm_automation_account.this[0].name
  schedule_name           = azurerm_automation_schedule.weekday_stop[0].name
  runbook_name            = azurerm_automation_runbook.stop[0].name
}
