# Add GitHub remote and push
# Edit this file and add your GitHub repository URL

$GITHUB_REPO_URL = "https://github.com/YOUR_USERNAME/quality-tickets-system.git"

# Add remote
Write-Host "Adding remote..." -ForegroundColor Cyan
git remote add origin $GITHUB_REPO_URL

# Push
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

Write-Host "Done!" -ForegroundColor Green

