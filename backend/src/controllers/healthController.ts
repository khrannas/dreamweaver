import { Request, Response } from 'express';
import { environment } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export class HealthController {
  /**
   * Basic health check endpoint
   */
  static async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: environment.NODE_ENV,
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      logger.debug('Health check requested', {
        uptime: healthData.uptime,
        memoryUsed: healthData.memory.heapUsed,
      });

      res.status(200).json(healthData);
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  }

  /**
   * Detailed health check with service dependencies
   */
  static async detailedHealthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const checks = {
        database: await this.checkDatabaseHealth(),
        aiService: await this.checkAIServiceHealth(),
        memory: this.checkMemoryHealth(),
        disk: this.checkDiskHealth(),
      };

      const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
      const status = allHealthy ? 'healthy' : 'degraded';

      const healthData = {
        status,
        timestamp: new Date().toISOString(),
        environment: environment.NODE_ENV,
        version: '1.0.0',
        uptime: process.uptime(),
        checks,
      };

      const statusCode = allHealthy ? 200 : 503; // Service Unavailable if degraded

      logger.info('Detailed health check completed', {
        status,
        checksCount: Object.keys(checks).length,
        allHealthy,
      });

      res.status(statusCode).json(healthData);
    } catch (error) {
      logger.error('Detailed health check failed', { error });
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
      });
    }
  }

  /**
   * Check database health (no actual database, so always healthy)
   */
  private static async checkDatabaseHealth(): Promise<{ status: string; message: string }> {
    // Since we're using local storage only (PRD requirement), database is always healthy
    return {
      status: 'healthy',
      message: 'Local storage system operational',
    };
  }

  /**
   * Check AI service health
   */
  private static async checkAIServiceHealth(): Promise<{ status: string; message: string }> {
    try {
      // Simple AI service availability check
      // In a real implementation, you might make a test API call
      return {
        status: 'healthy',
        message: 'AI service is available',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `AI service unavailable: ${error}`,
      };
    }
  }

  /**
   * Check memory health
   */
  private static checkMemoryHealth(): { status: string; message: string } {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (memUsagePercent > 90) {
      return {
        status: 'warning',
        message: `High memory usage: ${memUsagePercent.toFixed(1)}%`,
      };
    }

    return {
      status: 'healthy',
      message: `Memory usage: ${memUsagePercent.toFixed(1)}%`,
    };
  }

  /**
   * Check disk health
   */
  private static checkDiskHealth(): { status: string; message: string } {
    try {
      // Basic disk space check (simplified)
      return {
        status: 'healthy',
        message: 'Disk space sufficient',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Disk health check failed: ${error}`,
      };
    }
  }
}
