const Joi = require('joi');

const socialAuthSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Token is required',
      'any.required': 'Token is required'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
});

const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    })
});

const twoFactorSchema = Joi.object({
  token: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'Token must be 6 digits',
      'string.pattern.base': 'Token must contain only numbers',
      'any.required': 'Token is required'
    })
});

const passwordResetSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required'
    }),
  token: Joi.string()
    .when('$isReset', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
  newPassword: Joi.string()
    .when('$isReset', {
      is: true,
      then: Joi.string()
        .min(6)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
          'string.min': 'New password must be at least 6 characters long',
          'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
          'any.required': 'New password is required'
        }),
      otherwise: Joi.forbidden()
    })
}).with('token', 'newPassword');

module.exports = {
  socialAuthSchema,
  loginSchema,
  registerSchema,
  twoFactorSchema,
  passwordResetSchema
}; 