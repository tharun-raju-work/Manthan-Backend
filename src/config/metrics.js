const promClient = require('prom-client');
const responseTime = require('response-time');
const os = require('os');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ 
  register,
  prefix: 'app_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Custom metrics
// HTTP metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'error'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseOperationDuration = new promClient.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'success'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Database metrics
const postgresqlPoolMetrics = new promClient.Gauge({
  name: 'postgresql_pool_metrics',
  help: 'PostgreSQL connection pool metrics',
  labelNames: ['type']
});

const mongodbConnectionMetrics = new promClient.Gauge({
  name: 'mongodb_connection_metrics',
  help: 'MongoDB connection metrics',
  labelNames: ['state']
});

// Business metrics
const userMetrics = new promClient.Gauge({
  name: 'user_metrics',
  help: 'User-related metrics',
  labelNames: ['type'] // active_users, new_registrations, etc.
});

const userActivityMetrics = new promClient.Counter({
  name: 'user_activity_total',
  help: 'User activity metrics',
  labelNames: ['type', 'status']
});

const postMetrics = new promClient.Counter({
  name: 'post_operations_total',
  help: 'Post operation metrics',
  labelNames: ['operation', 'status']
});

const postEngagementMetrics = new promClient.Gauge({
  name: 'post_engagement_metrics',
  help: 'Post engagement metrics',
  labelNames: ['type'] // votes, comments, views
});

const categoryMetrics = new promClient.Gauge({
  name: 'category_metrics',
  help: 'Category-related metrics',
  labelNames: ['category', 'type'] // posts_count, active_posts, etc.
});

const geographicMetrics = new promClient.Gauge({
  name: 'geographic_metrics',
  help: 'Geographic distribution of posts',
  labelNames: ['region', 'type']
});

// Cache metrics
const cacheMetrics = new promClient.Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations',
  labelNames: ['operation', 'status'],
  buckets: [0.001, 0.01, 0.1, 0.3, 0.5, 1]
});

// Error metrics
const errorMetrics = new promClient.Counter({
  name: 'error_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code']
});

// Register all metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(databaseOperationDuration);
register.registerMetric(activeConnections);
register.registerMetric(postgresqlPoolMetrics);
register.registerMetric(mongodbConnectionMetrics);
register.registerMetric(userActivityMetrics);
register.registerMetric(postMetrics);
register.registerMetric(cacheMetrics);
register.registerMetric(errorMetrics);
register.registerMetric(userMetrics);
register.registerMetric(postEngagementMetrics);
register.registerMetric(categoryMetrics);
register.registerMetric(geographicMetrics);

// Middleware to track request duration and counts
const metricsMiddleware = responseTime((req, res, time) => {
  if (req.path !== '/metrics') {
    httpRequestDurationMicroseconds
      .labels(req.method, req.path, res.statusCode, res.statusCode >= 500 ? 'error' : 'success')
      .observe(time / 1000);
    
    httpRequestsTotal
      .labels(req.method, req.path, res.statusCode)
      .inc();
  }
});

module.exports = {
  register,
  metricsMiddleware,
  databaseOperationDuration,
  activeConnections,
  postgresqlPoolMetrics,
  mongodbConnectionMetrics,
  userActivityMetrics,
  postMetrics,
  cacheMetrics,
  errorMetrics,
  userMetrics,
  postEngagementMetrics,
  categoryMetrics,
  geographicMetrics
}; 