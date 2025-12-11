# Setup and push to GitHub
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "GitHub Setup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check if already has remote
$remotes = git remote 2>$null
$hasRemote = $remotes -contains "origin"

if ($hasRemote) {
    Write-Host "Repository already has remote:" -ForegroundColor Yellow
    Write-Host $remoteCheck -ForegroundColor Cyan
    Write-Host ""
    $push = Read-Host "Push to GitHub? (yes/no)"
    if ($push -eq "yes") {
        Write-Host "Pushing..." -ForegroundColor Cyan
        git push -u origin main
    }
} else {
    Write-Host "No GitHub repository configured yet." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/new" -ForegroundColor White
    Write-Host "2. Create a new repository (name: quality-tickets-system)" -ForegroundColor White
    Write-Host "3. DO NOT initialize with README" -ForegroundColor White
    Write-Host "4. Copy the repository URL" -ForegroundColor White
    Write-Host ""
    $repoUrl = Read-Host "Paste GitHub repository URL here"
    
    if ([string]::IsNullOrWhiteSpace($repoUrl)) {
        Write-Host "Repository URL is required" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Adding remote..." -ForegroundColor Cyan
    git remote add origin $repoUrl
    
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Repository URL: $repoUrl" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "Failed to push. Check:" -ForegroundColor Red
        Write-Host "  - Repository exists on GitHub" -ForegroundColor Yellow
        Write-Host "  - You have push access" -ForegroundColor Yellow
        Write-Host "  - You're authenticated" -ForegroundColor Yellow
    }
}
