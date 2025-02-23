const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models/sql');
const { AuthenticationError } = require('../utils/errors/app.errors');
const { logError, logInfo } = require('../utils/logger.helper');

class TwoFactorService {
  async generateSecret(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      const secret = speakeasy.generateSecret({
        length: 20,
        name: `YourApp:${user.email}`
      });

      // Store the secret temporarily
      await user.update({
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl
      };
    } catch (error) {
      logError('TwoFactorService.generateSecret', error);
      throw error;
    }
  }

  async verifyAndEnable(userId, token) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.twoFactorSecret) {
        throw new AuthenticationError('Invalid setup state');
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token
      });

      if (!isValid) {
        throw new AuthenticationError('Invalid verification code');
      }

      await user.update({ twoFactorEnabled: true });

      logInfo('TwoFactorService.verifyAndEnable', '2FA enabled successfully', {
        userId
      });

      return true;
    } catch (error) {
      logError('TwoFactorService.verifyAndEnable', error);
      throw error;
    }
  }

  async verify(userId, token) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new AuthenticationError('2FA not enabled');
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 1 step before/after for time drift
      });

      if (!isValid) {
        throw new AuthenticationError('Invalid verification code');
      }

      return true;
    } catch (error) {
      logError('TwoFactorService.verify', error);
      throw error;
    }
  }

  async disable(userId, token) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new AuthenticationError('2FA not enabled');
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token
      });

      if (!isValid) {
        throw new AuthenticationError('Invalid verification code');
      }

      await user.update({
        twoFactorSecret: null,
        twoFactorEnabled: false
      });

      logInfo('TwoFactorService.disable', '2FA disabled successfully', {
        userId
      });

      return true;
    } catch (error) {
      logError('TwoFactorService.disable', error);
      throw error;
    }
  }
}

module.exports = new TwoFactorService(); 