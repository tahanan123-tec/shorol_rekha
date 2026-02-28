# Cafeteria System - Complete Startup Script
Write-Host "========================================"
Write-Host "Cafeteria System - Starting All Services"
Write-Host "========================================"
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Start infrastructure
Write-Host ""
Write-Host "Starting infrastructure..." -ForegroundColor Yellow
docker-compose -f docker-compose.simple.yml up -d

Write-Host "Waiting 30 seconds for databases to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Start services
Write-Host ""
Write-Host "Starting microservices..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/identity-provider; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/order-gateway; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/kitchen-queue; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/stock-service; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/notification-hub; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/chaos-monkey; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/predictive-scaler; npm run dev"
Start-Sleep -Seconds 2

Write-Host "Waiting 10 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start frontends
Write-Host ""
Write-Host "Starting frontend applications..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd admin-dashboard; npm run dev"

Write-Host ""
Write-Host "========================================"
Write-Host "System Started Successfully!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "Access Points:"
Write-Host "  Client App:          http://localhost:3000"
Write-Host "  Admin Dashboard:     http://localhost:3100"
Write-Host "  Grafana:             http://localhost:3006"
Write-Host "  Prometheus:          http://localhost:9090"
Write-Host "  Jaeger:              http://localhost:16686"
Write-Host "  RabbitMQ:            http://localhost:15672"
Write-Host ""
Write-Host "Wait 1-2 minutes for everything to start, then open:"
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
