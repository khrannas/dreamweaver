import { environment } from '../config/environment.js';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export class Logger {
  private static instance: Logger;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  debug(message: string, meta?: any): void {
    if (environment.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };

    // Use structured logging in development, simple logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(logData));
    } else {
      const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage, meta || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, meta || '');
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, meta || '');
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage, meta || '');
          break;
      }
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
