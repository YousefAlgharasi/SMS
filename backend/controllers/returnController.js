const asyncHandler = require('express-async-handler');
const Return = require('../models/Return');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryMovement = require('../models/InventoryMovement');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getReturns = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const query = {};
  if (status) query.status = status;
  const total = await Return.countDocuments(query);
  const returns = await Return.find(query).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit))
    .populate('originalSale', 'receiptNumber total').populate('customer', 'firstName lastName').populate('processedBy', 'name');
  paginatedResponse(res, returns, total, page, limit);
});

const createReturn = asyncHandler(async (req, res) => {
  const { receiptNumber, items, refundMethod, reason } = req.body;
  const sale = await Sale.findOne({ receiptNumber });
  if (!sale) { res.status(404); throw new Error('Receipt not found'); }

  const daysDiff = (new Date() - sale.createdAt) / (1000 * 60 * 60 * 24);
  if (daysDiff > 5) { res.status(400); throw new Error('Return window of 5 days has expired'); }
  if (sale.status === 'refunded') { res.status(400); throw new Error('Sale already fully refunded'); }
  if (refundMethod === 'wallet_balance' && !sale.customer) {
    res.status(400); throw new Error('Cannot refund to wallet: no customer linked to this sale');
  }

  let totalRefund = 0;
  const returnItems = [];

  for (const item of items) {
    const saleItem = sale.items.find(si => si.product.toString() === item.productId);
    if (!saleItem) { res.status(400); throw new Error(`Item not found in original sale: ${item.productId}`); }
    if (item.quantity > saleItem.quantity) { res.status(400); throw new Error('Return quantity exceeds purchase quantity'); }

    const refundAmount = (saleItem.subtotal / saleItem.quantity) * item.quantity;
    totalRefund += refundAmount;
    returnItems.push({ product: item.productId, productName: saleItem.productName, quantity: item.quantity, unitPrice: saleItem.unitPrice, refundAmount, reason: item.reason });

    const product = await Product.findById(item.productId);
    if (product) {
      const stockBefore = product.stock;
      product.stock += item.quantity;
      await product.save();
      await InventoryMovement.create({ product: product._id, type: 'return', quantity: item.quantity, stockBefore, stockAfter: product.stock, reference: receiptNumber, performedBy: req.user._id });
    }
  }

  sale.status = items.length >= sale.items.length ? 'refunded' : 'partially_refunded';
  await sale.save();

  if (sale.customer) {
    const customer = await Customer.findById(sale.customer);
    if (customer) {
      customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - Math.floor(totalRefund / 10));
      customer.totalSpent    = Math.max(0, customer.totalSpent - totalRefund);
      // Add to wallet if that refund method was chosen
      if (refundMethod === 'wallet_balance') {
        customer.walletBalance = (customer.walletBalance || 0) + totalRefund;
      }
      await customer.save();
    }
  }

  const returnDoc = await Return.create({ originalSale: sale._id, receiptNumber, customer: sale.customer, items: returnItems, totalRefund, refundMethod, reason, processedBy: req.user._id });
  successResponse(res, returnDoc, 'Return processed successfully', 201);
});

const getReturn = asyncHandler(async (req, res) => {
  const ret = await Return.findById(req.params.id).populate('originalSale').populate('customer', 'firstName lastName').populate('processedBy', 'name');
  if (!ret) { res.status(404); throw new Error('Return not found'); }
  successResponse(res, ret);
});

module.exports = { getReturns, createReturn, getReturn };
