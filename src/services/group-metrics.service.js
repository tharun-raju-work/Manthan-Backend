const { Group, UserGroup, sequelize } = require('../models/sql');
const { logError, logInfo } = require('../utils/logger.helper');
const promClient = require('prom-client');

// Create Registry
const register = new promClient.Registry();

// Configure default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'manthan_group_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10
});

class GroupMetricsService {
  constructor() {
    // Group metrics
    this.groupCounter = new promClient.Counter({
      name: 'manthan_groups_total',
      help: 'Total number of groups',
      labelNames: ['type'],
      registers: [register]
    });

    this.groupActivityGauge = new promClient.Gauge({
      name: 'manthan_groups_active',
      help: 'Number of active groups',
      labelNames: ['timeframe'],
      registers: [register]
    });

    this.groupEngagementHistogram = new promClient.Histogram({
      name: 'manthan_group_engagement_score',
      help: 'Group engagement metrics',
      labelNames: ['type'],
      buckets: [0, 5, 10, 25, 50, 100, 250, 500],
      registers: [register]
    });

    // Error metrics
    this.errorCounter = new promClient.Counter({
      name: 'manthan_group_errors_total',
      help: 'Total number of group-related errors',
      labelNames: ['type', 'code'],
      registers: [register]
    });

    // Additional metrics
    this.memberCounter = new promClient.Gauge({
      name: 'group_members_total',
      help: 'Total number of group members',
      labelNames: ['group_id', 'group_name']
    });

    this.activityCounter = new promClient.Counter({
      name: 'group_activity_total',
      help: 'Group activity counter',
      labelNames: ['group_id', 'action']
    });

    this.invitationCounter = new promClient.Counter({
      name: 'group_invitations_total',
      help: 'Total number of group invitations',
      labelNames: ['group_id', 'status']
    });
    
    this.membershipDuration = new promClient.Histogram({
      name: 'group_membership_duration_days',
      help: 'Duration of group memberships in days',
      buckets: [1, 7, 30, 90, 180, 365]
    });
    
    this.roleDistribution = new promClient.Gauge({
      name: 'group_role_distribution',
      help: 'Distribution of roles in groups',
      labelNames: ['group_id', 'role']
    });

    // Initialize metrics
    this.initializeMetrics();
  }

  async initializeMetrics() {
    try {
      const groups = await Group.findAll({
        include: [{
          model: UserGroup,
          attributes: ['group_id']
        }]
      });

      groups.forEach(group => {
        this.memberCounter.set(
          { group_id: group.id, group_name: group.name },
          group.UserGroups.length
        );
      });
    } catch (error) {
      logError('GroupMetricsService.initializeMetrics', error);
    }
  }

  trackGroupCreation(type) {
    try {
      this.groupCounter.inc({ type });
    } catch (error) {
      logError('GroupMetricsService.trackGroupCreation', error);
    }
  }

  updateActiveGroups(timeframe, count) {
    try {
      this.groupActivityGauge.set({ timeframe }, count);
    } catch (error) {
      logError('GroupMetricsService.updateActiveGroups', error);
    }
  }

  observeGroupEngagement(type, value) {
    try {
      this.groupEngagementHistogram.observe({ type }, value);
    } catch (error) {
      logError('GroupMetricsService.observeGroupEngagement', error);
    }
  }

  trackError(type, code) {
    try {
      this.errorCounter.inc({ type, code });
    } catch (error) {
      logError('GroupMetricsService.trackError', error);
    }
  }

  async getMetrics() {
    try {
      return await register.metrics();
    } catch (error) {
      logError('GroupMetricsService.getMetrics', error);
      throw error;
    }
  }

  async clearMetrics() {
    try {
      register.clear();
    } catch (error) {
      logError('GroupMetricsService.clearMetrics', error);
      throw error;
    }
  }

  getContentType() {
    return register.contentType;
  }

  incrementGroupCount() {
    this.groupCounter.inc();
  }

  decrementGroupCount() {
    this.groupCounter.dec();
  }

  updateMemberCount(groupId, groupName, count) {
    this.memberCounter.set({ group_id: groupId, group_name: groupName }, count);
  }

  trackActivity(groupId, action) {
    this.activityCounter.inc({ group_id: groupId, action });
  }

  trackInvitation(groupId, status) {
    this.invitationCounter.inc({ group_id: groupId, status });
  }

  trackMembershipDuration(durationInDays) {
    this.membershipDuration.observe(durationInDays);
  }

  updateRoleDistribution(groupId) {
    UserGroup.findAll({
      where: { group_id: groupId },
      attributes: ['role', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['role']
    }).then(distribution => {
      distribution.forEach(role => {
        this.roleDistribution.set(
          { group_id: groupId, role: role.role },
          role.count
        );
      });
    }).catch(error => {
      logError('GroupMetricsService.updateRoleDistribution', error);
    });
  }

  async getGroupStats(groupId) {
    try {
      const stats = await UserGroup.findAll({
        where: { group_id: groupId },
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('user_id')), 'count'],
          [sequelize.fn('MIN', sequelize.col('joined_at')), 'first_member_date']
        ],
        group: ['role']
      });

      return stats;
    } catch (error) {
      logError('GroupMetricsService.getGroupStats', error);
      throw error;
    }
  }

  async getDetailedStats(groupId) {
    try {
      const [memberStats, activityStats, invitationStats] = await Promise.all([
        this.getGroupStats(groupId),
        this.getActivityStats(groupId),
        this.getInvitationStats(groupId)
      ]);

      return {
        members: memberStats,
        activity: activityStats,
        invitations: invitationStats
      };
    } catch (error) {
      logError('GroupMetricsService.getDetailedStats', error);
      throw error;
    }
  }

  async getActivityStats(groupId) {
    try {
      return await UserGroup.findAll({
        where: { group_id: groupId },
        attributes: [
          [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('joined_at')), 'month'],
          [sequelize.fn('COUNT', '*'), 'joins']
        ],
        group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('joined_at'))],
        order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('joined_at')), 'DESC']],
        limit: 12
      });
    } catch (error) {
      logError('GroupMetricsService.getActivityStats', error);
      throw error;
    }
  }

  async getInvitationStats(groupId) {
    try {
      return await GroupInvitation.findAll({
        where: { group_id: groupId },
        attributes: [
          'status',
          [sequelize.fn('COUNT', '*'), 'count'],
          [sequelize.fn('AVG', 
            sequelize.fn('EXTRACT', 'epoch', 
              sequelize.fn('AGE', 
                sequelize.col('accepted_at'), 
                sequelize.col('created_at')
              )
            )
          ), 'avg_acceptance_time']
        ],
        group: ['status']
      });
    } catch (error) {
      logError('GroupMetricsService.getInvitationStats', error);
      throw error;
    }
  }
}

module.exports = new GroupMetricsService(); 