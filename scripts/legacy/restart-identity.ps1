Write-Host "Restarting identity-provider service..." -ForegroundColor Cyan

# Stop identity-provider on port 3001
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Stop-Process -Id $process -Force
    Write-Host "Stopped identity-provider" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

Write-Host "Starting identity-provider..." -ForegroundColor Yellow
Set-Location services/identity-provider
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Set-Location ../..

Write-Host ""
Write-Host "Waiting for service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Testing login endpoint..." -ForegroundColor Cyan
$body = @{student_id='test123';password='password123'} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3001/auth/login' -Method Post -Body $body -ContentType 'application/json'
    Write-Host "SUCCESS! Login works!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "Login test result:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Identity-provider is running. Try logging in at http://localhost:3000/login" -ForegroundColor Cyan
