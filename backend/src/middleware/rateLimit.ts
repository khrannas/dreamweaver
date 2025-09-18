import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiting (for production, consider Redis or similar)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
const RATE_LIMITS = {
  // Story generation: 10 requests per hour per IP
  storyGeneration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
  // Story content: 20 requests per hour per IP
  storyContent: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
  },
  // General API: 100 requests per hour per IP
  general: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
  },
};

export function createRateLimitMiddleware(config: typeof RATE_LIMITS.general) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${clientIP}:${req.path}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000);

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn,
        limit: config.maxRequests,
        windowMs: config.windowMs,
      });
      return;
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': (config.maxRequests - entry.count).toString(),
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
    });

    next();
  };
}

// Specific rate limiters for different endpoints
export const storyGenerationRateLimit = createRateLimitMiddleware(RATE_LIMITS.storyGeneration);
export const storyContentRateLimit = createRateLimitMiddleware(RATE_LIMITS.storyContent);
export const generalRateLimit = createRateLimitMiddleware(RATE_LIMITS.general);

// Cleanup old entries periodically (simple implementation)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
