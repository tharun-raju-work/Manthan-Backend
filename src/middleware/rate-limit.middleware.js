const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');
const { logError, logInfo } = require('../utils/logger.helper');

// Initialize store with memory fallback
const getStore = async () => {
  try {
    if (!redisClient.enabled || !redisClient.isReady) {
      logInfo('RateLimit', 'Using memory store for rate limiting');
      return new rateLimit.MemoryStore();
    }

    return new RedisStore({
      client: redisClient.client,
      prefix: 'rate-limit:',
      sendCommand: (...args) => redisClient.client.call(...args)
    });
  } catch (error) {
    logError('RateLimit', 'Redis store creation failed, using memory store', error);
    return new rateLimit.MemoryStore();
  }
};

// Pre-configured limiter options
const limiterConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    keyGenerator: (req) => `auth:${req.ip}`,
    handler: (req, res) => {
      logError('RateLimit', 'Too many authentication attempts', {
        ip: req.ip,
        path: req.path
      });
      res.status(429).json({
        status: 'error',
        message: 'Too many authentication attempts, please try again later.'
      });
    }
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    keyGenerator: (req) => req.user ? `api:${req.user.id}` : `api:${req.ip}`
  },
  invitation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 invitations per hour
    keyGenerator: (req) => `invitation:${req.user.id}`,
    handler: (req, res) => {
      logError('RateLimit', 'Too many invitation attempts', {
        userId: req.user.id
      });
      res.status(429).json({
        status: 'error',
        message: 'Too many invitations sent, please try again later.'
      });
    }
  }
};

// Create rate limiter middleware
const createRateLimiter = async (type) => {
  const config = limiterConfigs[type];
  if (!config) {
    throw new Error(`Unknown rate limiter type: ${type}`);
  }

  const store = await getStore();
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    store,
    ...config
  });
};

// Middleware wrapper to ensure limiter is initialized
const rateLimiterMiddleware = (type) => {
  let limiter;

  return async (req, res, next) => {
    try {
      if (!limiter) {
        limiter = await createRateLimiter(type);
      }
      return limiter(req, res, next);
    } catch (error) {
      logError('RateLimit', `Rate limiter middleware error: ${type}`, error);
      // Continue without rate limiting if there's an error
      next();
    }
  };
};

module.exports = {
  authLimiter: rateLimiterMiddleware('auth'),
  apiLimiter: rateLimiterMiddleware('api'),
  invitationLimiter: rateLimiterMiddleware('invitation')
}; 