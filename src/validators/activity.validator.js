const Joi = require('joi');

const activitySchema = Joi.object({
  entityType: Joi.string()
    .valid('group', 'post', 'comment', 'user')
    .when('$isEntityActivity', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
  entityId: Joi.string()
    .when('entityType', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
  timeframe: Joi.string()
    .valid('day', 'week', 'month', 'year')
    .default('week')
    .when('$isStats', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  type: Joi.string()
    .valid('created', 'updated', 'deleted', 'joined', 'left')
    .optional()
});

module.exports = {
  activitySchema
}; 