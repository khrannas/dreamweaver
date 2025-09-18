import { app } from './app.js';
import { environment } from './config/environment.js';
import { logger } from './utils/logger.js';

const PORT = environment.PORT;

// Start the server
const server = app.listen(PORT, () => {
  logger.info('StoryMagic Backend Server Started', {
    port: PORT,
    environment: environment.NODE_ENV,
    nodeVersion: process.version,
  });

  console.log(`🚀 StoryMagic Backend Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${environment.NODE_ENV}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, initiating graceful shutdown`);

  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err });
      process.exit(1);
    }

    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { server };
