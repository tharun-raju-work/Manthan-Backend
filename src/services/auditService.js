const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

class AuditService {
  async log(data) {
    try {
      const {
        userId,
        action,
        resource,
        resourceId,
        oldValue,
        newValue,
        ip,
        userAgent,
      } = data;

      const auditLog = new AuditLog({
        userId,
        action,
        resource,
        resourceId,
        oldValue,
        newValue,
        metadata: {
          ip,
          userAgent,
          timestamp: new Date(),
        },
      });

      await auditLog.save();
      logger.info(`Audit log created for ${action} on ${resource}`);
    } catch (error) {
      logger.error('Audit logging failed:', error);
    }
  }

  async getAuditLogs(filters) {
    return AuditLog.find(filters)
      .sort({ 'metadata.timestamp': -1 })
      .populate('userId', 'username email');
  }
}

module.exports = new AuditService();
