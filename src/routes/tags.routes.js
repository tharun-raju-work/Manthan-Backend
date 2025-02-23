const express = require('express');
const router = express.Router();
const TagController = require('../controllers/tags.controller');
const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { tagValidation } = require('../validations/tag.validation');

router.get('/', TagController.getTags);
router.post(
  '/',
  auth.required,
  validate(tagValidation.createTag),
  TagController.createTag
);

module.exports = router; 