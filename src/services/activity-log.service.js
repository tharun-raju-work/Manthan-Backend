const { logError, logInfo } = require('../utils/logger.helper');
const { ActivityLog, User, Group, Post } = require('../models/sql');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

class ActivityLogService {
  constructor() {
    // Initialize any necessary resources or configurations
  }

  async logActivity(userId, action, details) {
    try {
      // Implement the logic to log an activity
      // This could involve writing to a database, a file, or an external logging service
      logInfo('ActivityLogService.logActivity', 'Activity logged', {
        userId,
        action,
        details
      });
    } catch (error) {
      logError('ActivityLogService.logActivity', error);
      throw error;
    }
  }

  async getActivityLogs(userId, options = {}) {
    try {
      // Implement logic to retrieve activity logs
      // This could involve querying a database or reading from a file
      logInfo('ActivityLogService.getActivityLogs', 'Retrieved activity logs', {
        userId,
        options
      });
      return []; // Return an array of activity logs
    } catch (error) {
      logError('ActivityLogService.getActivityLogs', error);
      throw error;
    }
  }

  async getUserActivity(userId, { page, limit, type }) {
    try {
      const where = {
        userId,
        ...(type && { type })
      };

      const { rows: activities, count } = await ActivityLog.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [['createdAt', 'DESC']],
        include: this.getActivityIncludes()
      });

      return {
        activities,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logError('ActivityLogService.getUserActivity', error);
      throw error;
    }
  }

  async getEntityActivity(entityType, entityId, { page, limit }) {
    try {
      const where = {
        [`${entityType}Id`]: entityId
      };

      const { rows: activities, count } = await ActivityLog.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [['createdAt', 'DESC']],
        include: this.getActivityIncludes()
      });

      return {
        activities,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logError('ActivityLogService.getEntityActivity', error);
      throw error;
    }
  }

  async getActivityFeed(userId, { page, limit }) {
    try {
      // Get user's followed entities
      const userFollows = await this.getUserFollowedEntities(userId);

      const where = {
        [Op.or]: [
          { userId: userFollows.userIds },
          { groupId: userFollows.groupIds },
          { postId: userFollows.postIds }
        ]
      };

      const { rows: activities, count } = await ActivityLog.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [['createdAt', 'DESC']],
        include: this.getActivityIncludes()
      });

      return {
        activities,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logError('ActivityLogService.getActivityFeed', error);
      throw error;
    }
  }

  async getActivityStats(userId, timeframe) {
    try {
      const stats = await ActivityLog.findAll({
        where: {
          userId,
          createdAt: {
            [Op.gte]: this.getTimeframeDate(timeframe)
          }
        },
        attributes: [
          'type',
          [sequelize.fn('COUNT', '*'), 'count'],
          [sequelize.fn('DATE_TRUNC', timeframe, sequelize.col('createdAt')), 'period']
        ],
        group: ['type', 'period'],
        order: [['period', 'ASC']]
      });

      return stats;
    } catch (error) {
      logError('ActivityLogService.getActivityStats', error);
      throw error;
    }
  }

  // Helper methods
  getActivityIncludes() {
    return [
      {
        model: User,
        attributes: ['id', 'username', 'profile_picture']
      },
      {
        model: Group,
        attributes: ['id', 'name'],
        required: false
      },
      {
        model: Post,
        attributes: ['id', 'title'],
        required: false
      }
    ];
  }

  getTimeframeDate(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 7));
    }
  }
}

module.exports = new ActivityLogService(); 