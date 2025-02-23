const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const groupRoutes = require('./groups.routes');
const notificationRoutes = require('./notifications.routes');
const activityRoutes = require('./activity.routes');
const postRoutes = require('./posts.routes');
const categoryRoutes = require('./categories.routes');
const tagRoutes = require('./tags.routes');
const adminRoutes = require('./admin.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/groups', groupRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity', activityRoutes);
router.use('/posts', postRoutes);
router.use('/categories', categoryRoutes);
router.use('/tags', tagRoutes);
router.use('/admin', adminRoutes);  // This mounts all admin routes under /api/v1/admin

module.exports = router;
