const Joi = require('joi');

const postValidation = {
  getPosts: Joi.object({
    category: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed'),
    location: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
      radius: Joi.number(),
    }),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }),

  getPost: Joi.object({
    id: Joi.number().required(),
  }),

  createPost: Joi.object({
    title: Joi.string().required().min(3).max(255),
    description: Joi.string(),
    category_id: Joi.number(),
    image_url: Joi.string().uri(),
    location: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    }),
    tags: Joi.array().items(Joi.string()),
  }),

  updatePost: Joi.object({
    title: Joi.string().min(3).max(255),
    description: Joi.string(),
    category_id: Joi.number(),
    image_url: Joi.string().uri(),
    status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed'),
    tags: Joi.array().items(Joi.string()),
  }),

  deletePost: Joi.object({
    id: Joi.number().required(),
  }),

  votePost: Joi.object({
    voteValue: Joi.number().valid(-1, 1).required(),
  }),

  addTags: Joi.object({
    tags: Joi.array().items(Joi.string()).min(1).required(),
  }),
};

module.exports = { postValidation };
