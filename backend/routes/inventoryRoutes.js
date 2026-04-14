const express = require('express');
const router = express.Router();
const { getInventoryOverview, getLowStockProducts, getMovements } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/overview', getInventoryOverview);
router.get('/low-stock', getLowStockProducts);
router.get('/movements', getMovements);

module.exports = router;
