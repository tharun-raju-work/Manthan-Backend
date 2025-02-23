const {
  Post, User, Tag, PostVote, sequelize,
} = require('../models/sql');
const { ActivityLog } = require('../models/mongo/ActivityLog');
const { ApiError } = require('../utils/errors');
const metricsService = require('./metrics.service');

class PostService {
  async getPosts(filters, pagination) {
    const query = {
      where: {},
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'profile_picture'],
        },
        {
          model: Tag,
          through: { attributes: [] },
        },
      ],
      order: [['created_at', 'DESC']],
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit,
    };

    // Apply filters
    if (filters.category) query.where.category_id = filters.category;
    if (filters.status) query.where.status = filters.status;
    if (filters.tags) {
      query.include[1].where = { name: filters.tags };
    }
    if (filters.location) {
      query.where.location = sequelize.fn(
        'ST_DWithin',
        sequelize.col('location'),
        sequelize.fn(
          'ST_SetSRID',
          sequelize.fn('ST_MakePoint', filters.location.lng, filters.location.lat),
          4326,
        ),
        filters.location.radius || 5000, // Default 5km radius
      );
    }

    const { rows: posts, count } = await Post.findAndCountAll(query);

    return {
      posts,
      pagination: {
        total: count,
        page: pagination.page,
        pages: Math.ceil(count / pagination.limit),
      },
    };
  }

  async getPostById(id) {
    return Post.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'profile_picture'],
        },
        {
          model: Tag,
          through: { attributes: [] },
        },
      ],
    });
  }

  async createPost(postData) {
    const transaction = await sequelize.transaction();

    try {
      const post = await Post.create(postData, { transaction });

      if (postData.tags) {
        const tags = await Promise.all(
          postData.tags.map((tag) => Tag.findOrCreate({
            where: { name: tag },
            transaction,
          })),
        );
        await post.setTags(tags.map(([tag]) => tag), { transaction });
      }

      await transaction.commit();

      // Log activity
      await ActivityLog.create({
        userId: postData.userId,
        action: 'post_created',
        details: { postId: post.id },
      });

      metricsService.trackPost(post.status, post.category_id);

      return this.getPostById(post.id);
    } catch (error) {
      await transaction.rollback();
      metricsService.trackError('post_creation', error.code || 'unknown');
      throw error;
    }
  }

  async updatePost(id, updateData, userId) {
    const post = await Post.findByPk(id);

    if (!post) throw new ApiError(404, 'Post not found');
    if (post.user_id !== userId) throw new ApiError(403, 'Unauthorized');

    const transaction = await sequelize.transaction();

    try {
      await post.update(updateData, { transaction });

      if (updateData.tags) {
        const tags = await Promise.all(
          updateData.tags.map((tag) => Tag.findOrCreate({
            where: { name: tag },
            transaction,
          })),
        );
        await post.setTags(tags.map(([tag]) => tag), { transaction });
      }

      await transaction.commit();
      return this.getPostById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async deletePost(id, userId) {
    const post = await Post.findByPk(id);

    if (!post) throw new ApiError(404, 'Post not found');
    if (post.user_id !== userId) throw new ApiError(403, 'Unauthorized');

    await post.destroy();

    // Log activity
    await ActivityLog.create({
      userId,
      action: 'post_deleted',
      details: { postId: id },
    });
  }

  async votePost(postId, userId, voteValue) {
    const transaction = await sequelize.transaction();

    try {
      const [vote, created] = await PostVote.findOrCreate({
        where: { post_id: postId, user_id: userId },
        defaults: { vote_value: voteValue },
        transaction,
      });

      if (!created && vote.vote_value !== voteValue) {
        await vote.update({ vote_value: voteValue }, { transaction });
      }

      // Update post vote count
      const voteCount = await PostVote.sum('vote_value', {
        where: { post_id: postId },
        transaction,
      });

      await Post.update(
        { vote_count: voteCount },
        { where: { id: postId }, transaction },
      );

      await transaction.commit();
      return vote;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async addTags(postId, tags, userId) {
    const post = await Post.findByPk(postId);

    if (!post) throw new ApiError(404, 'Post not found');
    if (post.user_id !== userId) throw new ApiError(403, 'Unauthorized');

    const transaction = await sequelize.transaction();

    try {
      const tagModels = await Promise.all(
        tags.map((tag) => Tag.findOrCreate({
          where: { name: tag },
          transaction,
        })),
      );

      await post.addTags(tagModels.map(([tag]) => tag), { transaction });
      await transaction.commit();

      return this.getPostById(postId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getPostEngagement(postId) {
    try {
      const [comments, votes] = await Promise.all([
        Comment.count({ where: { post_id: postId } }),
        PostVote.count({ where: { post_id: postId } })
      ]);

      metricsService.observePostEngagement('comments', comments);
      metricsService.observePostEngagement('votes', votes);

      return { comments, votes };
    } catch (error) {
      metricsService.trackError('post_engagement', error.code || 'unknown');
      throw error;
    }
  }
}

module.exports = new PostService();
