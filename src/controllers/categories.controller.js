const CategoryService = require('../services/category.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ValidationError } = require('../utils/errors/app.errors');

class CategoryController {
  getCategories = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const categories = await CategoryService.getCategories({ page, limit });
    res.json(categories);
  });

  createCategory = asyncHandler(async (req, res) => {
    const category = await CategoryService.createCategory(req.body);
    res.status(201).json(category);
  });

  updateCategory = asyncHandler(async (req, res) => {
    const category = await CategoryService.updateCategory(req.params.id, req.body);
    res.json(category);
  });

  deleteCategory = asyncHandler(async (req, res) => {
    await CategoryService.deleteCategory(req.params.id);
    res.status(204).end();
  });
}

module.exports = new CategoryController(); 