import cors from 'cors';

export const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);

    // Allow Vercel deployments (frontend)
    if (origin.includes('vercel.app')) return callback(null, true);

    // In production, you might want to restrict to specific domains
    // For now, allow all origins (configure based on your needs)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400, // 24 hours
});
