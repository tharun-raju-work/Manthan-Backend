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
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        keyPrefix: process.env.REDIS_PREFIX || 'manthan:',
        lazyConnect: false,
        showFriendlyErrorStack: true,
        enableReadyCheck: true,
        autoResubscribe: true,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 2000);
          logger.info('Redis', `Retrying connection in ${delay}ms`);
          return delay;
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis', 'Connected to Redis server');
      });

      this.client.on('ready', () => {
        this.isReady = true;
        logger.info('Redis', 'Redis client is ready');
      });

      this.client.on('error', (error) => {
        this.isReady = false;
        logger.error('Redis', 'Redis client error', error);
      });

      this.client.on('close', () => {
        this.isReady = false;
        logger.warn('Redis', 'Redis connection closed');
      });

      // Test connection
      await this.client.ping();
      this.isReady = true;
      logger.info('Redis', 'Redis connection test successful');

      return this;
    } catch (error) {
      logger.error('Redis', 'Failed to initialize Redis client', error);
      this.isReady = false;
      return this;
    }
  }

  async ping() {
    if (!this.client) return false;
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis', 'Ping failed', error);
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
    console.log('Redis status:', await redisClient.getStatus());
  } catch (error) {
    console.error('Redis initialization error:', error);
  }
})();

module.exports = redisClient;
