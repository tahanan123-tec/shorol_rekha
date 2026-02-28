# Start Essential Services Only
Write-Host "========================================"
Write-Host "Starting Essential Services"
Write-Host "========================================"
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "Docker not running. Starting infrastructure..." -ForegroundColor Yellow
    docker-compose -f docker-compose.simple.yml up -d
    Start-Sleep -Seconds 30
}

# Start essential services only
Write-Host ""
Write-Host "Starting essential microservices..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/identity-provider; npm run dev"
Start-Sleep -Seconds 3

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/order-gateway; npm run dev"
Start-Sleep -Seconds 3

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/stock-service; npm run dev"
Start-Sleep -Seconds 3

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/notification-hub; npm run dev"
Start-Sleep -Seconds 5

# Start frontends
Write-Host ""
Write-Host "Starting frontend applications..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd admin-dashboard; npm run dev"

Write-Host ""
Write-Host "========================================"
Write-Host "Essential Services Started!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "Access Points:"
Write-Host "  Client App:          http://localhost:3000"
Write-Host "  Admin Dashboard:     http://localhost:3100"
Write-Host "  Identity Provider:   http://localhost:3001"
Write-Host "  Order Gateway:       http://localhost:3002"
Write-Host "  Stock Service:       http://localhost:3004"
Write-Host "  Notification Hub:    http://localhost:3005"
Write-Host ""
Write-Host "  Grafana:             http://localhost:3006"
Write-Host "  Prometheus:          http://localhost:9090"
Write-Host ""
Write-Host "Wait 1 minute, then open: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
