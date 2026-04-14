const express = require('express');
const router = express.Router();
const { login, getMe, updatePassword, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/password', protect, updatePassword);
router.post('/logout', protect, logout);

module.exports = router;
