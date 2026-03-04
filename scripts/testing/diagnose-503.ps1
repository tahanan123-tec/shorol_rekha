# Diagnostic script for 503 Service Unavailable error
# Tests the complete order flow and identifies the failing service

Write-Host "=== 503 Error Diagnostic Tool ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost"
$token = ""

# Step 1: Login to get token
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body (@{
        student_id = "2021001"
        password = "password123"
    } | ConvertTo-Json) -ContentType "application/json"
    
    $token = $loginResponse.data.token
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Test diagnostic endpoint
Write-Host "Step 2: Testing diagnostic endpoint..." -ForegroundColor Yellow
try {
    $diagResponse = Invoke-RestMethod -Uri "$baseUrl/api/debug-order" -Method GET
    Write-Host "✓ Diagnostic endpoint accessible" -ForegroundColor Green
    Write-Host "  Stock Service URL: $($diagResponse.diagnostics.stockServiceConfig.url)" -ForegroundColor Gray
    
    # Check each test
    foreach ($test in $diagResponse.diagnostics.tests.PSObject.Properties) {
        $testName = $test.Name
        $testResult = $test.Value
        
        if ($testResult.success) {
            Write-Host "  ✓ $testName - Status: $($testResult.status)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $testName - Error: $($testResult.error)" -ForegroundColor Red
            Write-Host "    Code: $($testResult.code)" -ForegroundColor Gray
            Write-Host "    Status: $($testResult.status)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ Diagnostic endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 3: Test single item order
Write-Host "Step 3: Testing single item order..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $orderData = @{
        items = @(
            @{
                id = "1"
                quantity = 1
            }
        )
    } | ConvertTo-Json
    
    Write-Host "  Request: POST $baseUrl/api/order" -ForegroundColor Gray
    Write-Host "  Body: $orderData" -ForegroundColor Gray
    
    $orderResponse = Invoke-RestMethod -Uri "$baseUrl/api/order" -Method POST -Headers $headers -Body $orderData
    Write-Host "✓ Single item order successful" -ForegroundColor Green
    Write-Host "  Order ID: $($orderResponse.data.order_id)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Single item order failed" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Step 4: Test multi-item order
Write-Host "Step 4: Testing multi-item order..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $orderData = @{
        items = @(
            @{
                id = "1"
                quantity = 2
            },
            @{
                id = "2"
                quantity = 1
            }
        )
    } | ConvertTo-Json
    
    Write-Host "  Request: POST $baseUrl/api/order" -ForegroundColor Gray
    Write-Host "  Body: $orderData" -ForegroundColor Gray
    
    $orderResponse = Invoke-RestMethod -Uri "$baseUrl/api/order" -Method POST -Headers $headers -Body $orderData
    Write-Host "✓ Multi-item order successful" -ForegroundColor Green
    Write-Host "  Order ID: $($orderResponse.data.order_id)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Multi-item order failed" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check order-gateway logs: docker logs order-gateway-1" -ForegroundColor Gray
Write-Host "2. Check stock-service logs: docker logs stock-service-1" -ForegroundColor Gray
Write-Host "3. Check NGINX logs: docker logs nginx-1" -ForegroundColor Gray
