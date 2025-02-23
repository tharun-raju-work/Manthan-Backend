const express = require('express');

const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');
const validateRequest = require('../middleware/validateRequest');
const commentController = require('../controllers/commentController');
const cacheService = require('../services/cacheService');

const commentValidation = [
  body('content').trim().isLength({ min: 1 }).escape(),
  body('parentCommentId').isMongoId().optional(),
];

// Cache comments for 5 minutes
router.get('/posts/:postId/comments', cache('comments', 300), async (req, res, next) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .populate('userId', 'username')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/posts/:postId/comments',
  auth,
  commentValidation,
  validateRequest,
  async (req, res, next) => {
    try {
      await commentController.createComment(req, res);
      await cacheService.invalidatePattern(`comments:*/posts/${req.params.postId}/comments`);
      await cacheService.invalidatePattern(`post:*/posts/${req.params.postId}`);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/comments/:id',
  auth,
  commentValidation,
  validateRequest,
  async (req, res, next) => {
    try {
      const comment = await Comment.findById(req.params.id);
      await commentController.updateComment(req, res);
      await cacheService.invalidatePattern(`comments:*/posts/${comment.postId}/comments`);
      await cacheService.invalidatePattern(`post:*/posts/${comment.postId}`);
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/comments/:id', auth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    await commentController.deleteComment(req, res);
    await cacheService.invalidatePattern(`comments:*/posts/${comment.postId}/comments`);
    await cacheService.invalidatePattern(`post:*/posts/${comment.postId}`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
