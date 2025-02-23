const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const { User } = require('../models/sql');
const { logError, logInfo } = require('../utils/logger.helper');
const config = require('../config');
const { AuthenticationError } = require('../utils/errors/app.errors');
const { Op } = require('sequelize');

class SocialAuthService {
  constructor() {
    if (!config.oauth?.google?.clientId) {
      logWarn('SocialAuthService', 'Google OAuth not configured');
    } else {
      this.googleClient = new OAuth2Client(config.oauth.google.clientId);
    }
  }

  async verifyGoogleToken(token) {
    try {
      if (!this.googleClient) {
        throw new Error('Google OAuth not configured');
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: config.oauth.google.clientId
      });

      const payload = ticket.getPayload();
      
      return {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub
      };
    } catch (error) {
      logError('SocialAuthService.verifyGoogleToken', error);
      throw new AuthenticationError('Invalid Google token');
    }
  }

  async handleGoogleLogin(token) {
    try {
      const userData = await this.verifyGoogleToken(token);
      
      let user = await User.findOne({
        where: {
          [Op.or]: [
            { googleId: userData.googleId },
            { email: userData.email }
          ]
        }
      });

      if (!user) {
        // Create new user
        user = await User.create({
          email: userData.email,
          username: userData.email.split('@')[0],
          googleId: userData.googleId,
          profile_picture: userData.picture,
          is_active: true
        });

        logInfo('SocialAuthService.handleGoogleLogin', 'New user created via Google', {
          userId: user.id
        });
      } else if (!user.googleId) {
        // Link Google account to existing user
        await user.update({ googleId: userData.googleId });
      }

      return user;
    } catch (error) {
      logError('SocialAuthService.handleGoogleLogin', error);
      throw error;
    }
  }

  async verifyGithubToken(code) {
    try {
      // Exchange code for access token
      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: config.oauth.github.clientId,
        client_secret: config.oauth.github.clientSecret,
        code
      }, {
        headers: { Accept: 'application/json' }
      });

      // Get user data with access token
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`
        }
      });

      return userResponse.data;
    } catch (error) {
      logError('SocialAuthService.verifyGithubToken', error);
      throw error;
    }
  }

  async findOrCreateUser(profile, provider) {
    try {
      let user = await User.findOne({
        where: {
          [`${provider}Id`]: profile.id
        }
      });

      if (!user) {
        user = await User.findOne({
          where: { email: profile.email }
        });

        if (user) {
          // Link social account to existing user
          await user.update({
            [`${provider}Id`]: profile.id
          });
        } else {
          // Create new user
          user = await User.create({
            email: profile.email,
            username: profile.name || profile.login,
            [`${provider}Id`]: profile.id,
            profile_picture: profile.picture || profile.avatar_url,
            is_active: true
          });
        }
      }

      return user;
    } catch (error) {
      logError('SocialAuthService.findOrCreateUser', error);
      throw error;
    }
  }
}

module.exports = new SocialAuthService(); 