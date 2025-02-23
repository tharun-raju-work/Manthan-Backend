const express = require('express');

const router = express.Router();
const PostController = require('../controllers/posts.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { postValidation } = require('../validations/post.validation');

// Get all posts with pagination and filters
router.get('/', validate(postValidation.getPosts), PostController.getPosts);

// Get single post by ID
router.get('/:id', validate(postValidation.getPost), PostController.getPost);

// Create new post (authenticated)
router.post(
  '/',
  auth.required,
  validate(postValidation.createPost),
  PostController.createPost,
);

// Update post (authenticated + ownership)
router.put(
  '/:id',
  auth.required,
  validate(postValidation.updatePost),
  PostController.updatePost,
);

// Delete post (authenticated + ownership)
router.delete(
  '/:id',
  auth.required,
  validate(postValidation.deletePost),
  PostController.deletePost,
);

// Vote on post (authenticated)
router.post(
  '/:id/vote',
  auth.required,
  validate(postValidation.votePost),
  PostController.votePost,
);

// Add tags to post (authenticated + ownership)
router.post(
  '/:id/tags',
  auth.required,
  validate(postValidation.addTags),
  PostController.addTags,
);

module.exports = router;
