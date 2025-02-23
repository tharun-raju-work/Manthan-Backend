class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class MetricsError extends AppError {
  constructor(message, errorCode = 'METRICS_ERROR') {
    super(message, 503, errorCode);
    this.name = 'MetricsError';
  }
}

class ConfigurationError extends AppError {
  constructor(message, errorCode = 'CONFIG_ERROR') {
    super(message, 500, errorCode);
    this.name = 'ConfigurationError';
  }
}

class ValidationError extends AppError {
  constructor(message, errors = [], errorCode = 'VALIDATION_ERROR') {
    super(message, 400, errorCode);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class ServiceError extends AppError {
  constructor(message, service, errorCode = 'SERVICE_ERROR') {
    super(message, 503, errorCode);
    this.name = 'ServiceError';
    this.service = service;
  }
}

module.exports = {
  AppError,
  MetricsError,
  ConfigurationError,
  ValidationError,
  ServiceError
}; 