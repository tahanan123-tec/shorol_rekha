#!/usr/bin/env pwsh
# System Status Check Script
# Checks if all dependencies are installed and services are ready

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cafeteria System - Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found" -ForegroundColor Red
    $allGood = $false
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm $npmVersion installed" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found" -ForegroundColor Red
    $allGood = $false
}

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker not found" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projects = @(
    @{ Path = "client"; Name = "Client" },
    @{ Path = "admin-dashboard"; Name = "Admin Dashboard" },
    @{ Path = "services/identity-provider"; Name = "Identity Provider" },
    @{ Path = "services/order-gateway"; Name = "Order Gateway" },
    @{ Path = "services/kitchen-queue"; Name = "Kitchen Queue" },
    @{ Path = "services/stock-service"; Name = "Stock Service" },
    @{ Path = "services/notification-hub"; Name = "Notification Hub" },
    @{ Path = "services/chaos-monkey"; Name = "Chaos Monkey" },
    @{ Path = "services/predictive-scaler"; Name = "Predictive Scaler" }
)

foreach ($project in $projects) {
    if (Test-Path "$($project.Path)/node_modules") {
        Write-Host "✓ $($project.Name): Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ $($project.Name): Dependencies missing" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Environment Files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envFiles = @(
    @{ Path = ".env"; Name = "Root" },
    @{ Path = "client/.env"; Name = "Client" },
    @{ Path = "admin-dashboard/.env"; Name = "Admin Dashboard" },
    @{ Path = "services/identity-provider/.env"; Name = "Identity Provider" },
    @{ Path = "services/order-gateway/.env"; Name = "Order Gateway" },
    @{ Path = "services/kitchen-queue/.env"; Name = "Kitchen Queue" },
    @{ Path = "services/stock-service/.env"; Name = "Stock Service" },
    @{ Path = "services/notification-hub/.env"; Name = "Notification Hub" }
)

foreach ($file in $envFiles) {
    if (Test-Path $file.Path) {
        Write-Host "✓ $($file.Name): .env file exists" -ForegroundColor Green
    } else {
        Write-Host "⚠ $($file.Name): .env file missing" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Docker Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $containers = docker ps --format "{{.Names}}" 2>$null
    
    $requiredServices = @("postgres", "redis", "rabbitmq", "prometheus", "grafana", "jaeger")
    
    foreach ($service in $requiredServices) {
        $found = $containers | Where-Object { $_ -like "*$service*" }
        if ($found) {
            Write-Host "✓ $service: Running" -ForegroundColor Green
        } else {
            Write-Host "✗ $service: Not running" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "⚠ Could not check Docker services (Docker may not be running)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "System Status: READY ✓" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now start the services!" -ForegroundColor Green
} else {
    Write-Host "System Status: NOT READY ✗" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Action required:" -ForegroundColor Yellow
    Write-Host "1. Run .\fix-all-errors.ps1 to install dependencies" -ForegroundColor White
    Write-Host "2. Run .\setup-env-files.ps1 to create .env files" -ForegroundColor White
    Write-Host "3. Run docker-compose up -d to start infrastructure" -ForegroundColor White
}

Write-Host ""
