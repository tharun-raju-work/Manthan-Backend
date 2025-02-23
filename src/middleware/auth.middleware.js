const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('../utils/errors/auth.errors');
const sessionService = require('../services/session.service');
const config = require('../config');
const { logError, logInfo } = require('../utils/logger.helper');
const { User } = require('../models/sql');
const logger = require('../config/logger');

const authMiddleware = {
  required: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found or inactive'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error('Auth Middleware', 'Authentication failed', error);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }
  },

  optional: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        if (user && user.isActive) {
          req.user = user;
        }
      }
      next();
    } catch (error) {
      // Continue without user
      next();
    }
  },

  hasRole: (role) => (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    if (req.user.role !== role) {
      return next(new AuthorizationError('Insufficient permissions'));
    }
    next();
  },

  requireAdmin: async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!req.user.isAdmin) {
        return res.status(403).json({
          status: 'error',
          message: 'Admin access required'
        });
      }

      next();
    } catch (error) {
      logger.error('Auth Middleware', 'Admin check failed', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
};

module.exports = authMiddleware; 