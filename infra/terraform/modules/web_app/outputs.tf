output "name" {
  value = azurerm_container_app.web.name
}

output "id" {
  value = azurerm_container_app.web.id
}

output "fqdn" {
  value = azurerm_container_app.web.ingress[0].fqdn
}

output "url" {
  value = "https://${azurerm_container_app.web.ingress[0].fqdn}"
}
