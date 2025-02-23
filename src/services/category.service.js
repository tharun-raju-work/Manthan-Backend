const { Category, Post } = require('../models/sql');
const { ValidationError } = require('../utils/errors/app.errors');
const { logError } = require('../utils/logger.helper');

class CategoryService {
  async getCategories({ page, limit }) {
    try {
      const offset = (page - 1) * limit;
      const { rows: categories, count } = await Category.findAndCountAll({
        limit,
        offset,
        order: [['name', 'ASC']]
      });

      return {
        categories,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logError('CategoryService.getCategories', error);
      throw error;
    }
  }

  async createCategory(data) {
    try {
      const existingCategory = await Category.findOne({
        where: { name: data.name }
      });

      if (existingCategory) {
        throw new ValidationError('Category name already exists');
      }

      return await Category.create(data);
    } catch (error) {
      logError('CategoryService.createCategory', error);
      throw error;
    }
  }

  async updateCategory(id, data) {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new ValidationError('Category not found');
      }

      if (data.name && data.name !== category.name) {
        const existingCategory = await Category.findOne({
          where: { name: data.name }
        });
        if (existingCategory) {
          throw new ValidationError('Category name already exists');
        }
      }

      await category.update(data);
      return category;
    } catch (error) {
      logError('CategoryService.updateCategory', error);
      throw error;
    }
  }

  async deleteCategory(id) {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new ValidationError('Category not found');
      }

      const postsCount = await Post.count({
        where: { category_id: id }
      });

      if (postsCount > 0) {
        throw new ValidationError('Cannot delete category with associated posts');
      }

      await category.destroy();
    } catch (error) {
      logError('CategoryService.deleteCategory', error);
      throw error;
    }
  }
}

module.exports = new CategoryService(); 