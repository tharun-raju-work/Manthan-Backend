const { logger } = require('../config/logger');

class ProcessManager {
  constructor(server) {
    this.server = server;
    this.isShuttingDown = false;
  }

  handleSignals() {
    process.on('SIGTERM', this.handleSignal.bind(this, 'SIGTERM'));
    process.on('SIGINT', this.handleSignal.bind(this, 'SIGINT'));
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
  }

  async handleSignal(signal) {
    try {
      if (this.isShuttingDown) {
        logger.warn(`Received ${signal} during shutdown, ignoring`);
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown`);

      await this.shutdown();
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  async handleUncaughtException(error) {
    logger.error('Uncaught Exception:', error);
    try {
      await this.shutdown(1);
    } catch (shutdownError) {
      logger.error('Error during shutdown after uncaught exception:', shutdownError);
      process.exit(1);
    }
  }

  async handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    try {
      await this.shutdown(1);
    } catch (shutdownError) {
      logger.error('Error during shutdown after unhandled rejection:', shutdownError);
      process.exit(1);
    }
  }

  async shutdown(exitCode = 0) {
    try {
      // Close server
      await new Promise((resolve, reject) => {
        this.server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });

      logger.info('Server closed successfully');
      process.exit(exitCode);
    } catch (error) {
      logger.error('Error during server shutdown:', error);
      process.exit(1);
    }
  }
}

module.exports = ProcessManager; 