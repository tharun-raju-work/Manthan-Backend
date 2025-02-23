const express = require('express');
const os = require('os');
const { sequelize } = require('../config/database');
const mongoose = require('mongoose');
const { register } = require('../config/metrics');

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const health = {
    timestamp: Date.now(),
    uptime: process.uptime(),
    process: {
      pid: process.pid,
      versions: process.versions,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAvg: os.loadavg(),
    },
    services: {
      postgresql: {
        status: false,
        connectionPool: null,
        latency: null
      },
      mongodb: {
        status: false,
        connectionState: null,
        latency: null
      }
    }
  };

  // Check PostgreSQL
  try {
    const startTime = Date.now();
    await sequelize.authenticate();
    health.services.postgresql = {
      status: true,
      connectionPool: {
        total: sequelize.pool.size,
        idle: sequelize.pool.idle,
        active: sequelize.pool.length
      },
      latency: Date.now() - startTime
    };
  } catch (error) {
    health.services.postgresql = {
      status: false,
      error: error.message
    };
  }

  // Check MongoDB
  try {
    const startTime = Date.now();
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      health.services.mongodb = {
        status: true,
        connectionState: mongoose.STATES[mongoose.connection.readyState],
        latency: Date.now() - startTime,
        collections: stats.collections,
        documents: stats.objects,
        indexes: stats.indexes
      };
    }
  } catch (error) {
    health.services.mongodb = {
      status: false,
      error: error.message
    };
  }

  const status = Object.values(health.services).every(service => service.status) ? 200 : 503;
  res.status(status).json(health);
});

// Liveness probe for Kubernetes
router.get('/liveness', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe for Kubernetes
router.get('/readiness', async (req, res) => {
  try {
    await Promise.all([
      sequelize.authenticate(),
      mongoose.connection.readyState === 1
    ]);
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

module.exports = router; 