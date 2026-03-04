# Cafeteria System - Docker Deployment Script
# This script deploys the entire system using Docker Compose

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cafeteria System - Docker Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker
Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "  ✓ Docker installed: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Docker is not installed!" -ForegroundColor Red
    Write-Host "  Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "  ✓ Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Docker is not running!" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again." -ForegroundColor Yellow
    Write-Host "  On Windows: Search for 'Docker Desktop' and launch it" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check environment file
Write-Host ""
Write-Host "[2/6] Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  ✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "  ! .env file not found, creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "  ✓ Created .env file" -ForegroundColor Green
    Write-Host "  ⚠ Please update passwords in .env file for production!" -ForegroundColor Yellow
}

# Step 3: Stop any running containers
Write-Host ""
Write-Host "[3/6] Cleaning up existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null
Write-Host "  ✓ Cleanup complete" -ForegroundColor Green

# Step 4: Build images
Write-Host ""
Write-Host "[4/6] Building Docker images..." -ForegroundColor Yellow
Write-Host "  This may take 5-10 minutes on first run..." -ForegroundColor Cyan
docker-compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Images built successfully" -ForegroundColor Green

# Step 5: Start services
Write-Host ""
Write-Host "[5/6] Starting all services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to start services!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Services started" -ForegroundColor Green

# Step 6: Wait for services to be healthy
Write-Host ""
Write-Host "[6/6] Waiting for services to be ready..." -ForegroundColor Yellow
Write-Host "  This may take 30-60 seconds..." -ForegroundColor Cyan

$maxWait = 120
$waited = 0
$interval = 5

while ($waited -lt $maxWait) {
    Start-Sleep -Seconds $interval
    $waited += $interval
    
    $healthy = docker-compose ps --filter "status=running" | Select-String "healthy" | Measure-Object | Select-Object -ExpandProperty Count
    $total = docker-compose ps | Select-String "Up" | Measure-Object | Select-Object -ExpandProperty Count
    
    Write-Host "  Progress: $healthy/$total services healthy (${waited}s elapsed)" -ForegroundColor Cyan
    
    if ($healthy -ge 5) {
        break
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "  🌐 Client App:        http://localhost:80" -ForegroundColor White
Write-Host "  👨‍💼 Admin Dashboard:   http://localhost:80/admin" -ForegroundColor White
Write-Host "  📊 Grafana:           http://localhost:3006 (admin/admin)" -ForegroundColor White
Write-Host "  📈 Prometheus:        http://localhost:9090" -ForegroundColor White
Write-Host "  🔍 Jaeger:            http://localhost:16686" -ForegroundColor White
Write-Host "  🐰 RabbitMQ:          http://localhost:15672 (admin/admin)" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "  View logs:            docker-compose logs -f" -ForegroundColor White
Write-Host "  View status:          docker-compose ps" -ForegroundColor White
Write-Host "  Stop all:             docker-compose down" -ForegroundColor White
Write-Host "  Restart service:      docker-compose restart <service-name>" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Open your browser to: http://localhost" -ForegroundColor Green
Write-Host ""
