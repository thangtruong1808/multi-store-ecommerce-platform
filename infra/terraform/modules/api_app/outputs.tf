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
  value       = var.use_acr ? azurerm_user_assigned_identity.api[0].principal_id : null
  description = "Null when use_acr is false (GHCR public pull)."
}
