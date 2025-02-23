const cacheService = require('../services/cacheService');
const logger = require('../config/logger');

const cache = (prefix, ttl) => async (req, res, next) => {
  try {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${prefix}:${req.originalUrl}`;
    const cachedData = await cacheService.get(key);

    if (cachedData) {
      logger.info(`Cache hit for key: ${key}`);
      return res.json(cachedData);
    }

    // Store original send function
    const originalSend = res.json;

    // Override res.json method
    res.json = function (body) {
      // Restore original send
      res.json = originalSend;

      // Cache the response
      cacheService.set(key, body, ttl);

      // Send the response
      return res.json(body);
    };

    next();
  } catch (error) {
    logger.error('Cache middleware error:', error);
    next();
  }
};

module.exports = cache;
