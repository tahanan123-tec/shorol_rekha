Write-Host "=== RESTARTING EVERYTHING (DOCKER) ===" -ForegroundColor Cyan
Write-Host ""

# Stop all Docker containers
Write-Host "Stopping all Docker containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml down

Write-Host "All containers stopped" -ForegroundColor Green
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Starting all services in Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml up -d

Write-Host ""
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "Checking service health..." -ForegroundColor Cyan
docker-compose -f docker-compose.local.yml ps

Write-Host ""
Write-Host "=== ALL SERVICES STARTED ===" -ForegroundColor Green
Write-Host ""
Write-Host "Access points (via NGINX):" -ForegroundColor Cyan
Write-Host "  Client:          http://localhost" -ForegroundColor White
Write-Host "  Admin Dashboard: http://localhost/admin" -ForegroundColor White
Write-Host "  Stock Service:   http://localhost/stock" -ForegroundColor White
Write-Host ""
Write-Host "Direct service access:" -ForegroundColor Cyan
Write-Host "  Grafana:         http://localhost:3200" -ForegroundColor White
Write-Host "  Prometheus:      http://localhost:9090" -ForegroundColor White
Write-Host "  RabbitMQ:        http://localhost:15672" -ForegroundColor White
Write-Host ""
Write-Host "Waiting 10 more seconds for everything to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Testing stock endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri 'http://localhost/stock' -Method Get
    Write-Host "SUCCESS! Stock endpoint is working!" -ForegroundColor Green
    Write-Host "  Found $($response.data.items.Count) menu items" -ForegroundColor Gray
} catch {
    Write-Host "Stock test failed" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
}

Write-Host ""
Write-Host "System is ready! Go to http://localhost" -ForegroundColor Green
