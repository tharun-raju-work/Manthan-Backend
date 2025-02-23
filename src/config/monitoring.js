const newrelic = require('newrelic');
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('./logger');

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new ProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

// Custom monitoring middleware
const performanceMonitoring = (req, res, next) => {
  const start = process.hrtime();

  // Add response finished listener
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds

    // Record custom metrics
    newrelic.recordMetric(`Custom/Route${req.route.path}`, time);

    // Log slow requests
    if (time > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.url} took ${time}ms`);
    }
  });

  next();
};

// Error tracking
const errorTracking = (error, req, res, next) => {
  Sentry.withScope((scope) => {
    scope.setUser({
      id: req.user?.id,
      email: req.user?.email,
    });
    scope.setExtra('body', req.body);
    scope.setExtra('params', req.params);
    scope.setExtra('query', req.query);
    Sentry.captureException(error);
  });

  logger.error('Application error:', error);
  next(error);
};

module.exports = {
  performanceMonitoring,
  errorTracking,
};
