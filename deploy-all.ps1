#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING ALL SERVICES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`nChecking Docker..." -ForegroundColor Yellow
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Docker is not running!" -ForegroundColor Red
        Write-Host "`nPlease start Docker Desktop first, then run this script again." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not installed or not running!" -ForegroundColor Red
    Write-Host "`nPlease install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Stop any existing containers
Write-Host "`nStopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "✓ Cleaned up" -ForegroundColor Green

# Build and start all services
Write-Host "`nBuilding and starting services..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes on first run)" -ForegroundColor Gray

docker-compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Services started" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host "`nWaiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host "`nChecking service health..." -ForegroundColor Yellow

$services = @(
    @{Name="PostgreSQL"; Port=5432},
    @{Name="Redis"; Port=6379},
    @{Name="RabbitMQ"; Port=5672},
    @{Name="Identity Provider"; Port=3001},
    @{Name="Order Gateway"; Port=3002},
    @{Name="Stock Service"; Port=3003},
    @{Name="Client"; Port=3000}
)

$allHealthy = $true
foreach ($service in $services) {
    $connection = Test-NetConnection -ComputerName localhost -Port $service.Port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connection) {
        Write-Host "  ✓ $($service.Name) (port $($service.Port))" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $($service.Name) (port $($service.Port))" -ForegroundColor Red
        $allHealthy = $false
    }
}

if (-not $allHealthy) {
    Write-Host "`nSome services failed to start. Checking logs..." -ForegroundColor Yellow
    Write-Host "Run: docker-compose logs [service-name]" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nServices:" -ForegroundColor White
Write-Host "  • Client:            http://localhost:3000" -ForegroundColor Gray
Write-Host "  • Identity Provider: http://localhost:3001" -ForegroundColor Gray
Write-Host "  • Order Gateway:     http://localhost:3002" -ForegroundColor Gray
Write-Host "  • Stock Service:     http://localhost:3003" -ForegroundColor Gray
Write-Host "  • RabbitMQ Admin:    http://localhost:15672" -ForegroundColor Gray

Write-Host "`nLogin Credentials:" -ForegroundColor White
Write-Host "  • Student ID: test123" -ForegroundColor Gray
Write-Host "  • Password:   Test@1234" -ForegroundColor Gray

Write-Host "`nUseful Commands:" -ForegroundColor White
Write-Host "  • View logs:    docker-compose logs -f [service]" -ForegroundColor Gray
Write-Host "  • Stop all:     docker-compose down" -ForegroundColor Gray
Write-Host "  • Restart:      docker-compose restart [service]" -ForegroundColor Gray
Write-Host "  • Check status: docker-compose ps" -ForegroundColor Gray

Write-Host ""
