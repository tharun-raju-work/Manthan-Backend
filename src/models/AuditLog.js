const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_RESET'],
  },
  resource: {
    type: String,
    required: true,
    enum: ['USER', 'POST', 'COMMENT', 'GROUP'],
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    ip: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
}, {
  timestamps: true,
});

// Index for efficient querying
auditLogSchema.index({ 'metadata.timestamp': -1 });
auditLogSchema.index({ userId: 1, 'metadata.timestamp': -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
