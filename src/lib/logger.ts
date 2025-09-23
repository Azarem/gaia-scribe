/**
 * Simple logging utility for the application
 * Provides consistent logging with different levels and can be easily configured for production
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO

  constructor() {
    // In development, show all logs
    if (import.meta.env.DEV) {
      this.level = LogLevel.DEBUG
    }
  }

  setLevel(level: LogLevel) {
    this.level = level
  }

  debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, ...args: any[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  }

  // Platform-specific logging methods
  platform = {
    loading: (action: string, details?: any) => {
      this.debug(`Platform ${action}`, details)
    },
    
    realtime: (event: string, details?: any) => {
      this.debug(`Platform realtime: ${event}`, details)
    },
    
    import: (step: string, details?: any) => {
      this.info(`Platform import: ${step}`, details)
    },
    
    error: (operation: string, error: any) => {
      this.error(`Platform ${operation} failed`, error)
    }
  }
}

// Export a singleton instance
export const logger = new Logger()

// Export convenience functions
export const { debug, info, warn, error } = logger
