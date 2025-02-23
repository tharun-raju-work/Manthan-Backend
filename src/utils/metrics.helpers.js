const {
  userMetrics,
  postEngagementMetrics,
  categoryMetrics,
  geographicMetrics
} = require('../config/metrics');

const updateUserMetrics = async (type, value) => {
  userMetrics.labels(type).set(value);
};

const updatePostEngagement = async (type, value) => {
  postEngagementMetrics.labels(type).set(value);
};

const updateCategoryMetrics = async (category, type, value) => {
  categoryMetrics.labels(category, type).set(value);
};

const updateGeographicMetrics = async (region, type, value) => {
  geographicMetrics.labels(region, type).set(value);
};

// Example usage in a service
const updateMetricsForPost = async (post) => {
  // Update category metrics
  await updateCategoryMetrics(post.category, 'active_posts', 1);
  
  // Update geographic metrics if location exists
  if (post.location) {
    const region = await getRegionFromCoordinates(post.location);
    await updateGeographicMetrics(region, 'post_count', 1);
  }
  
  // Update engagement metrics
  await updatePostEngagement('total_posts', await Post.count());
};

module.exports = {
  updateUserMetrics,
  updatePostEngagement,
  updateCategoryMetrics,
  updateGeographicMetrics,
  updateMetricsForPost
}; 