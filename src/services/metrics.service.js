const promClient = require('prom-client');
const { logError, logInfo } = require('../utils/logger.helper');

// Create Registry
const register = new promClient.Registry();

// Configure default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'manthan_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10
});

class MetricsService {
  constructor() {
    // User metrics
    this.userCounter = new promClient.Counter({
      name: 'manthan_users_total',
      help: 'Total number of users',
      labelNames: ['role'],
      registers: [register]
    });

    this.userActivityGauge = new promClient.Gauge({
      name: 'manthan_users_active',
      help: 'Number of active users',
      labelNames: ['timeframe'],
      registers: [register]
    });

    this.authCounter = new promClient.Counter({
      name: 'manthan_auth_attempts_total',
      help: 'Authentication attempts',
      labelNames: ['type', 'status'],
      registers: [register]
    });

    // Post metrics
    this.postCounter = new promClient.Counter({
      name: 'manthan_posts_total',
      help: 'Total number of posts',
      labelNames: ['status', 'category'],
      registers: [register]
    });

    this.postEngagementHistogram = new promClient.Histogram({
      name: 'manthan_post_engagement_score',
      help: 'Post engagement metrics',
      labelNames: ['type'],
      buckets: [0, 5, 10, 25, 50, 100, 250, 500],
      registers: [register]
    });

    // Comment metrics
    this.commentCounter = new promClient.Counter({
      name: 'comments_total',
      help: 'Total number of comments',
      labelNames: ['post_type'],
      registers: [register]
    });

    this.commentDepthHistogram = new promClient.Histogram({
      name: 'comment_depth',
      help: 'Depth of comment threads',
      buckets: [1, 2, 3, 5, 10],
      registers: [register]
    });

    // API metrics
    this.apiLatencyHistogram = new promClient.Histogram({
      name: 'manthan_api_request_duration_seconds',
      help: 'API endpoint latency',
      labelNames: ['method', 'endpoint', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 5],
      registers: [register]
    });

    this.apiRateLimit = new promClient.Counter({
      name: 'manthan_api_rate_limit_hits_total',
      help: 'Number of rate limit hits',
      labelNames: ['endpoint'],
      registers: [register]
    });

    // Database metrics
    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration',
      labelNames: ['operation', 'table'],
      buckets: [0.1, 0.3, 0.5, 1, 2, 5],
      registers: [register]
    });

    this.dbConnectionGauge = new promClient.Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database'], // postgres, mongodb
      registers: [register]
    });

    // Cache metrics
    this.cacheHitCounter = new promClient.Counter({
      name: 'manthan_cache_hits_total',
      help: 'Cache hit count',
      labelNames: ['cache_type'],
      registers: [register]
    });

    this.cacheMissCounter = new promClient.Counter({
      name: 'manthan_cache_misses_total',
      help: 'Cache miss count',
      labelNames: ['cache_type'],
      registers: [register]
    });

    // Error metrics
    this.errorCounter = new promClient.Counter({
      name: 'manthan_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'code'],
      registers: [register]
    });

    // Notification metrics
    this.notificationCounter = new promClient.Counter({
      name: 'notifications_sent_total',
      help: 'Total notifications sent',
      labelNames: ['type', 'status'],
      registers: [register]
    });

    this.notificationLatencyHistogram = new promClient.Histogram({
      name: 'notification_delivery_duration_seconds',
      help: 'Notification delivery duration',
      labelNames: ['type'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [register]
    });
  }

  // User metrics methods
  trackUserRegistration(role) {
    try {
      this.userCounter.inc({ role });
    } catch (error) {
      logError('MetricsService.trackUserRegistration', error);
    }
  }

  updateActiveUsers(timeframe, count) {
    try {
      this.userActivityGauge.set({ timeframe }, count);
    } catch (error) {
      logError('MetricsService.updateActiveUsers', error);
    }
  }

  trackAuthAttempt(type, status) {
    try {
      this.authCounter.inc({ type, status });
    } catch (error) {
      logError('MetricsService.trackAuthAttempt', error);
    }
  }

  // Post metrics methods
  trackPost(status, category) {
    try {
      this.postCounter.inc({ status, category });
    } catch (error) {
      logError('MetricsService.trackPost', error);
    }
  }

  observePostEngagement(type, value) {
    try {
      this.postEngagementHistogram.observe({ type }, value);
    } catch (error) {
      logError('MetricsService.observePostEngagement', error);
    }
  }

  // Comment metrics methods
  trackComment(postType) {
    try {
      this.commentCounter.inc({ post_type: postType });
    } catch (error) {
      logError('MetricsService.trackComment', error);
    }
  }

  observeCommentDepth(depth) {
    try {
      this.commentDepthHistogram.observe(depth);
    } catch (error) {
      logError('MetricsService.observeCommentDepth', error);
    }
  }

  // API metrics methods
  trackApiRequest(method, endpoint, statusCode, duration) {
    try {
      this.apiLatencyHistogram.observe(
        { method, endpoint, status_code: statusCode },
        duration
      );
    } catch (error) {
      logError('MetricsService.trackApiRequest', error);
    }
  }

  trackRateLimit(endpoint) {
    try {
      this.apiRateLimit.inc({ endpoint });
    } catch (error) {
      logError('MetricsService.trackRateLimit', error);
    }
  }

  // Database metrics methods
  observeQueryDuration(operation, table, duration) {
    try {
      this.dbQueryDuration.observe({ operation, table }, duration);
    } catch (error) {
      logError('MetricsService.observeQueryDuration', error);
    }
  }

  updateDbConnections(database, count) {
    try {
      this.dbConnectionGauge.set({ database }, count);
    } catch (error) {
      logError('MetricsService.updateDbConnections', error);
    }
  }

  // Cache metrics methods
  trackCacheHit(type) {
    try {
      this.cacheHitCounter.inc({ cache_type: type });
    } catch (error) {
      logError('MetricsService.trackCacheHit', error);
    }
  }

  trackCacheMiss(type) {
    try {
      this.cacheMissCounter.inc({ cache_type: type });
    } catch (error) {
      logError('MetricsService.trackCacheMiss', error);
    }
  }

  // Error metrics methods
  trackError(type, code) {
    try {
      this.errorCounter.inc({ type, code });
    } catch (error) {
      logError('MetricsService.trackError', error);
    }
  }

  // Notification metrics methods
  trackNotification(type, status) {
    try {
      this.notificationCounter.inc({ type, status });
    } catch (error) {
      logError('MetricsService.trackNotification', error);
    }
  }

  observeNotificationLatency(type, duration) {
    try {
      this.notificationLatencyHistogram.observe({ type }, duration);
    } catch (error) {
      logError('MetricsService.observeNotificationLatency', error);
    }
  }

  // Utility methods
  async getMetricsSummary() {
    try {
      return {
        users: {
          total: await this.userCounter.get(),
          active: await this.userActivityGauge.get()
        },
        posts: {
          total: await this.postCounter.get(),
          engagement: await this.postEngagementHistogram.get()
        },
        api: {
          latency: await this.apiLatencyHistogram.get(),
          rateLimits: await this.apiRateLimit.get()
        },
        errors: await this.errorCounter.get(),
        cache: {
          hits: await this.cacheHitCounter.get(),
          misses: await this.cacheMissCounter.get()
        }
      };
    } catch (error) {
      logError('MetricsService.getMetricsSummary', error);
      throw error;
    }
  }

  async getMetrics() {
    try {
      return await register.metrics();
    } catch (error) {
      logError('MetricsService.getMetrics', error);
      throw error;
    }
  }

  async clearMetrics() {
    try {
      register.clear();
    } catch (error) {
      logError('MetricsService.clearMetrics', error);
      throw error;
    }
  }

  // Get content type
  getContentType() {
    return register.contentType;
  }
}

module.exports = new MetricsService(); 