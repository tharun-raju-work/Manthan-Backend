const Joi = require('joi');

const authValidation = {
  // ... existing validations ...

  passwordResetRequest: Joi.object({
    email: Joi.string().email().required()
  }),

  passwordReset: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
      })
  })
}; 