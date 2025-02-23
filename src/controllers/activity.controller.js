const ActivityService = require('../services/activity-log.service');
const { asyncHandler } = require('../utils/asyncHandler');

class ActivityController {
  getUserActivity = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;
    const activities = await ActivityService.getUserActivity(
      req.user.id,
      { page, limit, type }
    );
    res.json(activities);
  });

  getEntityActivity = asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const activities = await ActivityService.getEntityActivity(
      entityType,
      entityId,
      { page, limit }
    );
    res.json(activities);
  });

  getActivityFeed = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const feed = await ActivityService.getActivityFeed(
      req.user.id,
      { page, limit }
    );
    res.json(feed);
  });

  getActivityStats = asyncHandler(async (req, res) => {
    const { timeframe = 'week' } = req.query;
    const stats = await ActivityService.getActivityStats(
      req.user.id,
      timeframe
    );
    res.json(stats);
  });
}

module.exports = new ActivityController(); 