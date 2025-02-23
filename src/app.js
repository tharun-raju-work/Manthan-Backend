require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const logger = require('./config/logger');
const routes = require('./routes');
const redisClient = require('./config/redis');
const { initializeServices } = require('./config/init');
const { sequelize } = require('./config/database');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const serverManager = require('./config/server');
const docsRoutes = require('./routes/docs.routes');
const errorHandler = require('./middleware/error.middleware');

// Initialize express app
const app = express();

// // Security middleware
// app.use(helmet({
//   contentSecurityPolicy: process.env.NODE_ENV === 'production',
//   crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production'
// }));

// CORS configuration
// app.use(cors({
//   origin: process.env.CORS_ORIGIN || '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// }));

// Request parsing with limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
    stream: {
      write: message => logger.info('HTTP', message.trim())
    }
  }));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    let redisMetrics = {};
    
    if (redisClient.isReady) {
      const [info, memory] = await Promise.all([
        redisClient.client.info(),
        redisClient.client.memory('STATS')
      ]);

      redisMetrics = {
        info: info.split('\r\n')
          .filter(line => line.includes(':'))
          .reduce((acc, line) => {
            const [key, value] = line.split(':');
            acc[key] = value;
            return acc;
          }, {}),
        memory
      };
    }
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      redis: {
        status: redisStatus,
        enabled: redisClient.enabled,
        metrics: redisMetrics
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API routes
app.use('/api/v1', routes);

// Swagger documentation
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Manthan API Documentation'
  }));
}

// API Documentation - available in non-production environments
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', docsRoutes);
  app.use('/docs', (req, res) => res.redirect('/api-docs')); // Alias
}

// Error handling
app.use(errorHandler);

// Handle Vercel serverless deployment
if (process.env.VERCEL) {
  // Export for serverless
  module.exports = app;
} else {
  // Start server normally
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}
