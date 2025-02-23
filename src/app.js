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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('App Error Handler', {
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  // Handle operational errors
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      status: 'error',
      message: err.message,
      code: err.code
    });
  }

  // Handle programming or unknown errors
  const response = {
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(500).json(response);
});

// Update the initialization
const initializeServer = async () => {
  let server;
  try {
    // Check for existing instance
    const isRunning = await serverManager.checkExistingInstance();
    if (isRunning) {
      throw new Error('Server is already running');
    }

    logger.info('Server', 'Starting server initialization');

    // Initialize services
    const servicesInitialized = await initializeServices();
    if (!servicesInitialized) {
      logger.warn('Server', 'Services initialized with warnings', {
        services: {
          database: sequelize.connectionManager.hasOwnProperty('getConnection') ? 'connected' : 'disconnected',
          redis: redisClient.isReady ? 'connected' : 'disconnected'
        }
      });
    }

    // Use configured port
    const port = parseInt(process.env.PORT, 10) || 3000;
    
    // Check if port is available
    const portAvailable = await serverManager.isPortAvailable(port);
    if (!portAvailable) {
      throw new Error(`Port ${port} is not available`);
    }

    // Start server
    server = app.listen(port);

    // Register this instance
    serverManager.registerInstance();

    // Handle server-specific errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error('Server', `Port ${port} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server', 'Server error occurred', error);
      }
    });

    // Log successful start
    server.on('listening', () => {
      const address = server.address();
      logger.info('Server', `Server running on port ${address.port}`, {
        env: process.env.NODE_ENV,
        port: address.port,
        host: address.address,
        pid: process.pid
      });
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      logger.info('Server', 'Starting graceful shutdown', { signal });

      let shutdownTimeout = setTimeout(() => {
        logger.error('Server', 'Forced shutdown after timeout');
        process.exit(1);
      }, 30000);

      try {
        // Stop accepting new connections
        server.close();

        // Close Redis connection if active
        if (redisClient.client && typeof redisClient.client.quit === 'function') {
          await redisClient.client.quit();
          logger.info('Server', 'Redis connection closed');
        }

        // Close database connection
        if (sequelize.connectionManager.hasOwnProperty('getConnection')) {
          await sequelize.close();
          logger.info('Server', 'Database connections closed');
        }

        // Clean up server instance
        await serverManager.cleanup();
        
        clearTimeout(shutdownTimeout);
        logger.info('Server', 'Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Server', 'Error during shutdown', error);
        await serverManager.cleanup();
        clearTimeout(shutdownTimeout);
        process.exit(1);
      }
    };

    // Handle process signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    signals.forEach(signal => {
      process.on(signal, () => gracefulShutdown(signal));
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Server', 'Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Server', 'Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined
      });
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    return server;
  } catch (error) {
    await serverManager.cleanup();
    logger.error('Server', 'Failed to initialize server', error);
    
    if (server) {
      try {
        await new Promise((resolve) => server.close(resolve));
        logger.info('Server', 'Server closed during failed initialization');
      } catch (closeError) {
        logger.error('Server', 'Error closing server during failed initialization', closeError);
      }
    }
    
    throw error;
  }
};

// Also, let's kill the existing process if it exists (optional)
const killExistingProcess = async (port) => {
  if (process.platform === 'win32') return; // Skip on Windows
  
  try {
    const { execSync } = require('child_process');
    const command = `lsof -i :${port} -t`;
    const pid = execSync(command).toString().trim();
    
    if (pid) {
      logger.warn('Server', `Killing existing process on port ${port} (PID: ${pid})`);
      process.kill(pid, 'SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for process to die
    }
  } catch (error) {
    // Ignore errors - process might not exist
  }
};

// Update the startup code
if (require.main === module) {
  (async () => {
    try {
      const startPort = parseInt(process.env.PORT, 10) || 3000;
      await killExistingProcess(startPort);
      await initializeServer();
    } catch (error) {
      logger.error('Server', 'Fatal error during server startup', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  })();
}

module.exports = app;
