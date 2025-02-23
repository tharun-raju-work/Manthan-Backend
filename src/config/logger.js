const path = require('path');
require('dotenv').config();

const winston = require('winston');
require('winston-daily-rotate-file');

// Custom format for better error handling
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, context, timestamp, error, stack, ...meta }) => {
    // Base log entry
    let logEntry = {
      timestamp,
      level,
      context: context || 'App',
      message
    };

    // Add error information if present
    if (error || stack) {
      logEntry.error = {
        message: error?.message || message,
        stack: stack || error?.stack
      };
    }

    // Add any additional metadata
    if (Object.keys(meta).length > 0) {
      logEntry.meta = meta;
    }

    return JSON.stringify(logEntry);
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ level, message, context, timestamp, error, stack, ...meta }) => {
    let log = `${timestamp} [${level}] ${context || 'App'}: ${message}`;
    if (error?.message) {
      log += `\nError: ${error.message}`;
    }
    if (stack) {
      log += `\nStack: ${stack}`;
    }
    if (Object.keys(meta).length > 0) {
      log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

// Create log directory if it doesn't exist
const fs = require('fs');
const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console transport with colored output
    new winston.transports.Console({
      format: consoleFormat
    }),

    // File transport for all logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),

    // Separate file for error logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error'
    })
  ]
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