# StoryMagic Backend

AI-powered bedtime story generator backend service built with Node.js, Express, and TypeScript. Integrates with OpenRouter for multiple AI models including ArliAI QwQ 32B RpR v1.

## Features

- **AI-Powered Story Generation**: Generate personalized bedtime stories using advanced AI models
- **Content Safety**: Multi-layer safety validation for age-appropriate content
- **Interactive Stories**: Support for choice points and branching narratives
- **Sleep-Optimized Structure**: 3-phase story structure (Engagement → Transition → Wind-down)
- **COPPA Compliance**: Local-first architecture, no child data storage
- **Rate Limiting**: Built-in protection against abuse
- **Docker Ready**: Containerized deployment for Zeabur

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **AI Integration**: OpenRouter API
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting
- **Deployment**: Docker + Zeabur

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- OpenRouter API key

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your configuration
   nano .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build and run manually
docker build -t storymagic-backend .
docker run -p 3001:3001 --env-file .env storymagic-backend
```

## API Endpoints

### Health Checks
- `GET /health` - Basic health check
- `GET /api/health` - Detailed health check with service status

### Story Generation
- `POST /api/stories/generate` - Generate 3 story options
- `POST /api/stories/{storyId}/content` - Generate full story content
- `GET /api/stories/queue` - Get story queue with previews

### Content Safety
- `POST /api/content/validate` - Validate story content safety

### Static Data
- `GET /api/themes` - Get available story themes

## API Usage Examples

### Generate Story Options

```bash
curl -X POST http://localhost:3001/api/stories/generate \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "name": "Emma",
      "age": 6,
      "favoriteAnimal": "unicorn",
      "favoriteColor": "purple",
      "bestFriend": "Bella"
    },
    "count": 3
  }'
```

### Generate Story Content

```bash
curl -X POST http://localhost:3001/api/stories/story_123/content \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "name": "Emma",
      "age": 6,
      "favoriteAnimal": "unicorn",
      "favoriteColor": "purple"
    }
  }'
```

## Environment Variables

See `.env.example` for all available environment variables. Copy it to `.env` and configure as needed.

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode (development/production/test) | No | `development` |
| `PORT` | Server port | No | `3001` |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI generation | Yes (production) | - |
| `BACKEND_URL` | Backend URL for internal configuration | No | `http://localhost:3001` |
| `SENTRY_DSN` | Sentry DSN for error monitoring | No | - |

## AI Models

The backend uses a fallback chain of AI models via OpenRouter:

1. **Primary**: ArliAI QwQ 32B RpR v1 (Free, high-quality creative writing)
2. **Secondary**: TheDrummer/Rocinante-12B (Cost-effective backup)
3. **Tertiary**: Mistral Nemo 12B Celeste (Additional fallback)

## Development

### Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server startup
├── database/
│   └── templates/       # Story templates
├── tests/               # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

### Zeabur Deployment

1. **Connect Repository**: Link your GitHub repository to Zeabur
2. **Environment Variables**: Set `OPENROUTER_API_KEY` in Zeabur dashboard
3. **Deploy**: Zeabur will automatically build and deploy using the included Dockerfile

### Manual Docker Deployment

```bash
# Build image
docker build -t storymagic-backend .

# Run container
docker run -d \
  --name storymagic-backend \
  -p 3001:3001 \
  -e OPENROUTER_API_KEY=your_api_key \
  storymagic-backend
```

## Monitoring

- **Health Checks**: Built-in health endpoints for monitoring
- **Logging**: Structured logging with Winston
- **Rate Limiting**: Automatic request throttling
- **Error Handling**: Comprehensive error handling and reporting

## Security

- **Helmet**: Security headers
- **CORS**: Configured cross-origin policies
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Zod schema validation
- **Content Safety**: Multi-layer content filtering

## Contributing

1. Follow the existing code style and structure
2. Add tests for new features
3. Update documentation as needed
4. Ensure all linting passes

## License

This project is part of the StoryMagic application, focused on creating safe, personalized bedtime stories for children.
