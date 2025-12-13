# PowerShell script to: Edit → Commit → Push to GitHub → Deploy to Server
# Usage: .\deploy-all.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "🚀 Complete Deployment Process" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Server Configuration
$server = "136.111.97.150"
$user = "qwertauda"
$password = "1234qwer@@"
$projectPath = "/var/www/quality_tickets_system"
$pm2Name = "quality-tickets-system"
$port = 3001

# Step 1: Check Git status
Write-Host "Step 1: Checking Git status..." -ForegroundColor Cyan
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Changes detected:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    
    # Auto-commit in non-interactive mode
    $commit = "yes"  # Auto-commit
    if ($commit -eq "yes") {
        $commitMessage = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        
        Write-Host "Adding files..." -ForegroundColor Yellow
        git add .
        
        Write-Host "Committing..." -ForegroundColor Yellow
        git commit -m $commitMessage
        
        Write-Host "✅ Committed successfully!" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Skipping commit" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ No changes to commit" -ForegroundColor Green
}

Write-Host ""

# Step 2: Push to GitHub
Write-Host "Step 2: Pushing to GitHub..." -ForegroundColor Cyan

# Check if remote exists
$remoteExists = git remote get-url origin 2>$null
if (-not $remoteExists) {
    Write-Host "❌ No GitHub remote found!" -ForegroundColor Red
    Write-Host "Skipping GitHub push..." -ForegroundColor Yellow
    $skipGitHub = $true
} else {
    $skipGitHub = $false
}

# Get current branch
$currentBranch = git branch --show-current
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    $currentBranch = "main"
}

if (-not $skipGitHub) {
    Write-Host "Pushing to origin/$currentBranch..." -ForegroundColor Yellow
    git push -u origin $currentBranch

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
        Write-Host "Continuing with server deployment anyway..." -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipping GitHub push (no remote configured)" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Deploy to Server
Write-Host "Step 3: Deploying to Server..." -ForegroundColor Cyan
Write-Host "Server: $server" -ForegroundColor White
Write-Host "Path: $projectPath" -ForegroundColor White
Write-Host ""

# Commands to execute on server
$commands = @"
cd $projectPath
git pull origin $currentBranch
cd api
npm install
pm2 restart $pm2Name
pm2 logs $pm2Name --lines 20 --nostream
"@

Write-Host "Connecting to server and executing commands..." -ForegroundColor Yellow
Write-Host ""

# Try using SSH
try {
    # Create a temporary script file
    $tempScript = [System.IO.Path]::GetTempFileName()
    $commands | Out-File -FilePath $tempScript -Encoding ASCII
    
    # Use SSH with password (requires sshpass or manual password entry)
    Write-Host "Note: You may need to enter password: $password" -ForegroundColor Yellow
    Write-Host ""
    
    # Try with plink (PuTTY) if available
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        Write-Host "✅ Using plink (PuTTY)..." -ForegroundColor Green
        $commands | plink -ssh "$user@$server" -pw $password
    }
    # Otherwise use SSH (manual password entry)
    else {
        Write-Host "✅ Using SSH..." -ForegroundColor Green
        Write-Host "Please enter password when prompted: $password" -ForegroundColor Yellow
        Write-Host ""
        ssh "$user@$server" $commands
    }
    
    # Clean up temp file
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✅ Deployment Complete!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access the application at:" -ForegroundColor Cyan
    Write-Host "   http://$server`:$port" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Error deploying to server" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual deployment commands:" -ForegroundColor Yellow
    Write-Host "ssh $user@$server" -ForegroundColor White
    Write-Host "cd $projectPath" -ForegroundColor White
    Write-Host "git pull origin $currentBranch" -ForegroundColor White
    Write-Host "cd api" -ForegroundColor White
    Write-Host "npm install" -ForegroundColor White
    Write-Host "pm2 restart $pm2Name" -ForegroundColor White
}

Write-Host ""
Write-Host "✨ All done!" -ForegroundColor Green

