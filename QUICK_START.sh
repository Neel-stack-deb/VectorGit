#!/bin/bash

# VectorGit Quick Start Demo Script

echo "🚀 VectorGit MVP - Quick Start Demo"
echo "=================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --quiet

# Check for .env
if [ ! -f .env ]; then
    echo "⚠️  .env not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your OPENAI_API_KEY"
    exit 1
fi

# Initialize
echo ""
echo "📦 Step 1: Initializing VectorGit..."
node cli.js init

# Create baseline with v1 (correct code)
echo ""
echo "📝 Step 2: Creating baseline with correct code..."
cp demo_auth_v1.js auth.js
node cli.js analyze

# Introduce breaking changes
echo ""
echo "⚠️  Step 3: Introducing semantic regression..."
cp demo_auth_v2.js auth.js
echo "Running detection..."
node cli.js commit

echo ""
echo "✅ Demo complete!"
echo ""
echo "📚 Read BUILD_SUMMARY.md for detailed documentation"
