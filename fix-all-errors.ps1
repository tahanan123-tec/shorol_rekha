#!/usr/bin/env pwsh
# Comprehensive Error Fix Script for Cafeteria System
# This script installs all dependencies and fixes common issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cafeteria System - Error Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is installed
Write-Host "Checking for npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm version $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Function to install dependencies
function Install-Dependencies {
    param (
        [string]$Path,
        [string]$Name
    )
    
    Write-Host ""
    Write-Host "Installing dependencies for $Name..." -ForegroundColor Yellow
    
    if (Test-Path "$Path/package.json") {
        Push-Location $Path
        try {
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ $Name dependencies installed successfully" -ForegroundColor Green
            } else {
                Write-Host "✗ Failed to install $Name dependencies" -ForegroundColor Red
            }
        } catch {
            Write-Host "✗ Error installing $Name dependencies: $_" -ForegroundColor Red
        }
        Pop-Location
    } else {
        Write-Host "✗ No package.json found in $Path" -ForegroundColor Red
    }
}

# Install Frontend Dependencies
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Frontend Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Install-Dependencies -Path "client" -Name "Client App"
Install-Dependencies -Path "admin-dashboard" -Name "Admin Dashboard"

# Install Service Dependencies
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Service Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$services = @(
    "identity-provider",
    "order-gateway",
    "kitchen-queue",
    "stock-service",
    "notification-hub",
    "chaos-monkey",
    "predictive-scaler"
)

foreach ($service in $services) {
    Install-Dependencies -Path "services/$service" -Name $service
}

# Type check frontends
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Type Checks" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Type checking Client..." -ForegroundColor Yellow
Push-Location client
npm run type-check 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Client type check passed" -ForegroundColor Green
} else {
    Write-Host "⚠ Client has type errors (check with 'npm run type-check' in client/)" -ForegroundColor Yellow
}
Pop-Location

Write-Host ""
Write-Host "Type checking Admin Dashboard..." -ForegroundColor Yellow
Push-Location admin-dashboard
npm run type-check 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Admin Dashboard type check passed" -ForegroundColor Green
} else {
    Write-Host "⚠ Admin Dashboard has type errors (check with 'npm run type-check' in admin-dashboard/)" -ForegroundColor Yellow
}
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy .env.example to .env in root directory" -ForegroundColor White
Write-Host "2. Copy .env.example to .env in each service directory" -ForegroundColor White
Write-Host "3. Run 'docker-compose up -d' to start infrastructure" -ForegroundColor White
Write-Host "4. Run services individually or use the start scripts" -ForegroundColor White
Write-Host ""
