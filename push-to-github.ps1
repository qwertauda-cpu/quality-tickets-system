# PowerShell script to push project to GitHub

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Pushing to GitHub" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check if remote exists
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host "Remote 'origin' already exists:" -ForegroundColor Yellow
    git remote -v
} else {
    Write-Host "No remote 'origin' found" -ForegroundColor Yellow
    Write-Host ""
    $repoUrl = Read-Host "Enter GitHub repository URL"
    if ([string]::IsNullOrWhiteSpace($repoUrl)) {
        Write-Host "Repository URL is required" -ForegroundColor Red
        exit 1
    }
    git remote add origin $repoUrl
    Write-Host "Remote added: $repoUrl" -ForegroundColor Green
}

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "Failed to push to GitHub" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Repository exists on GitHub" -ForegroundColor White
    Write-Host "  2. You have push permissions" -ForegroundColor White
    Write-Host "  3. You're authenticated" -ForegroundColor White
}

