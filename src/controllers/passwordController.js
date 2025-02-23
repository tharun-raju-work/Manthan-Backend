const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { validatePassword, hashPassword } = require('../utils/passwordUtils');
const logger = require('../config/logger');

exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Return success even if user doesn't exist (security)
      return res.json({
        message: 'If your email exists in our system, you will receive a password reset link.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({
      message: 'If your email exists in our system, you will receive a password reset link.',
    });
  } catch (error) {
    logger.error('Password reset request failed:', error);
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: 'Password reset token is invalid or has expired',
      });
    }

    // Validate new password
    validatePassword(password);

    // Update password
    user.password = await hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Password reset successful for user: ${user._id}`);

    res.json({
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    logger.error('Password reset failed:', error);
    next(error);
  }
};
