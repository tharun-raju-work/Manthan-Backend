const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { logError } = require('../utils/logger.helper');

class SessionService {
  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.redis.on('error', (error) => {
      logError('SessionService.redis', error, {
        component: 'Redis',
        action: 'connection'
      });
    });
  }

  async createSession(userId, metadata = {}) {
    try {
      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        userId,
        createdAt: Date.now(),
        ...metadata
      };

      await this.redis.setex(
        `session:${sessionId}`,
        config.session.ttl,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      logError('SessionService.createSession', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const session = await this.redis.get(`session:${sessionId}`);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      logError('SessionService.getSession', error);
      throw error;
    }
  }

  async updateSession(sessionId, updates) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      const updatedSession = { ...session, ...updates };
      await this.redis.setex(
        `session:${sessionId}`,
        config.session.ttl,
        JSON.stringify(updatedSession)
      );

      return true;
    } catch (error) {
      logError('SessionService.updateSession', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      await this.redis.del(`session:${sessionId}`);
    } catch (error) {
      logError('SessionService.deleteSession', error);
      throw error;
    }
  }

  async deleteUserSessions(userId) {
    try {
      const keys = await this.redis.keys(`session:*`);
      for (const key of keys) {
        const session = await this.getSession(key.split(':')[1]);
        if (session && session.userId === userId) {
          await this.deleteSession(session.id);
        }
      }
    } catch (error) {
      logError('SessionService.deleteUserSessions', error);
      throw error;
    }
  }
}

module.exports = new SessionService(); 