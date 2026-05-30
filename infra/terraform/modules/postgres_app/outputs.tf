output "name" {
  value = azurerm_container_app.postgres.name
}

output "id" {
  value = azurerm_container_app.postgres.id
}

output "internal_hostname" {
  value = "${azurerm_container_app.postgres.name}.internal.${var.environment_default_domain}"
}
