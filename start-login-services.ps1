Write-Host "=== STARTING LOGIN SERVICES ===" -ForegroundColor Cyan

# Start PostgreSQL
Write-Host "`n1. Starting PostgreSQL..." -ForegroundColor Yellow
$pgRunning = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($pgRunning) {
    Write-Host "   Already running" -ForegroundColor Green
} else {
    Write-Host "   Starting..." -ForegroundColor Gray
    Start-Process -FilePath "docker" -ArgumentList "run -d --name postgres-cafeteria -e POSTGRES_USER=identity_user -e POSTGRES_PASSWORD=identity_pass -e POSTGRES_DB=identity_db -p 5432:5432 postgres:15-alpine" -NoNewWindow -Wait
    Start-Sleep -Seconds 3
}

# Start Redis
Write-Host "`n2. Starting Redis..." -ForegroundColor Yellow
$redisRunning = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($redisRunning) {
    Write-Host "   Already running" -ForegroundColor Green
} else {
    Write-Host "   Starting..." -ForegroundColor Gray
    Start-Process -FilePath "docker" -ArgumentList "run -d --name redis-cafeteria -p 6379:6379 redis:7-alpine" -NoNewWindow -Wait
    Start-Sleep -Seconds 2
}

# Fix env
Write-Host "`n3. Fixing client .env..." -ForegroundColor Yellow
@"
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3005
"@ | Out-File -FilePath "client/.env.local" -Encoding utf8 -Force
Write-Host "   Done" -ForegroundColor Green

# Clear cache
if (Test-Path "client/.next") {
    Remove-Item "client/.next" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`n=== SERVICES READY ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. Start identity provider:" -ForegroundColor Gray
Write-Host "   cd services/identity-provider" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host "`n2. Start client:" -ForegroundColor Gray
Write-Host "   cd client" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "`n3. Login at http://localhost:3000/login" -ForegroundColor Gray
Write-Host "   User: test123 / Test@1234" -ForegroundColor Gray
