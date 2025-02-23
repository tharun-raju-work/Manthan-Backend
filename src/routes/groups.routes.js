const express = require('express');
const router = express.Router();
const GroupsController = require('../controllers/groups.controller');
const { validateRequest } = require('../middleware/validator.middleware');
const { groupSchema, invitationSchema } = require('../validators/group.validator');
const auth = require('../middleware/auth.middleware');
const { invitationLimiter } = require('../middleware/rate-limit.middleware');

// List and Search Groups
router.get('/', 
  auth.required,
  GroupsController.getGroups
);

router.get('/:groupId', 
  auth.required,
  GroupsController.getGroupById
);

// Group Management
router.post('/', 
  auth.required,
  validateRequest(groupSchema),
  GroupsController.createGroup
);

router.put('/:groupId',
  auth.required,
  validateRequest(groupSchema),
  GroupsController.updateGroup
);

router.delete('/:groupId',
  auth.required,
  GroupsController.deleteGroup
);

// Group Membership
router.post('/join', 
  auth.required,
  validateRequest(groupSchema), 
  GroupsController.joinGroup
);

router.post('/leave', 
  auth.required,
  validateRequest(groupSchema), 
  GroupsController.leaveGroup
);

// Member Management
router.get('/:groupId/members',
  auth.required,
  GroupsController.getMembers
);

router.post('/:groupId/members',
  auth.required,
  validateRequest(invitationSchema),
  GroupsController.addMember
);

router.delete('/:groupId/members/:userId',
  auth.required,
  GroupsController.removeMember
);

// Invitations
router.post('/:groupId/invitations',
  auth.required,
  invitationLimiter,
  validateRequest(invitationSchema),
  GroupsController.inviteToGroup
);

router.get('/:groupId/invitations',
  auth.required,
  GroupsController.getInvitations
);

router.put('/:groupId/invitations/:invitationId',
  auth.required,
  validateRequest(invitationSchema),
  GroupsController.updateInvitation
);

router.delete('/:groupId/invitations/:invitationId',
  auth.required,
  GroupsController.cancelInvitation
);

// Group Metrics and Stats
router.get('/:groupId/stats',
  auth.required,
  GroupsController.getGroupStats
);

router.get('/:groupId/activity',
  auth.required,
  GroupsController.getGroupActivity
);

module.exports = router; 