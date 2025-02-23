const Comment = require('../models/Comment');

exports.createComment = async (req, res, next) => {
  try {
    const { content, parentCommentId } = req.body;
    const comment = new Comment({
      postId: req.params.postId,
      userId: req.user.id,
      content,
      parentCommentId,
    });

    await comment.save();
    await comment.populate('userId', 'username');
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { content: req.body.content },
      { new: true },
    ).populate('userId', 'username');

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    res.json(comment);
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'deleted' },
      { new: true },
    );

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
