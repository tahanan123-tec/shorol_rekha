Write-Host "Stopping all services..." -ForegroundColor Cyan
Write-Host ""

# Kill Node.js processes on specific ports
$ports = @(3000, 3001, 3002, 3003, 3004, 3005, 3007, 3008, 3100)

foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Write-Host "Stopping process on port $port (PID: $process)" -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "All services stopped!" -ForegroundColor Green
