const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || !req.user.isActive) {
        res.status(401);
        throw new Error('Not authorized - user inactive');
      }
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized - token failed');
    }
  }
  if (!token) {
    res.status(401);
    throw new Error('Not authorized - no token');
  }
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Role '${req.user.role}' is not authorized for this action`);
  }
  next();
};

const adminOnly = authorize('admin');
const supervisorAndAbove = authorize('admin', 'supervisor');
const inventoryAccess = authorize('admin', 'supervisor', 'inventory_manager');

module.exports = { protect, authorize, adminOnly, supervisorAndAbove, inventoryAccess };
