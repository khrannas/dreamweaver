#!/bin/bash

# StoryMagic Development Setup Script
echo "🚀 Setting up StoryMagic Development Environment"
echo "================================================"

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
echo "🚀 To start development:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 URLs:"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:8080"
echo ""
echo "📝 Don't forget to:"
echo "  1. Add your OPENROUTER_API_KEY to backend/.env"
echo "  2. Test the backend health: curl http://localhost:3001/health"
echo ""
echo "📚 Documentation:"
echo "  Backend:  backend/README.md"
echo "  Frontend: frontend/README.md"
echo "  Integration: FRONTEND_INTEGRATION_GUIDE.md"
