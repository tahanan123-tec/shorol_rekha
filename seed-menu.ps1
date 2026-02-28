#!/usr/bin/env pwsh

Write-Host "=== Seeding Menu Items ===" -ForegroundColor Cyan

# Check if stock service is running
Write-Host "`nChecking stock service..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3003/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Stock service is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Stock service is not running" -ForegroundColor Red
    Write-Host "Start it with: docker-compose up -d stock-service" -ForegroundColor Gray
    exit 1
}

# Run seed script
Write-Host "`nSeeding menu items..." -ForegroundColor Yellow
Push-Location services/stock-service
try {
    node src/scripts/seed-menu.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Menu seeded successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n✗ Failed to seed menu" -ForegroundColor Red
    }
} finally {
    Pop-Location
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
