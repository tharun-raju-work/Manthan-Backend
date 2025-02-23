const TagService = require('../services/tag.service');
const { asyncHandler } = require('../utils/asyncHandler');

class TagController {
  getTags = asyncHandler(async (req, res) => {
    const { search, page = 1, limit = 50 } = req.query;
    const tags = await TagService.getTags({ search, page, limit });
    res.json(tags);
  });

  createTag = asyncHandler(async (req, res) => {
    const tag = await TagService.createTag(req.body);
    res.status(201).json(tag);
  });

  updateTag = asyncHandler(async (req, res) => {
    const tag = await TagService.updateTag(req.params.id, req.body);
    res.json(tag);
  });

  deleteTag = asyncHandler(async (req, res) => {
    await TagService.deleteTag(req.params.id);
    res.status(204).end();
  });
}

module.exports = new TagController(); 