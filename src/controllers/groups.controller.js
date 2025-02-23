const GroupService = require('../services/group.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ValidationError } = require('../utils/errors/app.errors');

class GroupController {
  getGroups = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const groups = await GroupService.getGroups({ page, limit, search });
    res.json(groups);
  });

  getGroupById = asyncHandler(async (req, res) => {
    const group = await GroupService.getGroupById(req.params.id);
    res.json(group);
  });

  createGroup = asyncHandler(async (req, res) => {
    const groupData = req.body;
    const group = await GroupService.createGroup(groupData);
    res.status(201).json(group);
  });

  updateGroup = asyncHandler(async (req, res) => {
    const group = await GroupService.updateGroup(req.params.id, req.body, req.user.id);
    res.json(group);
  });

  deleteGroup = asyncHandler(async (req, res) => {
    await GroupService.deleteGroup(req.params.id, req.user.id);
    res.status(204).end();
  });

  addMember = asyncHandler(async (req, res) => {
    const membership = await GroupService.addMember(
      req.params.groupId,
      req.body.user_id,
      req.body.role,
      req.user.id
    );
    res.status(201).json(membership);
  });

  removeMember = asyncHandler(async (req, res) => {
    await GroupService.removeMember(
      req.params.groupId,
      req.params.userId,
      req.user.id
    );
    res.status(204).end();
  });

  getMembers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role } = req.query;
    const members = await GroupService.getGroupMembers(
      req.params.groupId,
      { page, limit, role }
    );
    res.json(members);
  });

  joinGroup = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.body;
    await GroupService.joinGroup(groupId, userId);
    res.status(200).json({ message: 'Joined group successfully' });
  });

  leaveGroup = asyncHandler(async (req, res) => {
    const { groupId, userId } = req.body;
    await GroupService.leaveGroup(groupId, userId);
    res.status(200).json({ message: 'Left group successfully' });
  });

  listGroups = asyncHandler(async (req, res) => {
    const groups = await GroupService.listGroups();
    res.json(groups);
  });

  getGroupDetails = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const group = await GroupService.getGroupDetails(groupId);
    res.json(group);
  });

  createInvitation = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { userId, role } = req.body;
    
    const invitation = await GroupService.createInvitation(
      groupId,
      userId,
      role,
      req.user.id
    );
    
    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation
    });
  });

  getInvitations = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const invitations = await GroupService.getGroupInvitations(groupId);
    
    res.json({
      status: 'success',
      data: invitations
    });
  });

  updateInvitation = asyncHandler(async (req, res) => {
    const { groupId, invitationId } = req.params;
    const { status } = req.body;
    
    const invitation = await GroupService.updateInvitation(
      groupId,
      invitationId,
      status,
      req.user.id
    );

    res.json({
      status: 'success',
      data: invitation
    });
  });

  cancelInvitation = asyncHandler(async (req, res) => {
    const { groupId, invitationId } = req.params;
    
    await GroupService.cancelInvitation(
      groupId,
      invitationId,
      req.user.id
    );

    res.status(204).end();
  });

  getGroupStats = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const stats = await GroupService.getDetailedStats(groupId);
    res.json(stats);
  });

  getGroupActivity = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const activity = await GroupService.getActivityStats(groupId, { page, limit });
    res.json(activity);
  });

  inviteToGroup = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { userIds, message } = req.body;
    
    const invitations = await GroupService.inviteUsers(
      groupId,
      req.user.id,
      userIds,
      message
    );

    res.status(200).json({
      status: 'success',
      message: 'Invitations sent successfully',
      data: invitations
    });
  });
}

module.exports = new GroupController(); 