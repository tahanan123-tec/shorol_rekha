Write-Host "=== DOCKER RESTART FIX ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Docker Desktop appears to be stopped." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please follow these steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start Docker Desktop:" -ForegroundColor White
Write-Host "   - Open Docker Desktop from Start Menu" -ForegroundColor Gray
Write-Host "   - Wait for it to fully start (whale icon in system tray)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Once Docker is running, restart the system:" -ForegroundColor White
Write-Host "   .\restart-everything.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "OR use this command:" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.local.yml up -d" -ForegroundColor Gray
Write-Host ""

# Try to detect if Docker Desktop is installed
$dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktopPath) {
    Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Yellow
    Start-Process $dockerDesktopPath
    Write-Host ""
    Write-Host "Waiting for Docker to start (this may take 30-60 seconds)..." -ForegroundColor Yellow
    
    $maxWait = 60
    $waited = 0
    $dockerRunning = $false
    
    while ($waited -lt $maxWait -and -not $dockerRunning) {
        Start-Sleep -Seconds 5
        $waited += 5
        
        try {
            docker ps > $null 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                Write-Host "✅ Docker is running!" -ForegroundColor Green
                break
            }
        } catch {
            # Still waiting
        }
        
        Write-Host "  Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
    }
    
    if ($dockerRunning) {
        Write-Host ""
        Write-Host "Restarting containers..." -ForegroundColor Yellow
        docker-compose -f docker-compose.local.yml up -d
        
        Write-Host ""
        Write-Host "✅ System restarted successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Access your application at: http://localhost" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "⚠️  Docker didn't start automatically." -ForegroundColor Yellow
        Write-Host "Please start Docker Desktop manually and run:" -ForegroundColor White
        Write-Host "  .\restart-everything.ps1" -ForegroundColor Gray
    }
} else {
    Write-Host "Docker Desktop not found at default location." -ForegroundColor Yellow
    Write-Host "Please start it manually from the Start Menu." -ForegroundColor White
}

Write-Host ""
