const { ApiError } = require('../utils/errors');

const validate = (schema) => (req, res, next) => {
  try {
    const { error } = schema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validate;
