import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { corsMiddleware } from './middleware/cors.js';
import { generalRateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { validateEnvironment } from './config/environment.js';
import { initializeDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

// Import controllers
import { HealthController } from './controllers/healthController.js';
import { StoryController } from './controllers/storyController.js';
import { storyGenerationRateLimit, storyContentRateLimit } from './middleware/rateLimit.js';

// Validate environment on startup
validateEnvironment();

// Initialize database
initializeDatabase();

// Create Express application
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS middleware
app.use(corsMiddleware);

// Compression middleware
app.use(compression({
  level: 6, // Balanced compression
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Body parsing middleware
app.use(express.json({
  limit: '10mb', // Limit payload size
  strict: true, // Only accept JSON
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
}));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
});

// General rate limiting
app.use('/api', generalRateLimit);

// Health check endpoints (no rate limiting)
app.get('/health', HealthController.healthCheck);
app.get('/api/health', HealthController.healthCheck);

// API Routes
const apiRouter = express.Router();

// Story generation routes
apiRouter.post('/stories/generate', storyGenerationRateLimit, StoryController.generateStories);
apiRouter.post('/stories/:storyId/content', storyContentRateLimit, StoryController.generateStoryContent);
apiRouter.get('/stories/:storyId/next', StoryController.getNextStorySegment);
apiRouter.post('/stories/:storyId/continue', storyContentRateLimit, StoryController.continueStoryWithChoice);
apiRouter.get('/stories/queue', StoryController.getStoryQueue);

// Saved story management routes
apiRouter.get('/stories/saved', StoryController.getSavedStories);
apiRouter.get('/stories/saved/paginated', StoryController.getSavedStoriesPaginated);
apiRouter.get('/stories/saved/:storyId', StoryController.getSavedStory);
apiRouter.delete('/stories/saved/:storyId', StoryController.deleteSavedStory);

// Child profile routes
apiRouter.post('/profiles', StoryController.saveChildProfile);
apiRouter.get('/profiles', StoryController.getChildProfiles);
apiRouter.get('/profiles/:profileId', StoryController.getChildProfile);

// User preferences routes
apiRouter.get('/preferences', StoryController.getUserPreferences);
apiRouter.put('/preferences', StoryController.saveUserPreferences);

// Content safety routes
apiRouter.post('/content/validate', StoryController.validateContent);

// Static data routes
apiRouter.get('/themes', StoryController.getThemes);

// Mount API router
app.use('/api', apiRouter);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export { app };
