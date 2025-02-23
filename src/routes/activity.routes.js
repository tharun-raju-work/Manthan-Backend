const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/activity.controller');
const auth = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validator.middleware');
const { activitySchema } = require('../validators/activity.validator');

// Get user's activity log
router.get('/',
  auth.required,
  ActivityController.getUserActivity
);

// Get activity for a specific entity (group, post, etc.)
router.get('/entity/:entityType/:entityId',
  auth.required,
  ActivityController.getEntityActivity
);

// Get activity feed (aggregated activity from followed entities)
router.get('/feed',
  auth.required,
  ActivityController.getActivityFeed
);

// Get activity statistics
router.get('/stats',
  auth.required,
  ActivityController.getActivityStats
);

module.exports = router; 