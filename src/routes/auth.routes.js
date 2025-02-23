const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { validateRequest } = require('../middleware/validator.middleware');
const { authLimiter } = require('../middleware/rate-limit.middleware');
const auth = require('../middleware/auth.middleware');
const { 
  socialAuthSchema,
  loginSchema,
  registerSchema,
  twoFactorSchema,
  passwordResetSchema
} = require('../validators/auth.validator');

// Auth routes with rate limiting
router.post('/login',
  authLimiter,
  validateRequest(loginSchema), 
  AuthController.login
);

router.post('/register', 
  validateRequest(registerSchema), 
  AuthController.register
);

router.post('/logout', 
  auth.required, 
  AuthController.logout
);

router.post('/refresh-token', 
  validateRequest(loginSchema), 
  AuthController.refreshToken
);

// Password management
router.post('/password/change',
  auth.required,
  validateRequest(passwordResetSchema),
  AuthController.changePassword
);

router.post('/password/reset-request',
  authLimiter,
  validateRequest(passwordResetSchema),
  AuthController.requestPasswordReset
);

router.post('/password/reset',
  authLimiter,
  validateRequest(passwordResetSchema),
  AuthController.resetPassword
);

// 2FA routes
router.post('/2fa/setup',
  auth.required,
  AuthController.setup2FA
);

router.post('/2fa/enable',
  auth.required,
  validateRequest(twoFactorSchema),
  AuthController.enable2FA
);

router.post('/2fa/disable',
  auth.required,
  validateRequest(twoFactorSchema),
  AuthController.disable2FA
);

router.post('/2fa/verify',
  auth.required,
  validateRequest(twoFactorSchema),
  AuthController.verify2FA
);

// Social auth routes
router.post('/social/google',
  validateRequest(socialAuthSchema),
  AuthController.googleLogin
);

router.post('/social/github',
  validateRequest(socialAuthSchema),
  AuthController.githubLogin
);

module.exports = router; 