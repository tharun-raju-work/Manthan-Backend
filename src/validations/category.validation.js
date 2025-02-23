const Joi = require('joi');

const categoryValidation = {
  createCategory: Joi.object({
    name: Joi.string().max(50).required(),
    description: Joi.string()
  })
};

module.exports = { categoryValidation }; 