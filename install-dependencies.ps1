# Install Dependencies Script (PowerShell)
# This script installs all dependencies for the cafeteria system

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Installing Cafeteria System Dependencies" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Function to install dependencies
function Install-Dependencies {
    param(
        [string]$Directory,
        [string]$Name
    )
    
    Write-Host "📦 Installing dependencies for $Name..." -ForegroundColor Yellow
    
    if (Test-Path "$Directory/package.json") {
        Push-Location $Directory
        npm install
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Name dependencies installed successfully" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to install $Name dependencies" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        
        Pop-Location
    } else {
        Write-Host "⚠️  No package.json found in $Directory" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Install backend services
Write-Host "🔧 Installing Backend Services..." -ForegroundColor Cyan
Write-Host ""

Install-Dependencies "services/identity-provider" "Identity Provider"
Install-Dependencies "services/order-gateway" "Order Gateway"
Install-Dependencies "services/stock-service" "Stock Service"
Install-Dependencies "services/kitchen-queue" "Kitchen Queue"
Install-Dependencies "services/notification-hub" "Notification Hub"
Install-Dependencies "services/chaos-monkey" "Chaos Monkey"
Install-Dependencies "services/predictive-scaler" "Predictive Scaler"

# Install frontend applications
Write-Host "🎨 Installing Frontend Applications..." -ForegroundColor Cyan
Write-Host ""

Install-Dependencies "admin-dashboard" "Admin Dashboard"
Install-Dependencies "client" "Client Application"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ All dependencies installed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Reload VS Code: Ctrl+Shift+P -> 'Developer: Reload Window'" -ForegroundColor White
Write-Host "2. Or restart TypeScript: Ctrl+Shift+P -> 'TypeScript: Restart TS Server'" -ForegroundColor White
Write-Host ""
Write-Host "To start the system:" -ForegroundColor Yellow
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""
