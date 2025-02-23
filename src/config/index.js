const path = require('path');
require('dotenv').config();
const redis = require('./redis');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  httpsPort: process.env.HTTPS_PORT || 443,

  // Cluster settings
  cluster: {
    enabled: process.env.ENABLE_CLUSTERING === 'true',
    workers: parseInt(process.env.CLUSTER_WORKERS, 10) || undefined
  },

  // Server settings
  api: {
    prefix: '/api',
    version: '/v1'
  },

  // Security settings
  security: {
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS || 900000,
    rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  },

  // Database settings
  postgres: {
    url: process.env.POSTGRES_URL,
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS, 10) || 20,
    ssl: process.env.POSTGRES_SSL === 'true'
  },

  mongodb: {
    url: process.env.MONGODB_URL,
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 100
  },

  // Logging settings
  logs: {
    dir: path.join(__dirname, '../logs'),
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    maxSize: '10m',
    maxFiles: 5
  },

  // SSL settings
  ssl: process.env.NODE_ENV === 'production' ? {
    key: process.env.SSL_KEY_PATH,
    cert: process.env.SSL_CERT_PATH,
    ca: process.env.SSL_CA_PATH
  } : null,

  // Error handling configuration
  errors: {
    aggregationWindow: 5 * 60 * 1000, // 5 minutes
    thresholds: {
      METRICS_ERROR: 5,
      SERVICE_ERROR: 3,
      VALIDATION_ERROR: 10,
      '*': 20
    },
    recovery: {
      enabled: true,
      maxAttempts: 3,
      backoffMs: 1000 // Initial backoff time
    }
  },

  // Alerting configuration
  alerts: {
    webhook: process.env.ALERT_WEBHOOK_URL,
    email: {
      enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
      recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || []
    },
    slack: {
      enabled: process.env.ALERT_SLACK_ENABLED === 'true',
      webhook: process.env.ALERT_SLACK_WEBHOOK
    }
  },

  // Add Redis configuration
  redis,

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Rate limits
  rateLimits: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 100 // max 100 requests per window
  },

  oauth: require('./oauth.config'),
};

// Environment-specific overrides
try {
  const envConfig = require(`./${config.env}`);
  Object.assign(config, envConfig);
} catch (error) {
  console.warn(`No configuration found for environment: ${config.env}`);
}

module.exports = config; 