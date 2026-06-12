# Scale api/web to zero (postgres stays warm — Azure Files WAL safety).
$ErrorActionPreference = "Stop"
Connect-AzAccount -Identity | Out-Null

$subscriptionId = "${subscription_id}"
$resourceGroup  = "${resource_group_name}"
$apps           = @(${stop_apps})

function Set-ContainerAppMinReplicas {
  param([string]$AppName, [int]$Replicas)
  $uri = "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.App/containerApps/$AppName`?api-version=2024-03-01"
  $body = @{
    properties = @{
      template = @{
        scale = @{
          minReplicas = $Replicas
        }
      }
    }
  } | ConvertTo-Json -Depth 6
  $response = Invoke-AzRestMethod -Method PATCH -Uri $uri -Payload $body
  if ($response.StatusCode -ge 400) {
    throw "Failed to update $AppName minReplicas=$Replicas : $($response.Content)"
  }
  Write-Output "Set $AppName minReplicas=$Replicas"
}

foreach ($app in $apps) {
  Set-ContainerAppMinReplicas -AppName $app -Replicas 0
}

Write-Output "Stop runbook completed."
