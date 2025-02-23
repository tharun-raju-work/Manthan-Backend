const AuthService = require('../services/auth.service');
const { asyncHandler } = require('../utils/asyncHandler');
const twoFactorService = require('../services/twoFactor.service');
const socialService = require('../services/social.service');
const { logInfo } = require('../utils/logger.helper');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

class AuthController {
  // Basic auth methods
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { user, session } = await AuthService.login(email, password);
    
    // Generate JWT token
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      sessionId: session.id
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    logInfo('AuthController.login', 'User logged in successfully', { userId: user.id });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  });

  register = asyncHandler(async (req, res) => {
    const { user, token } = await AuthService.register(req.body);
    
    logInfo('AuthController.register', 'User registered successfully', { userId: user.id });
    res.status(201).json({ user, token });
  });

  logout = asyncHandler(async (req, res) => {
    await AuthService.logout(req.user.id);
    
    logInfo('AuthController.logout', 'User logged out successfully', { userId: req.user.id });
    res.status(204).end();
  });

  refreshToken = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const newToken = await AuthService.refreshToken(token);
    res.json({ token: newToken });
  });

  // Password management
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    
    logInfo('AuthController.changePassword', 'Password changed successfully', { userId: req.user.id });
    res.status(204).end();
  });

  requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await AuthService.requestPasswordReset(email);
    
    // Don't leak information about whether the email exists
    res.status(202).json({
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
  });

  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    await AuthService.resetPassword(token, newPassword);
    
    res.status(200).json({
      message: 'Password has been reset successfully'
    });
  });

  // 2FA methods
  setup2FA = asyncHandler(async (req, res) => {
    const { secret, qrCode } = await twoFactorService.generateSecret(req.user.id);
    
    logInfo('AuthController.setup2FA', '2FA setup initiated', { userId: req.user.id });
    res.json({ secret, qrCode });
  });

  enable2FA = asyncHandler(async (req, res) => {
    const { token } = req.body;
    await twoFactorService.verifyAndEnable(req.user.id, token);
    
    logInfo('AuthController.enable2FA', '2FA enabled', { userId: req.user.id });
    res.status(200).json({ message: '2FA enabled successfully' });
  });

  disable2FA = asyncHandler(async (req, res) => {
    const { token } = req.body;
    await twoFactorService.disable(req.user.id, token);
    
    logInfo('AuthController.disable2FA', '2FA disabled', { userId: req.user.id });
    res.status(200).json({ message: '2FA disabled successfully' });
  });

  verify2FA = asyncHandler(async (req, res) => {
    const { token } = req.body;
    await twoFactorService.verify(req.user.id, token);
    
    logInfo('AuthController.verify2FA', '2FA verified', { userId: req.user.id });
    res.status(200).json({ message: 'Token verified successfully' });
  });

  // Social auth methods
  googleLogin = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const { user, authToken } = await socialService.handleGoogleLogin(token);
    
    logInfo('AuthController.googleLogin', 'User logged in via Google', { userId: user.id });
    res.json({ user, token: authToken });
  });

  githubLogin = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const { user, authToken } = await socialService.handleGithubLogin(code);
    
    logInfo('AuthController.githubLogin', 'User logged in via GitHub', { userId: user.id });
    res.json({ user, token: authToken });
  });
}

// Export a single instance
module.exports = new AuthController(); 