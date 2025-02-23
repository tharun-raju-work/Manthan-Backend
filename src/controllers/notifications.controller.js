const NotificationService = require('../services/notification.service');
const { asyncHandler } = require('../utils/asyncHandler');

class NotificationsController {
  getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;
    const notifications = await NotificationService.getUserNotifications(
      req.user.id,
      { page, limit, type }
    );
    res.json(notifications);
  });

  markAsRead = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;
    await NotificationService.markAsRead(req.user.id, notificationIds);
    res.status(200).json({ message: 'Notifications marked as read' });
  });

  deleteNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    await NotificationService.deleteNotification(req.user.id, notificationId);
    res.status(204).end();
  });

  getPreferences = asyncHandler(async (req, res) => {
    const preferences = await NotificationService.getPreferences(req.user.id);
    res.json(preferences);
  });

  updatePreferences = asyncHandler(async (req, res) => {
    const preferences = await NotificationService.updatePreferences(
      req.user.id,
      req.body
    );
    res.json(preferences);
  });
}

module.exports = new NotificationsController(); 