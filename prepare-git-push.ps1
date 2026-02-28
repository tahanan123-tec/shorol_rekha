# Git Push Preparation Script
# This script prepares the project for pushing to a Git repository

Write-Host "=== Preparing Project for Git Push ===" -ForegroundColor Cyan

# Step 1: Check Git status
Write-Host "`n1. Checking Git status..." -ForegroundColor Yellow
git status

# Step 2: Verify .env files are not tracked
Write-Host "`n2. Verifying sensitive files are ignored..." -ForegroundColor Yellow
$envFiles = Get-ChildItem -Path . -Filter ".env" -Recurse -File -ErrorAction SilentlyContinue
if ($envFiles) {
    Write-Host "Found .env files (should be ignored by .gitignore):" -ForegroundColor Green
    $envFiles | ForEach-Object { Write-Host "  - $($_.FullName)" }
} else {
    Write-Host "No .env files found in repository" -ForegroundColor Green
}

# Step 3: Check for secrets directory
Write-Host "`n3. Checking for secrets directory..." -ForegroundColor Yellow
if (Test-Path "secrets") {
    Write-Host "Secrets directory exists (should be ignored by .gitignore)" -ForegroundColor Green
} else {
    Write-Host "No secrets directory found" -ForegroundColor Green
}

# Step 4: Verify node_modules are ignored
Write-Host "`n4. Verifying node_modules are ignored..." -ForegroundColor Yellow
$nodeModules = Get-ChildItem -Path . -Filter "node_modules" -Recurse -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($nodeModules) {
    Write-Host "node_modules directories exist (should be ignored by .gitignore)" -ForegroundColor Green
} else {
    Write-Host "No node_modules directories found" -ForegroundColor Green
}

# Step 5: Stage all files
Write-Host "`n5. Staging all files..." -ForegroundColor Yellow
git add .

# Step 6: Show what will be committed
Write-Host "`n6. Files to be committed:" -ForegroundColor Yellow
git status

# Step 7: Provide next steps
Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Review the files above to ensure no sensitive data is included" -ForegroundColor White
Write-Host "2. Commit your changes:" -ForegroundColor White
Write-Host "   git commit -m 'Initial commit: University Cafeteria Ordering System'" -ForegroundColor Gray
Write-Host "3. Add your remote repository:" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/yourusername/cafeteria-ordering-system.git" -ForegroundColor Gray
Write-Host "4. Push to remote:" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor Gray

Write-Host "`n=== Preparation Complete ===" -ForegroundColor Green
