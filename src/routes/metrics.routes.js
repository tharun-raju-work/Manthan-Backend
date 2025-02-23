const express = require('express');
const router = express.Router();
const metrics = require('../utils/metrics');
const auth = require('../middleware/auth.middleware');

// Metrics endpoint
router.get('/metrics', auth.required, async (req, res) => {
  try {
    res.set('Content-Type', metrics.contentType);
    res.end(await metrics.register.metrics());
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 