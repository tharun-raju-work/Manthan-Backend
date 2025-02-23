const express = require('express');
const router = express.Router();
const NotificationsController = require('../controllers/notifications.controller');
const auth = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validator.middleware');
const { notificationSchema } = require('../validators/notification.validator');

// Get user's notifications
router.get('/',
  auth.required,
  NotificationsController.getNotifications
);

// Mark notifications as read
router.put('/read',
  auth.required,
  validateRequest(notificationSchema),
  NotificationsController.markAsRead
);

// Delete notification
router.delete('/:notificationId',
  auth.required,
  NotificationsController.deleteNotification
);

// Get notification preferences
router.get('/preferences',
  auth.required,
  NotificationsController.getPreferences
);

// Update notification preferences
router.put('/preferences',
  auth.required,
  validateRequest(notificationSchema),
  NotificationsController.updatePreferences
);

module.exports = router; 