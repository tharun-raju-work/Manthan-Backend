const redisClient = require('../config/redis');
const { logError } = require('../utils/logger.helper');

class AdminController {
  async getRedisStatus(req, res) {
    try {
      if (!redisClient.enabled) {
        return res.json({
          status: 'success',
          data: {
            enabled: false,
            message: 'Redis is disabled'
          }
        });
      }

      const isConnected = await redisClient.ping();
      let info = null;
      let memory = null;

      if (isConnected) {
        try {
          info = await redisClient.client.info();
          memory = await redisClient.client.memory('STATS');
        } catch (error) {
          logError('AdminController.getRedisStatus', 'Error getting Redis info', error);
        }
      }

      res.json({
        status: 'success',
        data: {
          enabled: redisClient.enabled,
          connected: isConnected,
          info,
          memory
        }
      });
    } catch (error) {
      logError('AdminController.getRedisStatus', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get Redis status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async flushRedis(req, res) {
    try {
      if (!redisClient.enabled || !redisClient.client) {
        return res.status(400).json({
          status: 'error',
          message: 'Redis is not enabled or not connected'
        });
      }

      await redisClient.client.flushall();
      res.json({
        status: 'success',
        message: 'Redis cache cleared successfully'
      });
    } catch (error) {
      logError('AdminController.flushRedis', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to flush Redis',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new AdminController(); 