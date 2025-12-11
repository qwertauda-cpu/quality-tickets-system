#!/bin/bash

# Script to push project to GitHub
# Usage: bash push-to-github.sh

echo "=========================================="
echo "🚀 Pushing to GitHub"
echo "=========================================="
echo ""

# Check if remote exists
if git remote get-url origin > /dev/null 2>&1; then
    echo "✅ Remote 'origin' already exists"
    git remote -v
else
    echo "❌ No remote 'origin' found"
    echo ""
    read -p "Enter GitHub repository URL: " REPO_URL
    if [ -z "$REPO_URL" ]; then
        echo "❌ Repository URL is required"
        exit 1
    fi
    git remote add origin "$REPO_URL"
    echo "✅ Remote added: $REPO_URL"
fi

echo ""
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Successfully pushed to GitHub!"
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "❌ Failed to push to GitHub"
    echo "=========================================="
    echo ""
    echo "Make sure:"
    echo "  1. Repository exists on GitHub"
    echo "  2. You have push permissions"
    echo "  3. You're authenticated (git config --global user.name/email)"
fi

