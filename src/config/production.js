module.exports = {
  security: {
    rateLimitMax: 100,
    corsOptions: {
      credentials: true,
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  },
  logging: {
    morgan: 'combined',
    level: 'info'
  }
}; 