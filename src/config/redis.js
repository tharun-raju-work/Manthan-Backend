const Redis = require('ioredis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.isReady = false;
    this.client = null;
    this.enabled = process.env.REDIS_ENABLED === 'true';
  }

  async init() {
    if (!this.enabled) {
      logger.info('Redis', 'Redis is disabled, skipping initialization');
      return this;
    }

    try {
      logger.info('Redis', 'Initializing Redis client');
      
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB) || 0,
        tls: process.env.REDIS_TLS === 'true' ? {} : null,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 2000);
          logger.info('Redis', `Retrying connection in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 1
      });

      this.client.on('connect', () => {
        logger.info('Redis', 'Connected to Redis');
      });

      this.client.on('ready', () => {
        this.isReady = true;
        logger.info('Redis', 'Redis client is ready');
      });

      this.client.on('error', (error) => {
        logger.error('Redis', 'Redis client error', error);
      });

      this.client.on('close', () => {
        this.isReady = false;
        logger.warn('Redis', 'Redis connection closed');
      });

      // Test connection
      await this.client.ping();
      
    } catch (error) {
      logger.error('Redis', 'Failed to initialize Redis client', error);
      this.enabled = false;
    }

    return this;
  }

  async ping() {
    try {
      if (!this.enabled || !this.client) return false;
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStatus() {
    return {
      enabled: this.enabled,
      isReady: this.isReady,
      connected: this.client?.status === 'ready'
    };
  }
}

// Create singleton instance
const redisClient = new RedisClient();

// Initialize Redis
(async () => {
  try {
    await redisClient.init();
  } catch (error) {
    logger.error('Redis', 'Redis initialization error:', error);
  }
})();

module.exports = redisClient;
