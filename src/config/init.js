const { sequelize, testConnection } = require('./database');
const redisClient = require('./redis');
const logger = require('./logger');

const initializeServices = async () => {
  try {
    logger.info('Initialization', 'Starting services initialization');

    // Test database connection
    logger.debug('Database', 'Testing connection');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Database', 'Failed to connect to database');
      return false;
    }
    logger.info('Database', 'Connection successful');

    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      try {
        logger.debug('Database', 'Starting model synchronization');
        await sequelize.sync({ alter: true });
        logger.info('Database', 'Models synchronized successfully');
      } catch (error) {
        logger.error('Database', 'Model synchronization failed', error);
        // Continue even if sync fails
      }
    }

    // Initialize Redis if enabled
    if (process.env.REDIS_ENABLED === 'true') {
      try {
        logger.debug('Redis', 'Starting Redis initialization');
        await redisClient.init();
        const redisStatus = await redisClient.getStatus();
        logger.info('Redis', 'Redis initialization complete', redisStatus);
      } catch (error) {
        logger.error('Redis', 'Redis initialization failed', error);
        // Continue even if Redis fails
      }
    }

    // Log final status
    const status = {
      database: sequelize.connectionManager.hasOwnProperty('getConnection'),
      redis: process.env.REDIS_ENABLED === 'true' ? redisClient.isReady : 'disabled'
    };
    logger.info('Initialization', 'Services initialization complete', { status });

    return true;
  } catch (error) {
    logger.error('Initialization', 'Service initialization failed', error);
    return false;
  }
};

module.exports = {
  initializeServices
};
