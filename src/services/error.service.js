const { logError, logWarn } = require('../utils/logger.helper');
const config = require('../config');

class ErrorService {
  constructor() {
    this.errorCounts = new Map();
    this.errorThresholds = new Map([
      ['METRICS_ERROR', 5],
      ['SERVICE_ERROR', 3],
      ['VALIDATION_ERROR', 10],
      ['*', 20] // Default threshold
    ]);
    this.timeWindow = 5 * 60 * 1000; // 5 minutes
    this.startErrorAggregation();
  }

  trackError(error, context = {}) {
    const errorKey = this.getErrorKey(error);
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Check if threshold is exceeded
    const threshold = this.errorThresholds.get(error.errorCode) || 
                     this.errorThresholds.get('*');
    
    if (currentCount + 1 >= threshold) {
      this.handleThresholdExceeded(error, currentCount + 1, context);
    }
  }

  getErrorKey(error) {
    return `${error.name}:${error.errorCode}:${Math.floor(Date.now() / this.timeWindow)}`;
  }

  async handleThresholdExceeded(error, count, context) {
    try {
      // Log alert
      logWarn('ErrorService.thresholdExceeded', 'Error threshold exceeded', {
        errorName: error.name,
        errorCode: error.errorCode,
        count,
        threshold: this.errorThresholds.get(error.errorCode) || this.errorThresholds.get('*'),
        context
      });

      // Send alert if configured
      if (config.alerts?.webhook) {
        await this.sendAlert(error, count, context);
      }

      // Attempt recovery
      await this.attemptRecovery(error, context);
    } catch (alertError) {
      logError('ErrorService.handleThresholdExceeded', alertError, {
        originalError: error,
        context
      });
    }
  }

  async sendAlert(error, count, context) {
    try {
      const alertPayload = {
        type: 'error_threshold',
        error: {
          name: error.name,
          code: error.errorCode,
          message: error.message,
          count,
          context
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(config.alerts.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload)
      });

      if (!response.ok) {
        throw new Error(`Alert webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      logError('ErrorService.sendAlert', error);
    }
  }

  async attemptRecovery(error, context) {
    switch (error.name) {
      case 'MetricsError':
        await this.recoverMetrics(context);
        break;
      case 'ServiceError':
        await this.recoverService(error.service, context);
        break;
      // Add more recovery strategies
    }
  }

  async recoverMetrics(context) {
    try {
      const metrics = require('../utils/metrics');
      await metrics.initialize();
      logInfo('ErrorService.recoverMetrics', 'Metrics recovered successfully');
    } catch (error) {
      logError('ErrorService.recoverMetrics', error, context);
    }
  }

  async recoverService(serviceName, context) {
    try {
      // Implement service-specific recovery logic
      logInfo('ErrorService.recoverService', `Attempting to recover ${serviceName}`);
    } catch (error) {
      logError('ErrorService.recoverService', error, { serviceName, ...context });
    }
  }

  startErrorAggregation() {
    // Clear error counts periodically
    setInterval(() => {
      this.errorCounts.clear();
    }, this.timeWindow);
  }
}

module.exports = new ErrorService(); 