const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, module, user, startDate, endDate } = req.query;
  const query = {};
  if (module) query.module = module;
  if (user) query.user = user;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).populate('user', 'name email role');
  paginatedResponse(res, logs, total, page, limit);
});

module.exports = { getAuditLogs };
