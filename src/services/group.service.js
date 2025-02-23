const { Group, User, UserGroup, sequelize } = require('../models/sql');
const { Op } = require('sequelize');
const { ValidationError, AuthenticationError } = require('../utils/errors/app.errors');
const { logError, logInfo } = require('../utils/logger.helper');
const NotificationService = require('./notification.service');
const ActivityLogService = require('./activity-log.service');
const GroupMetricsService = require('./group-metrics.service');
const GroupInvitation = require('../models/sql').GroupInvitation;

class GroupService {
  async getGroups({ page, limit, search }) {
    try {
      const where = search ? {
        name: {
          [Op.iLike]: `%${search}%`
        }
      } : {};

      const { rows: groups, count } = await Group.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [['name', 'ASC']],
        include: [{
          model: User,
          as: 'members',
          attributes: ['id', 'username'],
          through: { attributes: ['role'] }
        }]
      });

      return {
        groups,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logError('GroupService.getGroups', error);
      throw error;
    }
  }

  async getGroupById(id) {
    try {
      const group = await Group.findByPk(id, {
        include: [{
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'profile_picture'],
          through: { attributes: ['role', 'joined_at'] }
        }]
      });

      if (!group) {
        throw new ValidationError('Group not found');
      }

      return group;
    } catch (error) {
      logError('GroupService.getGroupById', error);
      throw error;
    }
  }

  async createGroup(groupData) {
    try {
      const group = await Group.create(groupData);
      logInfo('GroupService.createGroup', 'Group created', { groupId: group.id });
      return group;
    } catch (error) {
      logError('GroupService.createGroup', error);
      throw error;
    }
  }

  async updateGroup(id, data, userId) {
    const transaction = await sequelize.transaction();
    try {
      const group = await Group.findByPk(id, {
        include: [{
          model: User,
          as: 'members',
          attributes: ['id'],
          through: { attributes: ['role'], where: { user_id: userId } }
        }],
        transaction
      });

      if (!group) {
        throw new ValidationError('Group not found');
      }

      if (!group.members.length || group.members[0].UserGroup.role !== 'admin') {
        throw new AuthenticationError('Only group admins can update the group');
      }

      if (data.name && data.name !== group.name) {
        const existingGroup = await Group.findOne({
          where: { name: data.name },
          transaction
        });
        if (existingGroup) {
          throw new ValidationError('Group name already exists');
        }
      }

      await group.update(data, { transaction });
      await transaction.commit();
      return this.getGroupById(id);
    } catch (error) {
      await transaction.rollback();
      logError('GroupService.updateGroup', error);
      throw error;
    }
  }

  async addMember(groupId, newUserId, role, adminUserId) {
    const transaction = await sequelize.transaction();
    try {
      // Check if group exists and user is admin
      const group = await Group.findByPk(groupId, {
        include: [{
          model: User,
          as: 'members',
          attributes: ['id'],
          through: { attributes: ['role'], where: { user_id: adminUserId } }
        }],
        transaction
      });

      if (!group) {
        throw new ValidationError('Group not found');
      }

      if (!group.members.length || group.members[0].UserGroup.role !== 'admin') {
        throw new AuthenticationError('Only group admins can add members');
      }

      // Check if user exists
      const user = await User.findByPk(newUserId, { transaction });
      if (!user) {
        throw new ValidationError('User not found');
      }

      // Check if user is already a member
      const existingMembership = await UserGroup.findOne({
        where: {
          user_id: newUserId,
          group_id: groupId
        },
        transaction
      });

      if (existingMembership) {
        throw new ValidationError('User is already a member of this group');
      }

      // Add member
      const membership = await UserGroup.create({
        user_id: newUserId,
        group_id: groupId,
        role: role || 'member'
      }, { transaction });

      // Create notification for new member
      await NotificationService.create({
        userId: newUserId,
        type: 'group_invitation',
        message: `You have been added to group ${group.name}`,
        metadata: {
          groupId,
          groupName: group.name,
          addedBy: adminUserId
        }
      });

      // Log activity
      await ActivityLogService.log({
        userId: adminUserId,
        action: 'group_member_added',
        details: {
          groupId,
          groupName: group.name,
          newMemberId: newUserId,
          role
        }
      });

      // Update metrics
      const memberCount = await UserGroup.count({ where: { group_id: groupId }});
      GroupMetricsService.updateMemberCount(groupId, group.name, memberCount + 1);
      GroupMetricsService.trackActivity(groupId, 'member_added');

      await transaction.commit();
      return membership;
    } catch (error) {
      await transaction.rollback();
      logError('GroupService.addMember', error);
      throw error;
    }
  }

  async getGroupMembers(groupId, { page, limit, role }) {
    try {
      const where = {
        group_id: groupId,
        ...(role && { role })
      };

      const { rows: members, count } = await UserGroup.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        include: [{
          model: User,
          attributes: ['id', 'username', 'profile_picture']
        }],
        order: [
          ['role', 'ASC'],
          ['joined_at', 'DESC']
        ]
      });

      return {
        members: members.map(m => ({
          ...m.User.toJSON(),
          role: m.role,
          joined_at: m.joined_at
        })),
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logError('GroupService.getGroupMembers', error);
      throw error;
    }
  }

  async removeMember(groupId, userId, adminUserId) {
    const transaction = await sequelize.transaction();
    try {
      const group = await this.getGroupById(groupId);
      
      // Check admin permissions
      const adminMembership = await UserGroup.findOne({
        where: {
          group_id: groupId,
          user_id: adminUserId,
          role: 'admin'
        }
      });

      if (!adminMembership) {
        throw new AuthenticationError('Only admins can remove members');
      }

      // Check if removing last admin
      if (userId === adminUserId) {
        const adminCount = await UserGroup.count({
          where: {
            group_id: groupId,
            role: 'admin'
          }
        });
        if (adminCount <= 1) {
          throw new ValidationError('Cannot remove the last admin from the group');
        }
      }

      const membership = await UserGroup.findOne({
        where: {
          group_id: groupId,
          user_id: userId
        },
        transaction
      });

      if (!membership) {
        throw new ValidationError('User is not a member of this group');
      }

      await membership.destroy({ transaction });

      // Create notification for removed member
      await NotificationService.create({
        userId,
        type: 'group_removal',
        message: `You have been removed from group ${group.name}`,
        metadata: {
          groupId,
          groupName: group.name,
          removedBy: adminUserId
        }
      });

      // Log activity
      await ActivityLogService.log({
        userId: adminUserId,
        action: 'group_member_removed',
        details: {
          groupId,
          groupName: group.name,
          removedUserId: userId
        }
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      logError('GroupService.removeMember', error);
      throw error;
    }
  }

  async deleteGroup(groupId, userId) {
    const transaction = await sequelize.transaction();
    try {
      const group = await this.getGroupById(groupId);
      
      // Check admin permissions
      const adminMembership = await UserGroup.findOne({
        where: {
          group_id: groupId,
          user_id: userId,
          role: 'admin'
        }
      });

      if (!adminMembership) {
        throw new AuthenticationError('Only admins can delete the group');
      }

      // Get all members for notifications
      const members = await UserGroup.findAll({
        where: { group_id: groupId },
        attributes: ['user_id']
      });

      await group.destroy({ transaction });

      // Notify all members
      await Promise.all(members.map(member => 
        NotificationService.create({
          userId: member.user_id,
          type: 'group_deleted',
          message: `Group ${group.name} has been deleted`,
          metadata: {
            groupId,
            groupName: group.name,
            deletedBy: userId
          }
        })
      ));

      // Log activity
      await ActivityLogService.log({
        userId,
        action: 'group_deleted',
        details: {
          groupId,
          groupName: group.name,
          memberCount: members.length
        }
      });

      // Update metrics
      GroupMetricsService.decrementGroupCount();
      GroupMetricsService.updateMemberCount(groupId, group.name, 0);
      GroupMetricsService.trackActivity(groupId, 'deleted');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      logError('GroupService.deleteGroup', error);
      throw error;
    }
  }

  async joinGroup(groupId, userId) {
    try {
      await UserGroup.create({ groupId, userId });
      logInfo('GroupService.joinGroup', 'User joined group', { groupId, userId });
    } catch (error) {
      logError('GroupService.joinGroup', error);
      throw error;
    }
  }

  async leaveGroup(groupId, userId) {
    try {
      await UserGroup.destroy({ where: { groupId, userId } });
      logInfo('GroupService.leaveGroup', 'User left group', { groupId, userId });
    } catch (error) {
      logError('GroupService.leaveGroup', error);
      throw error;
    }
  }

  async listGroups() {
    try {
      const groups = await Group.findAll();
      logInfo('GroupService.listGroups', 'Groups listed');
      return groups;
    } catch (error) {
      logError('GroupService.listGroups', error);
      throw error;
    }
  }

  async getGroupDetails(groupId) {
    try {
      const group = await Group.findByPk(groupId);
      logInfo('GroupService.getGroupDetails', 'Group details retrieved', { groupId });
      return group;
    } catch (error) {
      logError('GroupService.getGroupDetails', error);
      throw error;
    }
  }

  async createInvitation(groupId, userId, role, inviterId) {
    const transaction = await sequelize.transaction();
    try {
      // Check if group exists and inviter is admin
      const group = await this.getGroupById(groupId);
      
      const inviterMembership = await UserGroup.findOne({
        where: {
          group_id: groupId,
          user_id: inviterId,
          role: 'admin'
        }
      });

      if (!inviterMembership) {
        throw new AuthenticationError('Only admins can send invitations');
      }

      // Create invitation
      const invitation = await GroupInvitation.create({
        group_id: groupId,
        user_id: userId,
        inviter_id: inviterId,
        role: role || 'member'
      }, { transaction });

      // Send notification
      await NotificationService.create({
        userId,
        type: 'group_invitation',
        message: `You have been invited to join ${group.name}`,
        metadata: {
          groupId,
          groupName: group.name,
          inviterId
        }
      });

      await transaction.commit();
      return invitation;
    } catch (error) {
      await transaction.rollback();
      logError('GroupService.createInvitation', error);
      throw error;
    }
  }

  async getGroupInvitations(groupId, userId) {
    try {
      const invitations = await GroupInvitation.findAll({
        where: {
          group_id: groupId,
          [Op.or]: [
            { user_id: userId },
            { inviter_id: userId }
          ]
        },
        include: [{
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'profile_picture']
        }, {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'profile_picture']
        }]
      });
      return invitations;
    } catch (error) {
      logError('GroupService.getGroupInvitations', error);
      throw error;
    }
  }

  async updateInvitation(groupId, invitationId, status, userId) {
    const transaction = await sequelize.transaction();
    try {
      const invitation = await GroupInvitation.findOne({
        where: {
          id: invitationId,
          group_id: groupId,
          user_id: userId,
          status: 'pending'
        }
      });

      if (!invitation) {
        throw new ValidationError('Invalid invitation');
      }

      invitation.status = status;
      await invitation.save({ transaction });

      if (status === 'accepted') {
        await this.addMember(groupId, userId, invitation.role, invitation.inviter_id);
      }

      await transaction.commit();
      return invitation;
    } catch (error) {
      await transaction.rollback();
      logError('GroupService.updateInvitation', error);
      throw error;
    }
  }

  async cancelInvitation(groupId, invitationId, userId) {
    try {
      const invitation = await GroupInvitation.findOne({
        where: {
          id: invitationId,
          group_id: groupId,
          inviter_id: userId,
          status: 'pending'
        }
      });

      if (!invitation) {
        throw new ValidationError('Invalid invitation');
      }

      await invitation.destroy();
    } catch (error) {
      logError('GroupService.cancelInvitation', error);
      throw error;
    }
  }
}

module.exports = new GroupService(); 