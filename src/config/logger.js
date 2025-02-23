const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Custom format for better error handling
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, context, timestamp, error, stack, ...meta }) => {
    let logEntry = {
      timestamp,
      level,
      context: context || 'App',
      message
    };

    if (error || stack) {
      logEntry.error = {
        message: error?.message || message,
        stack: stack || error?.stack
      };
    }

    if (Object.keys(meta).length > 0) {
      logEntry.meta = meta;
    }

    return JSON.stringify(logEntry);
  })
);

// Configure transports based on environment
const getTransports = () => {
  const transports = [];

  // Always add console transport
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    })
  );

  // Add file transports only in development and when not in a read-only filesystem
  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      
      // Try to create logs directory
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Add rotating file transports
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles: '14d',
          format: customFormat
        }),
        new winston.transports.DailyRotateFile({
          filename: path.join(logsDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d',
          format: customFormat
        })
      );
    } catch (error) {
      console.warn('Unable to create log files, falling back to console only logging:', error.message);
    }
  }

  return transports;
};

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: getTransports()
});

// Add helper methods for consistent logging
const enhancedLogger = {
  info: (context, message, meta = {}) => {
    logger.info(message, { context, ...meta });
  },
  error: (context, message, error = null) => {
    logger.error(message, {
      context,
      error: error instanceof Error ? error : new Error(error?.message || message),
      stack: error?.stack
    });
  },
  warn: (context, message, meta = {}) => {
    logger.warn(message, { context, ...meta });
  },
  debug: (context, message, meta = {}) => {
    logger.debug(message, { context, ...meta });
  }
};

module.exports = enhancedLogger; 