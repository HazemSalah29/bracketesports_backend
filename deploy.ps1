# Deployment Script for Bracketesport Backend (Windows PowerShell)
# This script helps you deploy to various platforms

Write-Host "🚀 Bracketesport Backend Deployment Script" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "❌ Git repository not found. Please run: git init" -ForegroundColor Red
    exit 1
}

# Check if there are uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes. Commit them first:" -ForegroundColor Yellow
    git status --short
    exit 1
}

Write-Host ""
Write-Host "Select deployment platform:" -ForegroundColor Cyan
Write-Host "1) Render.com (Recommended)" -ForegroundColor White
Write-Host "2) Railway" -ForegroundColor White
Write-Host "3) Vercel" -ForegroundColor White
Write-Host "4) Docker Build" -ForegroundColor White
Write-Host "5) Local Test" -ForegroundColor White
Write-Host "6) Exit" -ForegroundColor White

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host "📦 Deploying to Render..." -ForegroundColor Green
        Write-Host ""
        Write-Host "1. Push your code to GitHub:" -ForegroundColor Yellow
        Write-Host "   git add ." -ForegroundColor Gray
        Write-Host "   git commit -m 'Ready for deployment'" -ForegroundColor Gray
        Write-Host "   git push origin main" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Visit https://render.com and:" -ForegroundColor Yellow
        Write-Host "   - Create new Web Service" -ForegroundColor Gray
        Write-Host "   - Connect your GitHub repository" -ForegroundColor Gray
        Write-Host "   - Build Command: npm install" -ForegroundColor Gray
        Write-Host "   - Start Command: npm start" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Add environment variables from .env.production.template" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "4. Deploy!" -ForegroundColor Yellow
    }
    "2" {
        Write-Host "🚂 Deploying to Railway..." -ForegroundColor Green
        $railwayExists = Get-Command railway -ErrorAction SilentlyContinue
        if (-not $railwayExists) {
            Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
            npm install -g @railway/cli
        }
        Write-Host "Run these commands:" -ForegroundColor Yellow
        Write-Host "  railway login" -ForegroundColor Gray
        Write-Host "  railway init" -ForegroundColor Gray
        Write-Host "  railway up" -ForegroundColor Gray
    }
    "3" {
        Write-Host "⚡ Deploying to Vercel..." -ForegroundColor Green
        $vercelExists = Get-Command vercel -ErrorAction SilentlyContinue
        if (-not $vercelExists) {
            Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
            npm install -g vercel
        }
        Write-Host "Run: vercel" -ForegroundColor Yellow
    }
    "4" {
        Write-Host "🐳 Building Docker image..." -ForegroundColor Green
        docker build -t bracketesport-backend .
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker image built successfully!" -ForegroundColor Green
            Write-Host "To run locally: docker run -p 5000:5000 bracketesport-backend" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Docker build failed!" -ForegroundColor Red
        }
    }
    "5" {
        Write-Host "🧪 Testing locally..." -ForegroundColor Green
        Write-Host "Make sure you have .env file configured" -ForegroundColor Yellow
        Write-Host "Starting development server..." -ForegroundColor Yellow
        npm run dev
    }
    "6" {
        Write-Host "👋 Goodbye!" -ForegroundColor Green
        exit 0
    }
    default {
        Write-Host "❌ Invalid choice. Please select 1-6." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host "🔧 Don't forget to set up your environment variables!" -ForegroundColor Cyan
