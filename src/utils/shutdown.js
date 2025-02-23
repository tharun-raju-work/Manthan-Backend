const { logger } = require('../config/logger');
const { sequelize } = require('../config/database');
const mongoose = require('mongoose');

const gracefulShutdown = (server) => {
  const shutdown = async (signal) => {
    logger.info(`${signal} signal received: starting graceful shutdown`);

    // Stop accepting new requests
    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      // Close database connections
      await Promise.all([
        // Close PostgreSQL connection
        sequelize.close().then(() => {
          logger.info('PostgreSQL connection closed');
        }),

        // Close MongoDB connection
        mongoose.connection.close().then(() => {
          logger.info('MongoDB connection closed');
        })
      ]);

      logger.info('All connections closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = gracefulShutdown; 