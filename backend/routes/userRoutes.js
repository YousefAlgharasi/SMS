const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.route('/').get(adminOnly, getUsers).post(adminOnly, createUser);
router.route('/:id').get(adminOnly, getUser).put(adminOnly, updateUser).delete(adminOnly, deleteUser);

module.exports = router;
