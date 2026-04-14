const express = require('express');
const router = express.Router();
const { getSalesReport, getInventoryReport, getCustomerReport } = require('../controllers/reportController');
const { protect, supervisorAndAbove } = require('../middleware/authMiddleware');

router.use(protect, supervisorAndAbove);
router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/customers', getCustomerReport);

module.exports = router;
