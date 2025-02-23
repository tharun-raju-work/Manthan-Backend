const Joi = require('joi');

const groupValidation = {
  createGroup: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .pattern(/^[a-zA-Z0-9-_\s]+$/)
      .messages({
        'string.pattern.base': 'Group name can only contain letters, numbers, spaces, hyphens and underscores'
      }),
    description: Joi.string()
      .max(500)
      .optional()
  }),

  updateGroup: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .pattern(/^[a-zA-Z0-9-_\s]+$/),
    description: Joi.string()
      .max(500)
  }).min(1),

  addMember: Joi.object({
    user_id: Joi.number().required(),
    role: Joi.string()
      .valid('member', 'admin', 'moderator')
      .default('member')
  }),

  queryGroups: Joi.object({
    search: Joi.string().max(100),
    page: Joi.number().min(1),
    limit: Joi.number().min(1).max(100),
    sort: Joi.string().valid('name', 'created_at', 'member_count')
  })
};

module.exports = { groupValidation }; 