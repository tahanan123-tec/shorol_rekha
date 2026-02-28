Write-Host "=== LOGIN FIX ===" -ForegroundColor Cyan

# Fix env
Write-Host "`n1. Fixing .env.local..." -ForegroundColor Yellow
@"
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_WS_URL=http://localhost:3005
"@ | Out-File -FilePath "client/.env.local" -Encoding utf8 -Force
Write-Host "   Done" -ForegroundColor Green

# Clear cache
Write-Host "`n2. Clearing cache..." -ForegroundColor Yellow
if (Test-Path "client/.next") {
    Remove-Item "client/.next" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "   Done" -ForegroundColor Green

# Test login
Write-Host "`n3. Testing login..." -ForegroundColor Yellow
$body = @{
    student_id = "test123"
    password = "Test@1234"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "   SUCCESS!" -ForegroundColor Green
    Write-Host "   Token: $($result.data.access_token.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "   FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host "`nLogin at: http://localhost:3000/login" -ForegroundColor Cyan
Write-Host "User: test123 / Test@1234" -ForegroundColor Gray
