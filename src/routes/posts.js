const express = require('express');

const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');
const validateRequest = require('../middleware/validateRequest');
const postController = require('../controllers/postController');
const cacheService = require('../services/cacheService');

const postValidation = [
  body('title').trim().isLength({ min: 3 }).escape(),
  body('description').trim().isLength({ min: 10 }),
  body('categoryId').isMongoId(),
  body('location.coordinates').isArray().optional(),
  body('imageUrl').isURL().optional(),
];

// Cache posts list for 5 minutes
router.get('/', cache('posts', 300), postController.getPosts);

// Cache individual posts for 10 minutes
router.get('/:id', cache('post', 600), postController.getPost);

// Clear cache when creating/updating/deleting posts
router.post('/', auth, postValidation, validateRequest, async (req, res, next) => {
  try {
    await postController.createPost(req, res);
    await cacheService.invalidatePattern('posts:*');
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, postValidation, validateRequest, async (req, res, next) => {
  try {
    await postController.updatePost(req, res);
    await cacheService.invalidatePattern('posts:*');
    await cacheService.invalidatePattern(`post:*/posts/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await postController.deletePost(req, res);
    await cacheService.invalidatePattern('posts:*');
    await cacheService.invalidatePattern(`post:*/posts/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/vote', auth, async (req, res, next) => {
  try {
    await postController.votePost(req, res);
    await cacheService.invalidatePattern(`post:*/posts/${req.params.id}`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
