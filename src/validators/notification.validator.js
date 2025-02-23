const Joi = require('joi');

const notificationSchema = Joi.object({
  notificationIds: Joi.array()
    .items(Joi.string())
    .when('$isMarkRead', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
  preferences: Joi.object({
    email: Joi.boolean().default(true),
    push: Joi.boolean().default(true),
    inApp: Joi.boolean().default(true),
    types: Joi.object({
      group_invitation: Joi.boolean().default(true),
      group_updates: Joi.boolean().default(true),
      mentions: Joi.boolean().default(true),
      direct_messages: Joi.boolean().default(true)
    }).default()
  }).when('$isPreferences', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.forbidden()
  })
});

module.exports = {
  notificationSchema
}; 