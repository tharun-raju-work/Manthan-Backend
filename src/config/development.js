module.exports = {
  security: {
    rateLimitMax: 1000, // More lenient rate limiting in development
    corsOptions: {
      credentials: true,
      origin: true // Allow all origins in development
    }
  },
  logging: {
    morgan: 'dev',
    level: 'debug'
  }
}; 