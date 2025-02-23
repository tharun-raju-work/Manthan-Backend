const { Tag, Post, sequelize } = require('../models/sql');
const { Op } = require('sequelize');
const { ValidationError } = require('../utils/errors/app.errors');
const { logError } = require('../utils/logger.helper');

class TagService {
  async getTags({ search, page, limit }) {
    try {
      const where = search ? {
        name: {
          [Op.iLike]: `%${search}%`
        }
      } : {};

      const { rows: tags, count } = await Tag.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [['name', 'ASC']]
      });

      return {
        tags,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logError('TagService.getTags', error);
      throw error;
    }
  }

  async createTag(data) {
    const transaction = await sequelize.transaction();
    try {
      const existingTag = await Tag.findOne({
        where: { name: data.name },
        transaction
      });

      if (existingTag) {
        throw new ValidationError('Tag name already exists');
      }

      const tag = await Tag.create(data, { transaction });
      await transaction.commit();
      return tag;
    } catch (error) {
      await transaction.rollback();
      logError('TagService.createTag', error);
      throw error;
    }
  }

  async updateTag(id, data) {
    const transaction = await sequelize.transaction();
    try {
      const tag = await Tag.findByPk(id, { transaction });
      if (!tag) {
        throw new ValidationError('Tag not found');
      }

      if (data.name && data.name !== tag.name) {
        const existingTag = await Tag.findOne({
          where: { name: data.name },
          transaction
        });
        if (existingTag) {
          throw new ValidationError('Tag name already exists');
        }
      }

      await tag.update(data, { transaction });
      await transaction.commit();
      return tag;
    } catch (error) {
      await transaction.rollback();
      logError('TagService.updateTag', error);
      throw error;
    }
  }

  async deleteTag(id) {
    const transaction = await sequelize.transaction();
    try {
      const tag = await Tag.findByPk(id, { transaction });
      if (!tag) {
        throw new ValidationError('Tag not found');
      }

      await tag.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      logError('TagService.deleteTag', error);
      throw error;
    }
  }
}

module.exports = new TagService(); 