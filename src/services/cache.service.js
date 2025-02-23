const Redis = require('ioredis');
const config = require('../config');
const { logError } = require('../utils/logger.helper');
const metricsService = require('./metrics.service');

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      keyPrefix: 'cache:metrics:'
    });

    // Cache TTLs in seconds
    this.ttls = {
      summary: 300,        // 5 minutes
      userStats: 600,      // 10 minutes
      postStats: 300,      // 5 minutes
      errorStats: 1800,    // 30 minutes
      customMetric: 600    // 10 minutes
    };
  }

  async get(key) {
    try {
      const cachedValue = await this.redis.get(key);
      if (cachedValue) {
        metricsService.trackCacheHit('metrics');
        return JSON.parse(cachedValue);
      }
      metricsService.trackCacheMiss('metrics');
      return null;
    } catch (error) {
      logError('CacheService.get', error);
      return null;
    }
  }

  async set(key, value, ttl) {
    try {
      await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        ttl || this.ttls.customMetric
      );
    } catch (error) {
      logError('CacheService.set', error);
    }
  }

  async getMetricsSummary() {
    const cacheKey = 'summary';
    try {
      const cached = await this.get(cacheKey);
      if (cached) return cached;

      const summary = await metricsService.getMetricsSummary();
      await this.set(cacheKey, summary, this.ttls.summary);
      return summary;
    } catch (error) {
      logError('CacheService.getMetricsSummary', error);
      return null;
    }
  }

  async getUserStats(timeframe = 'daily') {
    const cacheKey = `user:stats:${timeframe}`;
    try {
      const cached = await this.get(cacheKey);
      if (cached) return cached;

      const stats = {
        activeUsers: await metricsService.userActivityGauge.get({ timeframe }),
        authAttempts: await metricsService.authCounter.get(),
        registrations: await metricsService.userCounter.get()
      };

      await this.set(cacheKey, stats, this.ttls.userStats);
      return stats;
    } catch (error) {
      logError('CacheService.getUserStats', error);
      return null;
    }
  }

  async getPostStats() {
    const cacheKey = 'post:stats';
    try {
      const cached = await this.get(cacheKey);
      if (cached) return cached;

      const stats = {
        total: await metricsService.postCounter.get(),
        engagement: await metricsService.postEngagementHistogram.get(),
        comments: await metricsService.commentCounter.get()
      };

      await this.set(cacheKey, stats, this.ttls.postStats);
      return stats;
    } catch (error) {
      logError('CacheService.getPostStats', error);
      return null;
    }
  }

  async invalidateCache(pattern) {
    try {
      const keys = await this.redis.keys(`cache:metrics:${pattern}`);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (error) {
      logError('CacheService.invalidateCache', error);
    }
  }
}

module.exports = new CacheService(); 