output "name" {
  value = azurerm_container_app.api.name
}

output "id" {
  value = azurerm_container_app.api.id
}

output "fqdn" {
  value = azurerm_container_app.api.ingress[0].fqdn
}

output "url" {
  value = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "identity_principal_id" {
  value = azurerm_user_assigned_identity.api.principal_id
}
