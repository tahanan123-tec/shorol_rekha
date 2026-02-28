Write-Host "Restarting client with new configuration..." -ForegroundColor Cyan
Write-Host ""

# Stop client on port 3000
Write-Host "Stopping client on port 3000..." -ForegroundColor Yellow
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Write-Host "Client stopped" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "No client running on port 3000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting client..." -ForegroundColor Yellow
Write-Host "The client will now connect to:" -ForegroundColor Cyan
Write-Host "  - Auth API: http://localhost:3001" -ForegroundColor White
Write-Host "  - WebSocket: http://localhost:3005" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the client" -ForegroundColor Gray
Write-Host ""

Set-Location client
npm run dev
