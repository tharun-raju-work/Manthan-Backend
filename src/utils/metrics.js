const promClient = require('prom-client');
const { logError, logWarn, logInfo } = require('./logger.helper');
const { MetricsError } = require('./errors/app.errors');
const errorService = require('../services/error.service');

// Create Registry
const register = new promClient.Registry();

// Configure default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'manthan_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10
});

// Create metric constructors bound to our registry
const createCounter = (options) => new promClient.Counter({ ...options, registers: [register] });
const createGauge = (options) => new promClient.Gauge({ ...options, registers: [register] });
const createHistogram = (options) => new promClient.Histogram({ ...options, registers: [register] });
const createSummary = (options) => new promClient.Summary({ ...options, registers: [register] });

module.exports = {
  createCounter,
  createGauge,
  createHistogram,
  createSummary,
  register,
  contentType: register.contentType
};

class MetricsManager {
  constructor() {
    this.register = register;
    this.metrics = {};
    this.initialized = false;
    this.contentType = 'text/plain; version=0.0.4; charset=utf-8';
  }

  initialize() {
    try {
      // Add default metrics
      promClient.collectDefaultMetrics({
        register: this.register,
        prefix: 'app_'
      });

      // Response time metrics
      this.metrics.httpRequestDuration = new promClient.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests',
        labelNames: ['method', 'route', 'status_code', 'status_type'],
        buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5]
      });

      // Request metrics
      this.metrics.httpRequestTotal = new promClient.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code', 'status_type']
      });

      // Error metrics
      this.metrics.errorTotal = new promClient.Counter({
        name: 'app_errors_total',
        help: 'Total number of application errors',
        labelNames: ['type', 'code', 'route']
      });

      // Route metrics
      this.metrics.routeUsage = new promClient.Counter({
        name: 'app_route_usage_total',
        help: 'Total number of times each route is accessed',
        labelNames: ['method', 'route', 'status_type']
      });

      // Memory metrics
      this.metrics.memoryUsage = new promClient.Gauge({
        name: 'app_memory_usage_bytes',
        help: 'Application memory usage',
        labelNames: ['type']
      });

      // Connection metrics
      this.metrics.activeConnections = new promClient.Gauge({
        name: 'app_active_connections',
        help: 'Number of active connections',
        labelNames: ['type']
      });

      // Business metrics
      this.metrics.businessMetrics = {
        userActivity: new promClient.Counter({
          name: 'app_user_activity_total',
          help: 'User activity metrics',
          labelNames: ['action', 'status']
        }),
        apiUsage: new promClient.Counter({
          name: 'app_api_usage_total',
          help: 'API usage metrics',
          labelNames: ['endpoint', 'status']
        })
      };

      // Register all metrics
      // Register regular metrics
      Object.entries(this.metrics).forEach(([key, metric]) => {
        if (key !== 'businessMetrics' && metric.constructor?.name !== 'Object') {
          this.register.registerMetric(metric);
        }
      });

      // Register business metrics separately
      if (this.metrics.businessMetrics) {
        Object.values(this.metrics.businessMetrics).forEach(metric => {
          this.register.registerMetric(metric);
        });
      }

      this.initialized = true;
      logInfo('MetricsManager.initialize', 'Metrics initialized successfully');
      this.startCollectingMetrics();
    } catch (error) {
      const metricsError = new MetricsError(
        'Failed to initialize metrics',
        'METRICS_INIT_FAILED'
      );
      errorService.trackError(metricsError, {
        component: 'MetricsManager',
        action: 'initialization'
      });
      logError('MetricsManager.initialize', error, {
        component: 'MetricsManager',
        action: 'initialization'
      });
      this.initialized = false;
      throw metricsError;
    }
  }

  startCollectingMetrics() {
    // Collect memory metrics every 30 seconds
    setInterval(() => {
      try {
        const memoryUsage = process.memoryUsage();
        Object.entries(memoryUsage).forEach(([type, value]) => {
          this.metrics.memoryUsage.labels(type).set(value);
        });
      } catch (error) {
        logError('MetricsManager.startCollectingMetrics', error, {
          component: 'MetricsManager',
          action: 'memory_collection'
        });
      }
    }, 30000);
  }

  middleware() {
    return (req, res, next) => {
      if (!this.initialized) {
        return next();
      }

      const startTime = process.hrtime();

      res.on('finish', () => {
        try {
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const duration = seconds + nanoseconds / 1e9;
          const statusType = Math.floor(res.statusCode / 100) + 'xx';

          if (req.route) {
            const route = req.route.path;
            const method = req.method;

            this.metrics.httpRequestDuration
              .labels(method, route, res.statusCode, statusType)
              .observe(duration);

            this.metrics.httpRequestTotal
              .labels(method, route, res.statusCode, statusType)
              .inc();

            this.metrics.routeUsage
              .labels(method, route, statusType)
              .inc();

            if (res.statusCode >= 400) {
              this.metrics.errorTotal
                .labels(statusType, res.statusCode, route)
                .inc();
            }
          }
        } catch (error) {
          logError('MetricsManager.middleware', error, {
            component: 'MetricsManager',
            action: 'request_metrics',
            path: req.path,
            method: req.method
          });
        }
      });

      next();
    };
  }

  async getMetrics() {
    try {
      if (!this.initialized) {
        return null;
      }
      return await this.register.metrics();
    } catch (error) {
      logError('MetricsManager.getMetrics', error, {
        component: 'MetricsManager',
        action: 'metrics_collection'
      });
      return null;
    }
  }
}

module.exports = new MetricsManager(); 