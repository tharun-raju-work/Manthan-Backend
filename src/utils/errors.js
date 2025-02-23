class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class DatabaseError extends ApiError {
  constructor(message, originalError = null) {
    super(503, message, true);
    this.type = 'DatabaseError';
    this.originalError = originalError;
  }
}

class ValidationError extends ApiError {
  constructor(message, errors = []) {
    super(400, message, true);
    this.type = 'ValidationError';
    this.errors = errors;
  }
}

class AuthenticationError extends ApiError {
  constructor(message) {
    super(401, message, true);
    this.type = 'AuthenticationError';
  }
}

module.exports = {
  ApiError,
  DatabaseError,
  ValidationError,
  AuthenticationError
};
