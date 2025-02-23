const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');
const { logError } = require('../utils/logger.helper');

// Create store only when Redis is ready
const createRedisStore = () => {
  if (!redisClient.isReady) {
    throw new Error('Redis client is not ready');
  }

  return new RedisStore({
    client: redisClient.client,
    prefix: 'rate-limit:',
    // Ensure we're using the correct command method
    sendCommand: async (...args) => {
      try {
        return await redisClient.client.call(...args);
      } catch (error) {
        logError('RateLimit', 'Redis command failed', error);
        throw error;
      }
    }
  });
};

// Export a function that ensures Redis is ready
module.exports = {
  createStore: async () => {
    try {
      // Initialize Redis if not already initialized
      if (!redisClient.isReady) {
        await redisClient.init();
      }
      return createRedisStore();
    } catch (error) {
      logError('RateLimit', 'Failed to create Redis store', error);
      throw error;
    }
  }
}; 