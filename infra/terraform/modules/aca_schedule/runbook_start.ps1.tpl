# Scale Container Apps up for showcase hours (order: postgres -> api -> web).
$ErrorActionPreference = "Stop"
Connect-AzAccount -Identity | Out-Null

$subscriptionId = "${subscription_id}"
$resourceGroup  = "${resource_group_name}"
$minReplicas    = ${scheduled_min_replicas}
$warmupSeconds  = ${postgres_warmup_seconds}
$apps           = @(${start_apps})

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

$index = 0
foreach ($app in $apps) {
  Set-ContainerAppMinReplicas -AppName $app -Replicas $minReplicas
  if ($index -eq 0 -and $apps.Count -gt 1) {
    Start-Sleep -Seconds $warmupSeconds
  }
  $index++
}

Write-Output "Start runbook completed."
