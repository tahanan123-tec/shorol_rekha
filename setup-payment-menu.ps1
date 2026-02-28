#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PAYMENT & MENU SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Seed menu items
Write-Host "`n[1/2] Seeding menu items..." -ForegroundColor Yellow
try {
    Push-Location services/stock-service
    node src/scripts/seed-menu.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✓ Menu seeded successfully (29 items)" -ForegroundColor Green
    } else {
        Write-Host "      ✗ Failed to seed menu" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "      ✗ Error: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# Step 2: Restart client
Write-Host "`n[2/2] Restarting client..." -ForegroundColor Yellow
try {
    docker-compose restart client 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✓ Client restarted" -ForegroundColor Green
    } else {
        Write-Host "      ⚠ Could not restart client (may not be running)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "      ⚠ Docker not available" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ✓ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nWhat's New:" -ForegroundColor White
Write-Host "  • 29 menu items across 5 categories" -ForegroundColor Gray
Write-Host "  • bKash payment support" -ForegroundColor Gray
Write-Host "  • Bank transfer support" -ForegroundColor Gray
Write-Host "  • Cash on pickup" -ForegroundColor Gray

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "  1. Open http://localhost:3000/menu" -ForegroundColor Gray
Write-Host "  2. Browse menu items" -ForegroundColor Gray
Write-Host "  3. Add to cart and checkout" -ForegroundColor Gray
Write-Host "  4. Try different payment methods" -ForegroundColor Gray

Write-Host "`nPayment Test Info:" -ForegroundColor White
Write-Host "  bKash: 01712345678 (merchant)" -ForegroundColor Gray
Write-Host "  Bank: Dutch Bangla Bank, Acc: 1234567890" -ForegroundColor Gray
Write-Host "  Cash: No advance payment needed" -ForegroundColor Gray

Write-Host ""
