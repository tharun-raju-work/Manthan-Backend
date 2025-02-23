const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categories.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { categoryValidation } = require('../validations/category.validation');

router.get('/', CategoryController.getCategories);
router.post(
  '/',
  auth.required,
  auth.hasRole('admin'),
  validate(categoryValidation.createCategory),
  CategoryController.createCategory
);

module.exports = router; 