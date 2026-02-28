#!/usr/bin/env pwsh
# Environment File Setup Script
# Copies all .env.example files to .env files

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment File Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envFiles = @(
    @{ Source = ".env.example"; Dest = ".env"; Name = "Root" },
    @{ Source = "client/.env.example"; Dest = "client/.env"; Name = "Client" },
    @{ Source = "admin-dashboard/.env.example"; Dest = "admin-dashboard/.env"; Name = "Admin Dashboard" },
    @{ Source = "services/identity-provider/.env.example"; Dest = "services/identity-provider/.env"; Name = "Identity Provider" },
    @{ Source = "services/order-gateway/.env.example"; Dest = "services/order-gateway/.env"; Name = "Order Gateway" },
    @{ Source = "services/kitchen-queue/.env.example"; Dest = "services/kitchen-queue/.env"; Name = "Kitchen Queue" },
    @{ Source = "services/stock-service/.env.example"; Dest = "services/stock-service/.env"; Name = "Stock Service" },
    @{ Source = "services/notification-hub/.env.example"; Dest = "services/notification-hub/.env"; Name = "Notification Hub" },
    @{ Source = "services/chaos-monkey/.env.example"; Dest = "services/chaos-monkey/.env"; Name = "Chaos Monkey" },
    @{ Source = "services/predictive-scaler/.env.example"; Dest = "services/predictive-scaler/.env"; Name = "Predictive Scaler" }
)

foreach ($file in $envFiles) {
    if (Test-Path $file.Source) {
        if (Test-Path $file.Dest) {
            Write-Host "⚠ $($file.Name): .env already exists, skipping..." -ForegroundColor Yellow
        } else {
            Copy-Item $file.Source $file.Dest
            Write-Host "✓ $($file.Name): Created .env file" -ForegroundColor Green
        }
    } else {
        Write-Host "✗ $($file.Name): .env.example not found at $($file.Source)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review and update .env files with your configuration" -ForegroundColor White
Write-Host "2. Generate JWT keys: bash scripts/generate-jwt-keys.sh" -ForegroundColor White
Write-Host "3. Start infrastructure: docker-compose up -d" -ForegroundColor White
Write-Host "4. Start services and frontends" -ForegroundColor White
Write-Host ""
