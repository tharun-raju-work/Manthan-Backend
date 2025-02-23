const PostService = require('../services/posts.service');
const { ApiError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

class PostController {
  // Get all posts with pagination and filters
  getPosts = asyncHandler(async (req, res) => {
    const filters = {
      category: req.query.category,
      tags: req.query.tags,
      status: req.query.status,
      location: req.query.location,
    };

    const pagination = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
    };

    const posts = await PostService.getPosts(filters, pagination);
    res.json(posts);
  });

  // Get single post by ID
  getPost = asyncHandler(async (req, res) => {
    const post = await PostService.getPostById(req.params.id);
    if (!post) {
      throw new ApiError(404, 'Post not found');
    }
    res.json(post);
  });

  // Create new post
  createPost = asyncHandler(async (req, res) => {
    const postData = {
      ...req.body,
      userId: req.user.id, // From auth middleware
    };

    const post = await PostService.createPost(postData);
    res.status(201).json(post);
  });

  // Update post
  updatePost = asyncHandler(async (req, res) => {
    const post = await PostService.updatePost(req.params.id, req.body, req.user.id);
    if (!post) {
      throw new ApiError(404, 'Post not found');
    }
    res.json(post);
  });

  // Delete post
  deletePost = asyncHandler(async (req, res) => {
    await PostService.deletePost(req.params.id, req.user.id);
    res.status(204).end();
  });

  // Vote on post
  votePost = asyncHandler(async (req, res) => {
    const vote = await PostService.votePost(
      req.params.id,
      req.user.id,
      req.body.voteValue,
    );
    res.json(vote);
  });

  // Add tags to post
  addTags = asyncHandler(async (req, res) => {
    const post = await PostService.addTags(
      req.params.id,
      req.body.tags,
      req.user.id,
    );
    res.json(post);
  });
}

module.exports = new PostController();
