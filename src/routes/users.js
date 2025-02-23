const express = require('express');

const router = express.Router();
const auth = require('../middleware/auth');
const cache = require('../middleware/cache');
const cacheService = require('../services/cacheService');

// Cache user profile for 15 minutes
router.get('/:id', auth, cache('user', 900), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -verificationToken -passwordResetToken');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    ).select('-password -verificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate user cache
    await cacheService.invalidatePattern(`user:*/users/${req.params.id}`);

    res.json(user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
