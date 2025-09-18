#!/bin/bash

# StoryMagic Development Setup Script
echo "🚀 Setting up StoryMagic Development Environment"
echo "================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if concurrently is installed globally
if ! command -v concurrently &> /dev/null; then
    echo "📦 Installing concurrently globally..."
    npm install -g concurrently
    if [ $? -eq 0 ]; then
        echo "✅ concurrently installed globally"
    else
        echo "❌ Failed to install concurrently"
        exit 1
    fi
else
    echo "✅ concurrently $(concurrently --version) detected"
fi

# Setup Backend
echo ""
echo "🔧 Setting up Backend..."
cd backend

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📋 Copied .env.example to .env"
        echo "⚠️  Please edit .env with your OPENROUTER_API_KEY"
        echo "   Get your key from: https://openrouter.ai/keys"
    else
        echo "❌ .env.example not found in backend directory"
    fi
else
    echo "📋 .env file already exists"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

echo "✅ Backend setup complete"

# Setup Frontend
echo ""
echo "🎨 Setting up Frontend..."
cd ../frontend

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📋 Copied .env.example to .env"
    else
        echo "❌ .env.example not found in frontend directory"
    fi
else
    echo "📋 .env file already exists"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete"

# Back to root
cd ..

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""

# Ask user if they want to start development servers
echo -e "${CYAN}🚀 Would you like to start the development servers now? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo -e "${GREEN}🚀 Starting StoryMagic Development Servers...${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""

    # Run both servers concurrently with color coding
    # Color names: blue for backend, magenta for frontend
    # This provides clear separation of logs for debugging
    concurrently \
      --names "BACKEND,FRONTEND" \
      --prefix "{name}" \
      --prefix-colors "blue,magenta" \
      --handle-input \
      "cd backend && npm run dev" \
      "cd frontend && npm run dev"

else
    echo ""
    echo -e "${YELLOW}📋 Manual Startup Instructions:${NC}"
    echo "  Backend:  cd backend && npm run dev"
    echo "  Frontend: cd frontend && npm run dev"
    echo ""
    echo "  Or run both together with colors:"
    echo "  concurrently --names \"BACKEND,FRONTEND\" --prefix \"{name}\" --prefix-colors \"blue,magenta\" \"cd backend && npm run dev\" \"cd frontend && npm run dev\""
    echo ""
fi

echo ""
echo -e "${GREEN}🌐 URLs:${NC}"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:8080"
echo ""
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo "  1. Add your OPENROUTER_API_KEY to backend/.env"
echo "  2. Test the backend health: curl http://localhost:3001/health"
echo ""
echo -e "${CYAN}🎨 Color Coding:${NC}"
echo "  If you don't see colors, your terminal may not support ANSI colors."
echo "  The text prefixes (BACKEND/FRONTEND) will still clearly separate logs."
echo ""
echo -e "${CYAN}📚 Documentation:${NC}"
echo "  Backend:  backend/README.md"
echo "  Frontend: frontend/README.md"
echo "  Project:  README.md"
