Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cafeteria System - Local Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "OK Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Stop any existing services
Write-Host ""
Write-Host "Stopping existing services..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml down 2>$null

# Build and start services
Write-Host ""
Write-Host "Building and starting services..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes on first run)" -ForegroundColor Gray
docker-compose -f docker-compose.local.yml up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  Client App:       http://localhost" -ForegroundColor White
Write-Host "  Admin Dashboard:  http://localhost/admin" -ForegroundColor White
Write-Host "  Grafana:          http://localhost:3200" -ForegroundColor White
Write-Host "  Prometheus:       http://localhost:9090" -ForegroundColor White
Write-Host "  RabbitMQ:         http://localhost:15672" -ForegroundColor White
Write-Host ""
Write-Host "API Endpoints (via Nginx):" -ForegroundColor Cyan
Write-Host "  Auth:             http://localhost/auth" -ForegroundColor White
Write-Host "  Orders:           http://localhost/api" -ForegroundColor White
Write-Host "  Stock:            http://localhost/stock" -ForegroundColor White
Write-Host "  WebSocket:        ws://localhost/socket.io" -ForegroundColor White
Write-Host ""
Write-Host "To view logs: docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor Gray
Write-Host "To stop:      docker-compose -f docker-compose.local.yml down" -ForegroundColor Gray
Write-Host ""
