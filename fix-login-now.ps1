#!/usr/bin/env pwsh

Write-Host "=== Quick Login Fix ===" -ForegroundColor Cyan

# 1. Ensure .env.local is correct
Write-Host "`n1. Fixing client environment..." -ForegroundColor Yellow
$envContent = @"
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_WS_URL=http://localhost:3005
"@
Set-Content -Path "client/.env.local" -Value $envContent
Write-Host "   ✓ Updated client/.env.local" -ForegroundColor Green

# 2. Clear Next.js cache
Write-Host "`n2. Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path "client/.next") {
    Remove-Item -Path "client/.next" -Recurse -Force
    Write-Host "   ✓ Cleared .next cache" -ForegroundColor Green
} else {
    Write-Host "   ✓ No cache to clear" -ForegroundColor Green
}

# 3. Check if services are running
Write-Host "`n3. Checking services..." -ForegroundColor Yellow
$services = @(
    @{Name="postgres"; Port=5432},
    @{Name="redis"; Port=6379},
    @{Name="identity-provider"; Port=3001},
    @{Name="client"; Port=3000}
)

foreach ($service in $services) {
    $connection = Test-NetConnection -ComputerName localhost -Port $service.Port -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($connection) {
        Write-Host "   ✓ $($service.Name) is running on port $($service.Port)" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $($service.Name) is NOT running on port $($service.Port)" -ForegroundColor Red
    }
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. If services are NOT running, start them with:" -ForegroundColor White
Write-Host "   docker-compose up -d" -ForegroundColor Gray
Write-Host "`n2. If services ARE running, restart the client:" -ForegroundColor White
Write-Host "   cd client" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "`n3. Try logging in at http://localhost:3000/login" -ForegroundColor White
Write-Host "   Username: test123" -ForegroundColor Gray
Write-Host "   Password: Test@1234" -ForegroundColor Gray
Write-Host "`n4. If still failing, check browser console for errors" -ForegroundColor White
