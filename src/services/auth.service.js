const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models/sql');
const sessionService = require('./session.service');
const emailService = require('./email.service');
const { AuthenticationError, ValidationError } = require('../utils/errors/app.errors');
const config = require('../config');
const { logError, logInfo } = require('../utils/logger.helper');

class AuthService {
  async login(email, password) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new AuthenticationError('Invalid credentials');
      }

      if (!user.is_active) {
        throw new AuthenticationError('Account is disabled');
      }

      const session = await sessionService.createSession(user.id, {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      const token = this.generateToken(user, session.id);

      await user.update({ last_login: new Date() });

      logInfo('AuthService.login', 'User logged in successfully', {
        userId: user.id,
        sessionId: session.id
      });

      return { user, token, session };
    } catch (error) {
      throw error;
    }
  }

  async register(userData) {
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: userData.email },
          { username: userData.username }
        ]
      }
    });

    if (existingUser) {
      throw new ValidationError('Email or username already exists');
    }

    const passwordHash = await bcrypt.hash(userData.password, 12);
    const user = await User.create({
      ...userData,
      password_hash: passwordHash
    });

    const session = await sessionService.createSession(user.id, {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    const token = this.generateToken(user, session.id);

    logInfo('AuthService.register', 'User registered successfully', {
      userId: user.id,
      sessionId: session.id
    });

    return { user, token, session };
  }

  async logout(sessionId) {
    await sessionService.deleteSession(sessionId);
    logInfo('AuthService.logout', 'User logged out successfully', {
      sessionId
    });
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const session = await sessionService.getSession(decoded.sessionId);

      if (!session) {
        throw new AuthenticationError('Invalid refresh token');
      }

      const user = await User.findByPk(session.userId);
      if (!user || !user.is_active) {
        throw new AuthenticationError('User not found or inactive');
      }

      const newToken = this.generateToken(user, session.id);

      return { token: newToken, session };
    } catch (error) {
      logError('AuthService.refreshToken', error);
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  generateToken(user, sessionId) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await user.update({ password_hash: passwordHash });

    // Invalidate all sessions
    await sessionService.deleteUserSessions(userId);

    logInfo('AuthService.changePassword', 'Password changed successfully', {
      userId
    });
  }

  async requestPasswordReset(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Return success anyway to prevent email enumeration
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 12);

    await user.update({
      reset_token_hash: resetTokenHash,
      reset_token_expires: new Date(Date.now() + 3600000) // 1 hour
    });

    await emailService.sendPasswordResetEmail(user, resetToken);

    logInfo('AuthService.requestPasswordReset', 'Password reset requested', {
      userId: user.id
    });
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      where: {
        reset_token_expires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const isValidToken = await bcrypt.compare(token, user.reset_token_hash);
    if (!isValidToken) {
      throw new AuthenticationError('Invalid reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await user.update({
      password_hash: passwordHash,
      reset_token_hash: null,
      reset_token_expires: null
    });

    // Invalidate all sessions
    await sessionService.deleteUserSessions(user.id);

    logInfo('AuthService.resetPassword', 'Password reset successful', {
      userId: user.id
    });
  }
}

module.exports = new AuthService(); 