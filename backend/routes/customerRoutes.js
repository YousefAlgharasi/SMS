const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getCustomerHistory, topUpWallet, deductWallet } = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');
const { audit } = require('../middleware/auditMiddleware');

router.use(protect);
router.route('/').get(getCustomers).post(audit('CREATE_CUSTOMER', 'customers'), createCustomer);
router.route('/:id').get(getCustomer).put(audit('UPDATE_CUSTOMER', 'customers'), updateCustomer);
router.get('/:id/history', getCustomerHistory);
router.post('/:id/wallet',        audit('WALLET_TOPUP', 'customers'), topUpWallet);
router.post('/:id/wallet/deduct', deductWallet);
module.exports = router;
