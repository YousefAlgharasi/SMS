const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const generateToken = require('../utils/generateToken');
const { successResponse } = require('../utils/apiResponse');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400); throw new Error('Email and password required'); }

  const user = await User.findOne({ email });
  if (!user || !user.isActive) { res.status(401); throw new Error('Invalid credentials'); }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) { res.status(401); throw new Error('Invalid credentials'); }

  user.lastLogin = new Date();
  await user.save();

  await AuditLog.create({ user: user._id, userName: user.name, action: 'LOGIN', module: 'auth', ipAddress: req.ip, status: 'success' });

  successResponse(res, { user, token: generateToken(user._id) }, 'Login successful');
});

const getMe = asyncHandler(async (req, res) => {
  successResponse(res, req.user, 'User profile retrieved');
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!(await user.matchPassword(currentPassword))) { res.status(401); throw new Error('Current password incorrect'); }
  user.password = newPassword;
  await user.save();
  successResponse(res, {}, 'Password updated successfully');
});

const logout = asyncHandler(async (req, res) => {
  await AuditLog.create({ user: req.user._id, userName: req.user.name, action: 'LOGOUT', module: 'auth', ipAddress: req.ip });
  successResponse(res, {}, 'Logged out successfully');
});

module.exports = { login, getMe, updatePassword, logout };
