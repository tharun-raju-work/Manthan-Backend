const Joi = require('joi');

const tagValidation = {
  createTag: Joi.object({
    name: Joi.string().max(50).required(),
    description: Joi.string()
  })
};

module.exports = { tagValidation }; 