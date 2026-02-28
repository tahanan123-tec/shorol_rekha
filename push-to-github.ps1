# Push to GitHub Script
# Run this after creating your GitHub repository

Write-Host "=== Push to GitHub ===" -ForegroundColor Cyan

# Get GitHub username
$username = Read-Host "Enter your GitHub username"

# Get repository name (default: cafeteria-ordering-system)
$repoName = Read-Host "Enter repository name (press Enter for 'cafeteria-ordering-system')"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "cafeteria-ordering-system"
}

Write-Host "`nUsing: https://github.com/$username/$repoName.git" -ForegroundColor Yellow

# Confirm
$confirm = Read-Host "`nHave you created this repository on GitHub? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "`nPlease create the repository first at: https://github.com/new" -ForegroundColor Red
    Write-Host "Then run this script again." -ForegroundColor Red
    exit
}

Write-Host "`n1. Committing files..." -ForegroundColor Yellow
git commit -m "Initial commit: University Cafeteria Ordering System"

Write-Host "`n2. Adding remote..." -ForegroundColor Yellow
git remote add origin "https://github.com/$username/$repoName.git"

Write-Host "`n3. Pushing to GitHub..." -ForegroundColor Yellow
git branch -M main
git push -u origin main

Write-Host "`n=== Success! ===" -ForegroundColor Green
Write-Host "Your repository is now at: https://github.com/$username/$repoName" -ForegroundColor Green
