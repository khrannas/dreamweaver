# StoryMagic: AI-Powered Personalized Bedtime Stories

🎭 **Create magical, personalized bedtime stories for children with AI**

StoryMagic is a progressive web application that combines the power of AI with the magic of storytelling to create personalized bedtime experiences for children. The app features a robust backend with AI integration and a beautiful React frontend with seamless user experience.

## 🌟 Features

### ✨ **AI-Powered Stories**
- Personalized stories based on child's profile (name, age, interests, favorites)
- Multiple story themes (Adventure, Space, Animal Friends, etc.)
- AI-generated content with 3 unique story options per request
- Sleep-optimized 3-phase story structure (Engagement → Transition → Wind-down)

### 🎨 **Beautiful User Experience**
- Modern React frontend with shadcn/ui components
- Progressive enhancement - works with or without backend
- Responsive design for all devices
- Smooth animations and magical UI elements

### 🔧 **Robust Backend**
- Node.js/Express API with TypeScript
- OpenRouter AI integration with multiple model fallbacks
- Comprehensive content safety and age-appropriate filtering
- Docker-ready deployment with Zeabur

### 🛡️ **Safety & Compliance**
- COPPA-compliant child data handling
- Multi-layer content safety validation
- Age-appropriate language and themes
- Secure API with rate limiting and CORS

## 📁 Project Structure

```
storymagic/
├── backend/                    # AI-powered backend API
│   ├── src/
│   │   ├── config/            # OpenRouter & environment config
│   │   ├── controllers/       # API route handlers
│   │   ├── services/          # AI & content safety services
│   │   ├── middleware/        # Security & error handling
│   │   ├── types/             # TypeScript definitions
│   │   └── utils/             # Validation & logging utilities
│   ├── .env.example           # Environment variables template
│   ├── Dockerfile             # Container configuration
│   └── README.md              # Backend documentation
├── frontend/                   # React PWA frontend
│   ├── src/
│   │   ├── lib/               # API client & utilities
│   │   ├── pages/             # React components
│   │   ├── components/        # Reusable UI components
│   │   └── hooks/             # Custom React hooks
│   ├── .env.example           # Frontend environment config
│   └── README.md              # Frontend documentation
├── AI-STORY-BACKEND-PLAN.md   # Comprehensive backend plan
├── FRONTEND_INTEGRATION_GUIDE.md # Integration guide
├── setup.sh                   # Quick setup script
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- OpenRouter API key (for AI features)

### Automated Setup

```bash
# Clone the repository
git clone <repository-url>
cd storymagic

# Run the automated setup script
./setup.sh
```

This script will:
- ✅ Check Node.js version compatibility
- 📋 Copy environment variable templates
- 📦 Install dependencies for both backend and frontend
- 💡 Provide next steps instructions

### Manual Setup

If you prefer manual setup:

```bash
# Backend setup
cd backend
cp .env.example .env
# Edit .env with your OPENROUTER_API_KEY
npm install
npm run dev

# Frontend setup (in a new terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

## 🌐 Development URLs

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🔧 Environment Variables

### Backend (.env)
```bash
# Required for AI features
OPENROUTER_API_KEY=your_api_key_here

# Optional
NODE_ENV=development
PORT=3001
SENTRY_DSN=your_sentry_dsn
```

### Frontend (.env)
```bash
# Backend API URL
VITE_API_BASE=http://localhost:3001/api
```

## 🎯 Progressive Enhancement

StoryMagic is designed with **progressive enhancement** - the app works beautifully at every level:

1. **Full Experience**: Backend + AI = Personalized stories
2. **Enhanced Experience**: Backend only = Generated stories
3. **Basic Experience**: Frontend only = Local stories
4. **Offline Experience**: PWA with cached stories

## 🚀 Deployment

### Backend (Zeabur)
```bash
# Build and deploy
cd backend
docker build -t storymagic-backend .
# Deploy to Zeabur with environment variables
```

### Frontend (Vercel)
```bash
# Deploy to Vercel
cd frontend
npm run build
# Deploy build folder to Vercel
```

## 📚 Documentation

- **[Backend API Documentation](./backend/README.md)**
- **[Frontend Documentation](./frontend/README.md)**
- **[Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md)**
- **[Backend Implementation Plan](./AI-STORY-BACKEND-PLAN.md)**

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests (if available)
cd frontend && npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure everything works
5. Submit a pull request

## 📄 License

This project is built for creating magical bedtime experiences for children.

## 🙏 Acknowledgments

- **OpenRouter** for AI API access
- **Zeabur** for backend deployment
- **Vercel** for frontend hosting
- **shadcn/ui** for beautiful UI components

---

**Made with ❤️ for creating magical moments with children** ✨
