const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search, isActive } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  const total = await User.countDocuments(query);
  const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  paginatedResponse(res, users, total, page, limit);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  successResponse(res, user);
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const exists = await User.findOne({ email });
  if (exists) { res.status(400); throw new Error('Email already registered'); }
  const user = await User.create({ name, email, password, role, phone });
  successResponse(res, user, 'User created successfully', 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  const { name, email, role, phone, isActive } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();
  successResponse(res, user, 'User updated successfully');
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  if (user._id.toString() === req.user._id.toString()) { res.status(400); throw new Error('Cannot delete your own account'); }
  user.isActive = false;
  await user.save();
  successResponse(res, {}, 'User deactivated successfully');
});

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };
