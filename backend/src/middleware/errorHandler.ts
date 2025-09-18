import { Request, Response, NextFunction } from 'express';
import { APIError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { environment } from '../config/environment.js';

export function errorHandler(
  error: Error | APIError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Determine if this is an APIError or generic Error
  const isAPIError = (error as APIError).statusCode !== undefined;

  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';

  if (isAPIError) {
    const apiError = error as APIError;
    statusCode = apiError.statusCode;
    message = apiError.message;
    code = apiError.code;
  } else {
    // Handle common error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      code = 'VALIDATION_ERROR';
    } else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
      message = 'Unauthorized';
      code = 'UNAUTHORIZED';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      message = error.message;
      code = 'RATE_LIMIT_EXCEEDED';
    }
  }

  // Create error response
  const errorResponse: APIError = {
    name: error.name || 'APIError',
    message,
    code,
    statusCode,
    ...(environment.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.message,
    }),
  };

  res.status(statusCode).json({
    error: errorResponse,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  const error: APIError = {
    name: 'APIError',
    message: 'Endpoint not found',
    code: 'NOT_FOUND',
    statusCode: 404,
  };

  res.status(404).json({
    error,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
}

export function createAPIError(
  message: string,
  code: string,
  statusCode: number = 500,
  details?: any
): APIError {
  return {
    name: 'APIError',
    message,
    code,
    statusCode,
    details,
  };
}
