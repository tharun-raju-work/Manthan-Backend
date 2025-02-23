const cluster = require('cluster');
const os = require('os');
const { logger } = require('../config/logger');

class ClusterManager {
  constructor(config) {
    this.numCPUs = config.cluster?.workers || os.cpus().length;
    this.isEnabled = config.cluster?.enabled !== false;
  }

  initialize() {
    if (!this.isEnabled) {
      logger.info('Clustering disabled, running in single process mode');
      return false;
    }

    if (cluster.isPrimary) {
      logger.info(`Primary ${process.pid} is running`);

      // Fork workers
      for (let i = 0; i < this.numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died. Code: ${code}, Signal: ${signal}`);
        logger.info('Starting a new worker...');
        cluster.fork();
      });

      cluster.on('online', (worker) => {
        logger.info(`Worker ${worker.process.pid} is online`);
      });

      return true;
    }

    logger.info(`Worker ${process.pid} started`);
    return false;
  }

  static handleWorkerErrors() {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception in worker:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection in worker:', reason);
      process.exit(1);
    });
  }
}

module.exports = ClusterManager; 