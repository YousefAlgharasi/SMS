const express = require('express');
const router = express.Router();
const { getReturns, createReturn, getReturn } = require('../controllers/returnController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.route('/').get(getReturns).post(createReturn);
router.route('/:id').get(getReturn);

module.exports = router;
