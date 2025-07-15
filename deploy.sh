#!/bin/bash

# Deployment Script for Bracketesport Backend
# This script helps you deploy to various platforms

echo "🚀 Bracketesport Backend Deployment Script"
echo "=========================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please run: git init"
    exit 1
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Commit them first:"
    git status --short
    exit 1
fi

echo "Select deployment platform:"
echo "1) Render.com (Recommended)"
echo "2) Railway"
echo "3) Vercel"
echo "4) Docker Build"
echo "5) Exit"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "📦 Deploying to Render..."
        echo "1. Push your code to GitHub:"
        echo "   git push origin main"
        echo ""
        echo "2. Visit https://render.com and:"
        echo "   - Create new Web Service"
        echo "   - Connect your GitHub repository"
        echo "   - Build Command: npm install"
        echo "   - Start Command: npm start"
        echo ""
        echo "3. Add environment variables from .env.production.template"
        echo ""
        echo "4. Deploy!"
        ;;
    2)
        echo "🚂 Deploying to Railway..."
        if ! command -v railway &> /dev/null; then
            echo "Installing Railway CLI..."
            npm install -g @railway/cli
        fi
        echo "Run these commands:"
        echo "  railway login"
        echo "  railway init"
        echo "  railway up"
        ;;
    3)
        echo "⚡ Deploying to Vercel..."
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        echo "Run: vercel"
        ;;
    4)
        echo "🐳 Building Docker image..."
        docker build -t bracketesport-backend .
        echo "✅ Docker image built successfully!"
        echo "To run locally: docker run -p 5000:5000 bracketesport-backend"
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please select 1-5."
        exit 1
        ;;
esac

echo ""
echo "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo "🔧 Don't forget to set up your environment variables!"
