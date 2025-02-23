const Post = require('../models/Post');

exports.getPosts = async (req, res, next) => {
  try {
    const {
      category, tag, status, page = 1, limit = 10,
    } = req.query;
    const query = {};

    if (category) query.categoryId = category;
    if (tag) query.tags = tag;
    if (status) query.status = status;

    const posts = await Post.find(query)
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('userId', 'username')
      .populate({
        path: 'comments',
        populate: { path: 'userId', select: 'username' },
      });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    next(error);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const {
      title, description, categoryId, imageUrl, location,
    } = req.body;
    const post = new Post({
      title,
      description,
      categoryId,
      imageUrl,
      location,
      userId: req.user.id,
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true },
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    res.json(post);
  } catch (error) {
    next(error);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'deleted' },
      { new: true },
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.votePost = async (req, res, next) => {
  try {
    const { voteValue } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Update vote count and user's vote
    const existingVote = post.votes.find(
      (vote) => vote.userId.toString() === req.user.id,
    );

    if (existingVote) {
      existingVote.value = voteValue;
    } else {
      post.votes.push({ userId: req.user.id, value: voteValue });
    }

    await post.save();
    res.json(post);
  } catch (error) {
    next(error);
  }
};
