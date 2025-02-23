const { GroupInvitation, User, Group, UserGroup, sequelize } = require('../models/sql');
const { ValidationError } = require('../utils/errors/app.errors');
const { logError } = require('../utils/logger.helper');
const NotificationService = require('./notification.service');
const crypto = require('crypto');

class GroupInvitationService {
  async createInvitation(groupId, invitedEmail, inviterId) {
    const transaction = await sequelize.transaction();
    try {
      // Check if inviter is admin
      const adminMembership = await UserGroup.findOne({
        where: {
          group_id: groupId,
          user_id: inviterId,
          role: 'admin'
        },
        transaction
      });

      if (!adminMembership) {
        throw new ValidationError('Only admins can send invitations');
      }

      // Check if user already exists
      const invitedUser = await User.findOne({
        where: { email: invitedEmail },
        transaction
      });

      if (invitedUser) {
        // Check if already a member
        const existingMembership = await UserGroup.findOne({
          where: {
            group_id: groupId,
            user_id: invitedUser.id
          },
          transaction
        });

        if (existingMembership) {
          throw new ValidationError('User is already a member of this group');
        }
      }

      const group = await Group.findByPk(groupId, { transaction });
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await GroupInvitation.create({
        group_id: groupId,
        invited_email: invitedEmail,
        inviter_id: inviterId,
        token,
        expires_at: expiresAt
      }, { transaction });

      if (invitedUser) {
        await NotificationService.create({
          userId: invitedUser.id,
          type: 'group_invitation',
          message: `You have been invited to join group ${group.name}`,
          metadata: {
            groupId,
            groupName: group.name,
            inviterId,
            invitationId: invitation.id
          }
        });
      }

      // Send email invitation
      await EmailService.sendGroupInvitation(
        invitedEmail,
        group.name,
        token
      );

      await transaction.commit();
      return invitation;
    } catch (error) {
      await transaction.rollback();
      logError('GroupInvitationService.createInvitation', error);
      throw error;
    }
  }

  async acceptInvitation(token, userId) {
    const transaction = await sequelize.transaction();
    try {
      const invitation = await GroupInvitation.findOne({
        where: {
          token,
          status: 'pending',
          expires_at: {
            [Op.gt]: new Date()
          }
        },
        include: [
          { model: Group },
          { model: User, as: 'inviter' }
        ],
        transaction
      });

      if (!invitation) {
        throw new ValidationError('Invalid or expired invitation');
      }

      const user = await User.findByPk(userId, { transaction });
      if (user.email !== invitation.invited_email) {
        throw new ValidationError('This invitation was sent to a different email address');
      }

      // Add user to group
      await UserGroup.create({
        user_id: userId,
        group_id: invitation.group_id,
        role: 'member'
      }, { transaction });

      // Update invitation status
      await invitation.update({
        status: 'accepted',
        accepted_at: new Date()
      }, { transaction });

      // Notify inviter
      await NotificationService.create({
        userId: invitation.inviter_id,
        type: 'invitation_accepted',
        message: `${user.username} has accepted your invitation to ${invitation.Group.name}`,
        metadata: {
          groupId: invitation.group_id,
          groupName: invitation.Group.name,
          acceptedBy: userId
        }
      });

      await transaction.commit();
      return invitation.Group;
    } catch (error) {
      await transaction.rollback();
      logError('GroupInvitationService.acceptInvitation', error);
      throw error;
    }
  }
}

module.exports = new GroupInvitationService(); 