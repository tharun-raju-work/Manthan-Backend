const { User, UserProfile, UserPreferences, UserFollower, sequelize } = require('../models/sql');
const { Op } = require('sequelize');
const { ValidationError } = require('../utils/errors/app.errors');
const { logError, logInfo } = require('../utils/logger.helper');
const NotificationService = require('./notification.service');
const ActivityLogService = require('./activity-log.service');

class UserService {
  async getUserById(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          { model: UserProfile },
          { model: UserPreferences }
        ]
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      return user;
    } catch (error) {
      logError('UserService.getUserById', error);
      throw error;
    }
  }

  async updateUser(userId, userData) {
    const transaction = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new ValidationError('User not found');
      }

      // Update basic user info
      if (userData.username || userData.email) {
        await user.update({
          username: userData.username || user.username,
          email: userData.email || user.email
        }, { transaction });
      }

      // Update profile
      if (userData.profile) {
        await UserProfile.upsert({
          user_id: userId,
          ...userData.profile
        }, { transaction });
      }

      await transaction.commit();

      return this.getUserById(userId);
    } catch (error) {
      await transaction.rollback();
      logError('UserService.updateUser', error);
      throw error;
    }
  }

  async listUsers({ page, limit, search }) {
    try {
      const where = search ? {
        [Op.or]: [
          { username: { [Op.iLike]: `%${search}%` } },
          { '$profile.name$': { [Op.iLike]: `%${search}%` } }
        ]
      } : {};

      const { rows: users, count } = await User.findAndCountAll({
        where,
        include: [
          {
            model: UserProfile,
            attributes: ['name', 'bio', 'location']
          }
        ],
        limit,
        offset: (page - 1) * limit,
        order: [['username', 'ASC']]
      });

      return {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logError('UserService.listUsers', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: UserProfile,
            attributes: { exclude: ['created_at', 'updated_at'] }
          },
          {
            model: User,
            as: 'followers',
            attributes: ['id', 'username'],
            through: { attributes: [] }
          },
          {
            model: User,
            as: 'following',
            attributes: ['id', 'username'],
            through: { attributes: [] }
          }
        ],
        attributes: { exclude: ['password', 'refresh_token'] }
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      return user;
    } catch (error) {
      logError('UserService.getUserProfile', error);
      throw error;
    }
  }

  async followUser(followerId, followingId) {
    const transaction = await sequelize.transaction();
    try {
      // Check if users exist
      const [follower, following] = await Promise.all([
        User.findByPk(followerId),
        User.findByPk(followingId)
      ]);

      if (!follower || !following) {
        throw new ValidationError('User not found');
      }

      if (followerId === followingId) {
        throw new ValidationError('Cannot follow yourself');
      }

      // Create follow relationship
      await UserFollower.create({
        follower_id: followerId,
        following_id: followingId
      }, { transaction });

      // Create notification
      await NotificationService.create({
        userId: followingId,
        type: 'new_follower',
        message: `${follower.username} started following you`,
        metadata: {
          followerId,
          followerUsername: follower.username
        }
      });

      // Log activity
      await ActivityLogService.logActivity(followerId, 'follow_user', {
        followingId,
        followingUsername: following.username
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      logError('UserService.followUser', error);
      throw error;
    }
  }

  async unfollowUser(followerId, followingId) {
    try {
      const result = await UserFollower.destroy({
        where: {
          follower_id: followerId,
          following_id: followingId
        }
      });

      if (!result) {
        throw new ValidationError('Follow relationship not found');
      }

      await ActivityLogService.logActivity(followerId, 'unfollow_user', {
        followingId
      });
    } catch (error) {
      logError('UserService.unfollowUser', error);
      throw error;
    }
  }

  async getUserPreferences(userId) {
    try {
      const preferences = await UserPreferences.findOne({
        where: { user_id: userId }
      });

      return preferences || {};
    } catch (error) {
      logError('UserService.getUserPreferences', error);
      throw error;
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      const [userPreferences] = await UserPreferences.upsert({
        user_id: userId,
        ...preferences
      });

      return userPreferences;
    } catch (error) {
      logError('UserService.updateUserPreferences', error);
      throw error;
    }
  }
}

module.exports = new UserService(); 