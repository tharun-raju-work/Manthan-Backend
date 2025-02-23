const UserService = require('../services/user.service');
const { asyncHandler } = require('../utils/asyncHandler');

class UsersController {
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await UserService.getUserById(req.user.id);
    res.json(user);
  });

  updateProfile = asyncHandler(async (req, res) => {
    const updatedUser = await UserService.updateUser(req.user.id, req.body);
    res.json(updatedUser);
  });

  listUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const users = await UserService.listUsers({ page, limit, search });
    res.json(users);
  });

  getUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await UserService.getUserProfile(userId);
    res.json(user);
  });

  followUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await UserService.followUser(req.user.id, userId);
    res.status(200).json({ message: 'User followed successfully' });
  });

  unfollowUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await UserService.unfollowUser(req.user.id, userId);
    res.status(200).json({ message: 'User unfollowed successfully' });
  });

  getPreferences = asyncHandler(async (req, res) => {
    const preferences = await UserService.getUserPreferences(req.user.id);
    res.json(preferences);
  });

  updatePreferences = asyncHandler(async (req, res) => {
    const preferences = await UserService.updateUserPreferences(
      req.user.id,
      req.body
    );
    res.json(preferences);
  });
}

module.exports = new UsersController(); 