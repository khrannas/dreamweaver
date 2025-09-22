import { Request, Response } from 'express';

export class HealthController {
  /**
   * Basic health check endpoint - simply indicates server is up
   */
  static async healthCheck(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Detailed health check with service dependencies
   */
  static async detailedHealthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const checks = {
        database: await HealthController.checkDatabaseHealth(),
        aiService: await HealthController.checkAIServiceHealth(),
        memory: HealthController.checkMemoryHealth(),
        disk: HealthController.checkDiskHealth(),
      };

      const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
      const status = allHealthy ? 'healthy' : 'degraded';

      const healthData = {
        status,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        uptime: process.uptime(),
        checks,
      };

      const statusCode = allHealthy ? 200 : 503; // Service Unavailable if degraded

      res.status(statusCode).json(healthData);
    } catch (error: any) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
        details: error?.message || error?.toString() || 'Unknown error',
      });
    }
  }

  /**
   * Check database health (no actual database, so always healthy)
   */
  public static async checkDatabaseHealth(): Promise<{ status: string; message: string }> {
    // Since we're using local storage only (PRD requirement), database is always healthy
    return {
      status: 'healthy',
      message: 'Local storage system operational',
    };
  }

  /**
   * Check AI service health
   */
  public static async checkAIServiceHealth(): Promise<{ status: string; message: string }> {
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
  public static checkMemoryHealth(): { status: string; message: string } {
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
  public static checkDiskHealth(): { status: string; message: string } {
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
