const asyncHandler = require('express-async-handler');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, isActive = 'true' } = req.query;
  const query = { isActive: isActive === 'true' };
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { customerId: { $regex: search, $options: 'i' } }
    ];
  }
  const total = await Customer.countDocuments(query);
  const customers = await Customer.find(query).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
  paginatedResponse(res, customers, total, page, limit);
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) { res.status(404); throw new Error('Customer not found'); }
  const recentSales = await Sale.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(10).select('receiptNumber total status createdAt');
  successResponse(res, { ...customer.toObject(), recentSales });
});

const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create({ ...req.body, createdBy: req.user._id });
  successResponse(res, customer, 'Customer created successfully', 201);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!customer) { res.status(404); throw new Error('Customer not found'); }
  successResponse(res, customer, 'Customer updated successfully');
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) { res.status(404); throw new Error('Customer not found'); }
  customer.isActive = false;
  await customer.save();
  successResponse(res, {}, 'Customer deactivated successfully');
});

const getCustomerHistory = asyncHandler(async (req, res) => {
  const sales = await Sale.find({ customer: req.params.id }).sort({ createdAt: -1 }).populate('processedBy', 'name');
  successResponse(res, sales);
});

// POST /api/customers/:id/wallet  { amount, note }
const topUpWallet = asyncHandler(async (req, res) => {
  const { amount, note } = req.body;
  const value = parseFloat(amount);
  if (!value || value <= 0) { res.status(400); throw new Error('Amount must be greater than 0'); }
  const customer = await Customer.findById(req.params.id);
  if (!customer) { res.status(404); throw new Error('Customer not found'); }
  customer.walletBalance = (customer.walletBalance || 0) + value;
  await customer.save();
  successResponse(res, customer, `Wallet topped up by $${value.toFixed(2)}`);
});

// POST /api/customers/:id/wallet/deduct  { amount }
const deductWallet = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const value = parseFloat(amount);
  if (!value || value <= 0) { res.status(400); throw new Error('Invalid amount'); }
  const customer = await Customer.findById(req.params.id);
  if (!customer) { res.status(404); throw new Error('Customer not found'); }
  if ((customer.walletBalance || 0) < value) {
    res.status(400); throw new Error(`Insufficient wallet balance. Available: $${(customer.walletBalance||0).toFixed(2)}`);
  }
  customer.walletBalance -= value;
  await customer.save();
  successResponse(res, customer, 'Wallet debited');
});

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getCustomerHistory, topUpWallet, deductWallet };
