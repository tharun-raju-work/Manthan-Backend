const { ValidationError } = require('../utils/errors/app.errors');
const { logError } = require('../utils/logger.helper');

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        throw new ValidationError('Validation failed', errors);
      }

      next();
    } catch (err) {
      logError('validator.middleware', err);
      next(err);
    }
  };
};

module.exports = {
  validateRequest
}; 