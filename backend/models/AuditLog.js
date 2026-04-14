const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  action: { type: String, required: true },
  module: {
    type: String,
    enum: ['auth', 'sales', 'inventory', 'customers', 'products', 'suppliers', 'purchase_orders', 'returns', 'users', 'reports'],
    required: true
  },
  resourceId: String,
  resourceType: String,
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: String,
  status: { type: String, enum: ['success', 'failure'], default: 'success' }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
