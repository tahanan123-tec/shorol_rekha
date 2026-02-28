#!/usr/bin/env pwsh

Write-Host "=== Testing Login Flow ===" -ForegroundColor Cyan

# Test 1: Check if identity provider is accessible
Write-Host "`n1. Testing identity provider health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    Write-Host "   ✓ Identity provider is healthy" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Identity provider is not accessible: $_" -ForegroundColor Red
    Write-Host "   Run: docker-compose up -d identity-provider" -ForegroundColor Gray
    exit 1
}

# Test 2: Try login directly to identity provider
Write-Host "`n2. Testing direct login to identity provider..." -ForegroundColor Yellow
$loginBody = @{
    student_id = "test123"
    password = "Test@1234"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -TimeoutSec 10
    
    Write-Host "   ✓ Login successful!" -ForegroundColor Green
    Write-Host "   Access Token: $($response.data.access_token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "   ✗ Login failed with status $statusCode" -ForegroundColor Red
    Write-Host "   Error: $($errorBody.error)" -ForegroundColor Red
    if ($errorBody.details) {
        Write-Host "   Details: $($errorBody.details | ConvertTo-Json)" -ForegroundColor Red
    }
}

# Test 3: Try login through nginx (if running)
Write-Host "`n3. Testing login through nginx..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -TimeoutSec 10
    
    Write-Host "   ✓ Login through nginx successful!" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -match "Unable to connect") {
        Write-Host "   ⚠ Nginx is not running (this is OK for development)" -ForegroundColor Yellow
    } else {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   ✗ Login through nginx failed with status $statusCode" -ForegroundColor Red
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "   Error: $($errorBody.error)" -ForegroundColor Red
        } catch {
            Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
