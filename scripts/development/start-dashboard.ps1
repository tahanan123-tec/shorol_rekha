# Admin Dashboard Startup Script
# This script helps you start the admin dashboard locally

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cafeteria Admin Dashboard Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✓ Docker is installed: $dockerVersion" -ForegroundColor Green
        
        # Check if Docker is running
        try {
            docker info 2>$null | Out-Null
            Write-Host "✓ Docker is running" -ForegroundColor Green
            
            Write-Host ""
            Write-Host "Starting services with Docker Compose..." -ForegroundColor Yellow
            docker-compose up -d admin-dashboard prometheus
            
            Write-Host ""
            Write-Host "Waiting for services to start..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
            
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  Services Started Successfully!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Access the dashboard at:" -ForegroundColor Cyan
            Write-Host "  http://localhost:3100" -ForegroundColor White
            Write-Host ""
            Write-Host "Access Prometheus at:" -ForegroundColor Cyan
            Write-Host "  http://localhost:9090" -ForegroundColor White
            Write-Host ""
            Write-Host "To view logs:" -ForegroundColor Yellow
            Write-Host "  docker-compose logs -f admin-dashboard" -ForegroundColor White
            Write-Host ""
            Write-Host "To stop services:" -ForegroundColor Yellow
            Write-Host "  docker-compose down" -ForegroundColor White
            Write-Host ""
            
        } catch {
            Write-Host "✗ Docker is not running" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
            Write-Host "You can find Docker Desktop in your Start menu." -ForegroundColor Yellow
            exit 1
        }
        
    }
} catch {
    Write-Host "✗ Docker is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Option 1: Install Docker (Recommended)" -ForegroundColor Yellow
    Write-Host "  1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor White
    Write-Host "  2. Install and restart your computer" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Run Locally Without Docker" -ForegroundColor Yellow
    Write-Host "  1. Install Node.js 20+ from: https://nodejs.org/" -ForegroundColor White
    Write-Host "  2. Run: cd admin-dashboard" -ForegroundColor White
    Write-Host "  3. Run: npm install" -ForegroundColor White
    Write-Host "  4. Run: npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "For detailed instructions, see TROUBLESHOOTING.md" -ForegroundColor Cyan
    Write-Host ""
    
    # Ask if user wants to try local installation
    $response = Read-Host "Do you want to try running locally without Docker? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
        
        try {
            $nodeVersion = node --version 2>$null
            if ($nodeVersion) {
                Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
                
                Write-Host ""
                Write-Host "Installing dependencies..." -ForegroundColor Yellow
                Set-Location admin-dashboard
                npm install
                
                Write-Host ""
                Write-Host "Creating environment file..." -ForegroundColor Yellow
                if (-not (Test-Path ".env.local")) {
                    Copy-Item ".env.example" ".env.local"
                    Write-Host "✓ Created .env.local" -ForegroundColor Green
                }
                
                Write-Host ""
                Write-Host "========================================" -ForegroundColor Green
                Write-Host "  Starting Development Server..." -ForegroundColor Green
                Write-Host "========================================" -ForegroundColor Green
                Write-Host ""
                Write-Host "Dashboard will be available at:" -ForegroundColor Cyan
                Write-Host "  http://localhost:3100" -ForegroundColor White
                Write-Host ""
                Write-Host "Note: Without backend services, health checks will fail." -ForegroundColor Yellow
                Write-Host "You can still see the dashboard UI." -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
                Write-Host ""
                
                npm run dev
                
            } else {
                Write-Host "✗ Node.js is not installed" -ForegroundColor Red
                Write-Host ""
                Write-Host "Please install Node.js 20+ from: https://nodejs.org/" -ForegroundColor Yellow
                Write-Host "Then run this script again." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "✗ Node.js is not installed" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please install Node.js 20+ from: https://nodejs.org/" -ForegroundColor Yellow
        }
    }
}
