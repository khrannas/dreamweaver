# StoryMagic Development Setup Script
Write-Host "🚀 Setting up StoryMagic Development Environment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check if Node.js is installed
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check Node.js version
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion.Substring(1).Split('.')[0])

    if ($versionNumber -lt 18) {
        Write-Host "❌ Node.js version 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error checking Node.js version" -ForegroundColor Red
    exit 1
}

# Check if concurrently is installed globally
if (-not (Test-Command "concurrently")) {
    Write-Host "📦 Installing concurrently globally..." -ForegroundColor Yellow
    try {
        npm install -g concurrently
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ concurrently installed globally" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Failed to install concurrently" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "❌ Failed to install concurrently" -ForegroundColor Red
        exit 1
    }
}
else {
    $concurrentlyVersion = (concurrently --version)
    Write-Host "✅ concurrently $concurrentlyVersion detected" -ForegroundColor Green
}

# Setup Backend
Write-Host ""
Write-Host "🔧 Setting up Backend..." -ForegroundColor Blue

# Change to backend directory
$originalLocation = Get-Location
Set-Location "backend"

# Copy environment file if it doesn't exist
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "📋 Copied .env.example to .env" -ForegroundColor Yellow
        Write-Host "⚠️  Please edit .env with your OPENROUTER_API_KEY" -ForegroundColor Yellow
        Write-Host "   Get your key from: https://openrouter.ai/keys" -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ .env.example not found in backend directory" -ForegroundColor Red
    }
}
else {
    Write-Host "📋 .env file already exists" -ForegroundColor Green
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        Set-Location $originalLocation
        exit 1
    }
    Write-Host "✅ Backend setup complete" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
}

# Setup Frontend
Write-Host ""
Write-Host "🎨 Setting up Frontend..." -ForegroundColor Magenta

# Change to frontend directory
Set-Location "../frontend"

# Copy environment file if it doesn't exist
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "📋 Copied .env.example to .env" -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ .env.example not found in frontend directory" -ForegroundColor Red
    }
}
else {
    Write-Host "📋 .env file already exists" -ForegroundColor Green
}

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        Set-Location $originalLocation
        exit 1
    }
    Write-Host "✅ Frontend setup complete" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
}

# Back to root
Set-Location $originalLocation

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""

# Ask user if they want to start development servers
Write-Host "🚀 Would you like to start the development servers now? (y/n)" -ForegroundColor Cyan
$response = Read-Host

if ($response -match "^[yY]([eE][sS])?$") {
    Write-Host ""
    Write-Host "🚀 Starting StoryMagic Development Servers..." -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""

    # Run both servers concurrently with color coding
    # Color names: blue for backend, magenta for frontend
    # This provides clear separation of logs for debugging
    try {
        concurrently `
            --names "BACKEND,FRONTEND" `
            --prefix "{name}" `
            --prefix-colors "blue,magenta" `
            --handle-input `
            "cd backend && npm run dev" `
            "cd frontend && npm run dev"
    }
    catch {
        Write-Host "❌ Failed to start development servers" -ForegroundColor Red
        Write-Host "You can start them manually using the instructions below." -ForegroundColor Yellow
    }
}
else {
    Write-Host ""
    Write-Host "📋 Manual Startup Instructions:" -ForegroundColor Yellow
    Write-Host "  Backend:  cd backend && npm run dev" -ForegroundColor White
    Write-Host "  Frontend: cd frontend && npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "  Or run both together with colors:" -ForegroundColor Yellow
    Write-Host "  concurrently --names `"BACKEND,FRONTEND`" --prefix `"{name}`" --prefix-colors `"blue,magenta`" `"cd backend && npm run dev`" `"cd frontend && npm run dev`"" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "  Frontend: http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "📝 Don't forget to:" -ForegroundColor Yellow
Write-Host "  1. Add your OPENROUTER_API_KEY to backend/.env" -ForegroundColor White
Write-Host "  2. Test the backend health: curl http://localhost:3001/health" -ForegroundColor White
Write-Host ""
Write-Host "🎨 Color Coding:" -ForegroundColor Cyan
Write-Host "  If you don't see colors, your terminal may not support ANSI colors." -ForegroundColor White
Write-Host "  The text prefixes (BACKEND/FRONTEND) will still clearly separate logs." -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  Backend:  backend/README.md" -ForegroundColor White
Write-Host "  Frontend: frontend/README.md" -ForegroundColor White
Write-Host "  Project:  README.md" -ForegroundColor White


