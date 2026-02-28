Write-Host "=== PERFORMANCE TEST - 200+ REQ/S ===" -ForegroundColor Cyan
Write-Host ""

# Check if Apache Bench is available
$abPath = Get-Command ab -ErrorAction SilentlyContinue
if (-not $abPath) {
    Write-Host "Apache Bench (ab) not found. Installing..." -ForegroundColor Yellow
    Write-Host "Please install Apache Bench manually or use WSL:" -ForegroundColor Yellow
    Write-Host "  WSL: sudo apt-get install apache2-utils" -ForegroundColor Gray
    Write-Host "  Or download from: https://www.apachelounge.com/download/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Falling back to PowerShell-based test..." -ForegroundColor Yellow
    Write-Host ""
}

# Test 1: Stock Service (Read-heavy)
Write-Host "Test 1: Stock Service (GET /stock)" -ForegroundColor Cyan
Write-Host "Target: 200 requests/second" -ForegroundColor Gray
Write-Host ""

$stockStart = Get-Date
$stockSuccess = 0
$stockFailed = 0
$totalRequests = 1000
$concurrency = 50

Write-Host "Sending $totalRequests requests with $concurrency concurrent connections..." -ForegroundColor Yellow

$jobs = @()
for ($i = 0; $i -lt $concurrency; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($requestsPerJob, $url)
        $success = 0
        $failed = 0
        for ($j = 0; $j -lt $requestsPerJob; $j++) {
            try {
                $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    $success++
                } else {
                    $failed++
                }
            } catch {
                $failed++
            }
        }
        return @{Success=$success; Failed=$failed}
    } -ArgumentList ([math]::Floor($totalRequests / $concurrency)), "http://localhost/stock"
}

# Wait for all jobs
$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

foreach ($result in $results) {
    $stockSuccess += $result.Success
    $stockFailed += $result.Failed
}

$stockEnd = Get-Date
$stockDuration = ($stockEnd - $stockStart).TotalSeconds
$stockRps = [math]::Round($totalRequests / $stockDuration, 2)

Write-Host "Results:" -ForegroundColor Green
Write-Host "  Total Requests: $totalRequests" -ForegroundColor White
Write-Host "  Successful: $stockSuccess" -ForegroundColor Green
Write-Host "  Failed: $stockFailed" -ForegroundColor $(if ($stockFailed -gt 0) { "Red" } else { "Green" })
Write-Host "  Duration: $([math]::Round($stockDuration, 2))s" -ForegroundColor White
Write-Host "  Requests/sec: $stockRps" -ForegroundColor $(if ($stockRps -ge 200) { "Green" } else { "Yellow" })
Write-Host ""

# Test 2: Login Endpoint (Write-heavy)
Write-Host "Test 2: Login Endpoint (POST /auth/login)" -ForegroundColor Cyan
Write-Host "Target: 50 requests/second (CPU-intensive)" -ForegroundColor Gray
Write-Host ""

$loginStart = Get-Date
$loginSuccess = 0
$loginFailed = 0
$loginRequests = 100
$loginConcurrency = 10

Write-Host "Sending $loginRequests login requests with $loginConcurrency concurrent connections..." -ForegroundColor Yellow

$loginJobs = @()
for ($i = 0; $i -lt $loginConcurrency; $i++) {
    $loginJobs += Start-Job -ScriptBlock {
        param($requestsPerJob)
        $success = 0
        $failed = 0
        $body = @{student_id='190104092';password='Jehad12#'} | ConvertTo-Json
        for ($j = 0; $j -lt $requestsPerJob; $j++) {
            try {
                $response = Invoke-RestMethod -Uri 'http://localhost/auth/login' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 10
                if ($response.success) {
                    $success++
                } else {
                    $failed++
                }
            } catch {
                $failed++
            }
        }
        return @{Success=$success; Failed=$failed}
    } -ArgumentList ([math]::Floor($loginRequests / $loginConcurrency))
}

# Wait for all jobs
$loginResults = $loginJobs | Wait-Job | Receive-Job
$loginJobs | Remove-Job

foreach ($result in $loginResults) {
    $loginSuccess += $result.Success
    $loginFailed += $result.Failed
}

$loginEnd = Get-Date
$loginDuration = ($loginEnd - $loginStart).TotalSeconds
$loginRps = [math]::Round($loginRequests / $loginDuration, 2)

Write-Host "Results:" -ForegroundColor Green
Write-Host "  Total Requests: $loginRequests" -ForegroundColor White
Write-Host "  Successful: $loginSuccess" -ForegroundColor Green
Write-Host "  Failed: $loginFailed" -ForegroundColor $(if ($loginFailed -gt 0) { "Red" } else { "Green" })
Write-Host "  Duration: $([math]::Round($loginDuration, 2))s" -ForegroundColor White
Write-Host "  Requests/sec: $loginRps" -ForegroundColor $(if ($loginRps -ge 50) { "Green" } else { "Yellow" })
Write-Host ""

# Summary
Write-Host "=== PERFORMANCE SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Stock Service (Read):" -ForegroundColor White
Write-Host "  ✓ $stockRps req/s" -ForegroundColor $(if ($stockRps -ge 200) { "Green" } else { "Yellow" })
Write-Host "  $(if ($stockRps -ge 200) { '✅ PASSED' } else { '⚠️  BELOW TARGET' })" -ForegroundColor $(if ($stockRps -ge 200) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Login Service (Write):" -ForegroundColor White
Write-Host "  ✓ $loginRps req/s" -ForegroundColor $(if ($loginRps -ge 50) { "Green" } else { "Yellow" })
Write-Host "  $(if ($loginRps -ge 50) { '✅ PASSED' } else { '⚠️  BELOW TARGET' })" -ForegroundColor $(if ($loginRps -ge 50) { "Green" } else { "Yellow" })
Write-Host ""

if ($stockRps -ge 200 -and $loginRps -ge 50) {
    Write-Host "🎉 SYSTEM CAN HANDLE 200+ REQ/S!" -ForegroundColor Green
} else {
    Write-Host "⚠️  System needs more optimization" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Cyan
    Write-Host "  1. Ensure all services are running with 3 replicas" -ForegroundColor White
    Write-Host "  2. Check database connection pools (should be 100)" -ForegroundColor White
    Write-Host "  3. Verify NGINX rate limits are updated (500 req/s)" -ForegroundColor White
    Write-Host "  4. Monitor CPU and memory usage in Grafana" -ForegroundColor White
}

Write-Host ""
Write-Host "View detailed metrics at: http://localhost:3200" -ForegroundColor Cyan
