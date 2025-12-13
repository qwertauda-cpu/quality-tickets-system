#!/bin/bash

# Complete deployment script: Edit → Commit → Push to GitHub → Deploy to Server
# Usage: bash deploy-all.sh

echo "=========================================="
echo "🚀 Complete Deployment Process"
echo "=========================================="
echo ""

# Server Configuration
SERVER="136.111.97.150"
USER="qwertauda"
PASSWORD="1234qwer@@"
PROJECT_PATH="/var/www/quality-tickets-system"
PM2_NAME="quality-tickets-system"
PORT=3001

# Step 1: Check Git status
echo "Step 1: Checking Git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "Changes detected:"
    git status --short
    echo ""
    read -p "Do you want to commit these changes? (yes/no): " commit
    if [ "$commit" = "yes" ]; then
        read -p "Enter commit message (or press Enter for default): " commit_message
        if [ -z "$commit_message" ]; then
            commit_message="Update: $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        
        echo "Adding files..."
        git add .
        
        echo "Committing..."
        git commit -m "$commit_message"
        
        echo "✅ Committed successfully!"
    else
        echo "⏭️  Skipping commit"
    fi
else
    echo "✅ No changes to commit"
fi

echo ""

# Step 2: Push to GitHub
echo "Step 2: Pushing to GitHub..."

# Check if remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No GitHub remote found!"
    echo ""
    read -p "Enter GitHub repository URL: " REPO_URL
    if [ -z "$REPO_URL" ]; then
        echo "❌ Repository URL is required"
        exit 1
    fi
    git remote add origin "$REPO_URL"
    echo "✅ Remote added: $REPO_URL"
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
    CURRENT_BRANCH="main"
fi

echo "Pushing to origin/$CURRENT_BRANCH..."
git push -u origin "$CURRENT_BRANCH"

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "❌ Failed to push to GitHub"
    echo "Continuing with server deployment anyway..."
fi

echo ""

# Step 3: Deploy to Server
echo "Step 3: Deploying to Server..."
echo "Server: $SERVER"
echo "Path: $PROJECT_PATH"
echo ""

# Commands to execute on server
COMMANDS="cd $PROJECT_PATH && git pull origin $CURRENT_BRANCH && cd api && npm install && pm2 restart $PM2_NAME && pm2 logs $PM2_NAME --lines 20 --nostream"

# Try to connect using sshpass if available, otherwise use expect
if command -v sshpass &> /dev/null; then
    echo "✅ Using sshpass for password authentication"
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "$COMMANDS"
elif command -v expect &> /dev/null; then
    echo "✅ Using expect for password authentication"
    expect << EOF
    spawn ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "$COMMANDS"
    expect "password:"
    send "$PASSWORD\r"
    expect eof
EOF
else
    echo "❌ Neither sshpass nor expect is available"
    echo ""
    echo "Please run these commands manually:"
    echo ""
    echo "ssh $USER@$SERVER"
    echo "cd $PROJECT_PATH"
    echo "git pull origin $CURRENT_BRANCH"
    echo "cd api"
    echo "npm install"
    echo "pm2 restart $PM2_NAME"
    echo "pm2 logs $PM2_NAME --lines 20"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🌐 Access the application at:"
echo "   http://$SERVER:$PORT"
echo ""

