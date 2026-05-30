# Remove scheduled task (no longer needed - auto-refresh on 401)
$taskName = "MiMo-HUD-RefreshCookie"

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Write-Host "Removed scheduled task: $taskName"
Write-Host ""
Write-Host "Cookie will now auto-refresh when expired (401 detected)"
Write-Host "Browser will open for manual login when needed"
