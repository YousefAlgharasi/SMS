const express = require('express');
const router = express.Router();
const { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { protect, inventoryAccess, supervisorAndAbove } = require('../middleware/authMiddleware');

router.use(protect);
router.route('/').get(getSuppliers).post(inventoryAccess, createSupplier);
router.route('/:id').get(getSupplier).put(inventoryAccess, updateSupplier).delete(supervisorAndAbove, deleteSupplier);

module.exports = router;
