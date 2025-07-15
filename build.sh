#!/bin/bash

# Render Build Script for BracketEsports Backend
echo "🚀 Starting BracketEsports Backend Build..."

# Set memory limits for Node.js
export NODE_OPTIONS="--max-old-space-size=1024"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Verify critical files exist
echo "🔍 Verifying project files..."
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

# Check environment variables
echo "🔧 Checking environment variables..."
if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  Warning: MONGODB_URI not set"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  Warning: JWT_SECRET not set"
fi

echo "✅ Build completed successfully!"
echo "🏆 BracketEsports Backend ready for deployment!"
