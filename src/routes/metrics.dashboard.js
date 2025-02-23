const express = require('express');
const router = express.Router();
const metrics = require('../utils/metrics');
const { logError } = require('../utils/logger.helper');

router.get('/dashboard', async (req, res) => {
  try {
    const metricsData = await metrics.getMetrics();
    if (!metricsData) {
      throw new Error('Metrics not available');
    }

    // Convert Prometheus format to JSON
    const lines = metricsData.split('\n');
    const jsonMetrics = {};
    let currentMetric = null;

    lines.forEach(line => {
      if (line.startsWith('# HELP')) {
        const [, name, help] = line.match(/# HELP (\w+) (.+)/);
        jsonMetrics[name] = { help, values: [] };
        currentMetric = name;
      } else if (line && !line.startsWith('#') && currentMetric) {
        const [metric, value] = line.split(' ');
        jsonMetrics[currentMetric].values.push({
          labels: metric.match(/\{(.+)\}/)?.[1].split(',').reduce((acc, curr) => {
            const [key, value] = curr.split('=');
            acc[key] = value.replace(/"/g, '');
            return acc;
          }, {}) || {},
          value: parseFloat(value)
        });
      }
    });

    res.json({
      timestamp: Date.now(),
      metrics: jsonMetrics
    });
  } catch (error) {
    logError('MetricsDashboard.getDashboard', error, {
      component: 'MetricsDashboard',
      action: 'get_dashboard',
      path: req.path
    });
    res.status(500).json({
      error: 'Failed to load metrics dashboard',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 