output "resource_group_name" {
  value = module.resource_group.name
}

output "acr_name" {
  value       = var.create_acr ? module.acr[0].name : null
  description = "Null when create_acr = false (GHCR showcase profile)."
}

output "acr_login_server" {
  value = var.create_acr ? module.acr[0].login_server : null
}

output "acr_id" {
  value = var.create_acr ? module.acr[0].id : null
}

output "create_acr" {
  value = var.create_acr
}
