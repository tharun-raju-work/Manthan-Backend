const authRoutes = require('./auth');
const userRoutes = require('./users');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');
const groupRoutes = require('./groups');
const notificationRoutes = require('./notifications');
const tagRoutes = require('./tags');

module.exports = {
  authRoutes,
  userRoutes,
  postRoutes,
  commentRoutes,
  groupRoutes,
  notificationRoutes,
  tagRoutes,
};
