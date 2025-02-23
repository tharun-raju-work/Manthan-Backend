const Joi = require('joi');

const groupSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Group name must be at least 3 characters long',
      'string.max': 'Group name cannot exceed 100 characters'
    }),
  description: Joi.string()
    .max(500)
    .optional(),
  isPrivate: Joi.boolean()
    .default(false),
  settings: Joi.object({
    allowInvites: Joi.boolean().default(true),
    memberPostingRights: Joi.string()
      .valid('all', 'admins', 'approved')
      .default('all')
  }).default()
});

const invitationSchema = Joi.object({
  userIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one user must be selected'
    }),
  message: Joi.string()
    .max(500)
    .optional(),
  status: Joi.string()
    .valid('pending', 'accepted', 'rejected')
    .when('$isUpdate', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
});

module.exports = {
  groupSchema,
  invitationSchema
}; 