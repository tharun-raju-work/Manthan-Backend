const { 
  userMetrics, 
  postEngagementMetrics,
  categoryMetrics,
  geographicMetrics,
  errorMetrics 
} = require('../config/metrics');
let Post, User, Comment, sequelize;

// Try to load models if they exist
try {
  const models = require('../models/sql');
  Post = models.Post;
  User = models.User;
  Comment = models.Comment;
  sequelize = require('../config/database').sequelize;
} catch (error) {
  // Models not required for basic operation
}

class MetricsAggregator {
  // User metrics aggregation
  async aggregateUserMetrics() {
    try {
      if (!User || !sequelize) {
        return;
      }
      // Active users (users who logged in within last 24h)
      const activeUsers = await User.count({
        where: {
          last_login: {
            [sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      userMetrics.labels('active_users').set(activeUsers);

      // New users in last 24h
      const newUsers = await User.count({
        where: {
          created_at: {
            [sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      userMetrics.labels('new_registrations').set(newUsers);
    } catch (error) {
      errorMetrics.labels('user_metrics_aggregation', error.code || 'unknown').inc();
      console.error('Error aggregating user metrics:', error);
    }
  }

  // Post engagement metrics aggregation
  async aggregatePostMetrics() {
    try {
      if (!Post || !sequelize) {
        return;
      }
      // Posts by status
      const postsByStatus = await Post.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      postsByStatus.forEach(stat => {
        postEngagementMetrics.labels(`status_${stat.status}`).set(stat.count);
      });

      // Posts with high engagement (more than 10 comments or votes)
      const highEngagementPosts = await Post.count({
        where: sequelize.literal('vote_count > 10 OR comment_count > 10')
      });
      postEngagementMetrics.labels('high_engagement').set(highEngagementPosts);
    } catch (error) {
      errorMetrics.labels('post_metrics_aggregation', error.code || 'unknown').inc();
      console.error('Error aggregating post metrics:', error);
    }
  }

  // Category metrics aggregation
  async aggregateCategoryMetrics() {
    try {
      if (!Post || !sequelize) {
        return;
      }
      const categoryStats = await Post.findAll({
        attributes: [
          'category_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'post_count'],
          [sequelize.fn('AVG', sequelize.col('vote_count')), 'avg_votes']
        ],
        group: ['category_id']
      });

      categoryStats.forEach(stat => {
        categoryMetrics.labels(stat.category_id, 'post_count').set(stat.post_count);
        categoryMetrics.labels(stat.category_id, 'avg_votes').set(stat.avg_votes);
      });
    } catch (error) {
      errorMetrics.labels('category_metrics_aggregation', error.code || 'unknown').inc();
      console.error('Error aggregating category metrics:', error);
    }
  }

  // Geographic metrics aggregation
  async aggregateGeographicMetrics() {
    try {
      if (!Post || !sequelize) {
        return;
      }
      const geographicStats = await Post.findAll({
        attributes: [
          [sequelize.fn('ST_Region', sequelize.col('location')), 'region'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: [sequelize.fn('ST_Region', sequelize.col('location'))]
      });

      geographicStats.forEach(stat => {
        geographicMetrics.labels(stat.region, 'post_count').set(stat.count);
      });
    } catch (error) {
      errorMetrics.labels('geographic_metrics_aggregation', error.code || 'unknown').inc();
      console.error('Error aggregating geographic metrics:', error);
    }
  }

  // Schedule regular updates
  startRegularUpdates() {
    // Update user metrics every minute
    setInterval(() => this.aggregateUserMetrics(), 60 * 1000);

    // Update post metrics every 5 minutes
    setInterval(() => this.aggregatePostMetrics(), 5 * 60 * 1000);

    // Update category metrics every 15 minutes
    setInterval(() => this.aggregateCategoryMetrics(), 15 * 60 * 1000);

    // Update geographic metrics every 30 minutes
    setInterval(() => this.aggregateGeographicMetrics(), 30 * 60 * 1000);
  }

  // Run all aggregations
  async aggregateAll() {
    await Promise.all([
      this.aggregateUserMetrics(),
      this.aggregatePostMetrics(),
      this.aggregateCategoryMetrics(),
      this.aggregateGeographicMetrics()
    ]);
  }
}

module.exports = new MetricsAggregator(); 