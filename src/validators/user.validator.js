const Joi = require('joi');

const userSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
    }),

  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  profile: Joi.object({
    name: Joi.string().max(100),
    bio: Joi.string().max(500),
    location: Joi.string().max(100),
    website: Joi.string().uri().max(200),
    social: Joi.object({
      twitter: Joi.string(),
      github: Joi.string(),
      linkedin: Joi.string()
    })
  }),

  preferences: Joi.object({
    emailNotifications: Joi.boolean(),
    pushNotifications: Joi.boolean(),
    theme: Joi.string().valid('light', 'dark', 'system'),
    language: Joi.string().length(2),
    timezone: Joi.string()
  })
}).min(1);

module.exports = {
  userSchema
}; 