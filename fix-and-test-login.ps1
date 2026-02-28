#!/usr/bin/env pwsh

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  LOGIN FIX & TEST SCRIPT" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Step 1: Fix .env.local
Write-Host "`n[1/5] Fixing client environment..." -ForegroundColor Yellow
$envContent = @"
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_WS_URL=http://localhost:3005
"@
Set-Content -Path "client/.env.local" -Value $envContent -Force
Write-Host "      ✓ Created client/.env.local" -ForegroundColor Green

# Step 2: Clear cache
Write-Host "`n[2/5] Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path "client/.next") {
    Remove-Item -Path "client/.next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "      ✓ Cleared .next directory" -ForegroundColor Green
} else {
    Write-Host "      ✓ No cache to clear" -ForegroundColor Green
}

# Step 3: Check Docker
Write-Host "`n[3/5] Checking Docker services..." -ForegroundColor Yellow
try {
    $dockerRunning = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✓ Docker is running" -ForegroundColor Green
        
        # Restart identity provider to create test user
        Write-Host "      → Restarting identity-provider..." -ForegroundColor Gray
        docker-compose restart identity-provider 2>&1 | Out-Null
        Start-Sleep -Seconds 3
        Write-Host "      ✓ Identity provider restarted" -ForegroundColor Green
        
        # Restart client to pick up new env
        Write-Host "      → Restarting client..." -ForegroundColor Gray
        docker-compose restart client 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        Write-Host "      ✓ Client restarted" -ForegroundColor Green
    } else {
        Write-Host "      ⚠ Docker is not running" -ForegroundColor Yellow
        Write-Host "      → Start services with: docker-compose up -d" -ForegroundColor Gray
    }
} catch {
    Write-Host "      ⚠ Docker is not available" -ForegroundColor Yellow
}

# Step 4: Wait for services
Write-Host "`n[4/5] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "      ✓ Services should be ready" -ForegroundColor Green

# Step 5: Test login
Write-Host "`n[5/5] Testing login..." -ForegroundColor Yellow
$loginBody = @{
    student_id = "test123"
    password = "Test@1234"
} | ConvertTo-Json

$testPassed = $false

# Try direct connection first
try {
    Write-Host "      → Testing direct connection to identity-provider..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    Write-Host "      ✓ Direct login successful!" -ForegroundColor Green
    $testPassed = $true
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode) {
        Write-Host "      ✗ Direct login failed (HTTP $statusCode)" -ForegroundColor Red
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "      Error: $($errorBody.error)" -ForegroundColor Red
        } catch {}
    } else {
        Write-Host "      ✗ Cannot connect to identity-provider" -ForegroundColor Red
        Write-Host "      Make sure it's running: docker-compose up -d identity-provider" -ForegroundColor Gray
    }
}

# Try through nginx if available
if ($testPassed) {
    try {
        Write-Host "      → Testing through nginx..." -ForegroundColor Gray
        $response = Invoke-RestMethod -Uri "http://localhost/auth/login" `
            -Method Post `
            -Body $loginBody `
            -ContentType "application/json" `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        Write-Host "      ✓ Nginx routing works!" -ForegroundColor Green
    } catch {
        if ($_.Exception.Message -match "Unable to connect") {
            Write-Host "      ⚠ Nginx not running (OK for dev)" -ForegroundColor Yellow
        } else {
            Write-Host "      ⚠ Nginx routing issue" -ForegroundColor Yellow
        }
    }
}

# Summary
Write-Host "`n==================================" -ForegroundColor Cyan
if ($testPassed) {
    Write-Host "  ✓ LOGIN IS WORKING!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "`nYou can now:" -ForegroundColor White
    Write-Host "  1. Open http://localhost:3000/login" -ForegroundColor Gray
    Write-Host "  2. Login with:" -ForegroundColor Gray
    Write-Host "     Student ID: test123" -ForegroundColor Gray
    Write-Host "     Password: Test@1234" -ForegroundColor Gray
} else {
    Write-Host "  ✗ LOGIN TEST FAILED" -ForegroundColor Red
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "`nTroubleshooting:" -ForegroundColor White
    Write-Host "  1. Check if services are running:" -ForegroundColor Gray
    Write-Host "     docker-compose ps" -ForegroundColor Gray
    Write-Host "`n  2. Start all services:" -ForegroundColor Gray
    Write-Host "     docker-compose up -d" -ForegroundColor Gray
    Write-Host "`n  3. Check logs:" -ForegroundColor Gray
    Write-Host "     docker-compose logs identity-provider" -ForegroundColor Gray
    Write-Host "`n  4. See LOGIN_ISSUE_FIXES.md for more help" -ForegroundColor Gray
}
Write-Host ""
