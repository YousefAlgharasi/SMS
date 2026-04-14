const asyncHandler = require('express-async-handler');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryMovement = require('../models/InventoryMovement');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getSales = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, startDate, endDate, paymentMethod } = req.query;
  const query = {};
  if (status) query.status = status;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (search) query.$or = [
    { receiptNumber: { $regex: search, $options: 'i' } },
    { 'customerSnapshot.name': { $regex: search, $options: 'i' } }
  ];
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); query.createdAt.$lte = end; }
  }
  const total = await Sale.countDocuments(query);
  const sales = await Sale.find(query).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit))
    .populate('customer', 'firstName lastName customerId walletBalance').populate('processedBy', 'name');
  paginatedResponse(res, sales, total, page, limit);
});

const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customer').populate('processedBy', 'name').populate('items.product', 'name productId');
  if (!sale) { res.status(404); throw new Error('Sale not found'); }
  successResponse(res, sale);
});

const createSale = asyncHandler(async (req, res) => {
  const { items, customer: customerId, paymentMethod, paymentDetails, notes, discountAmount = 0 } = req.body;
  if (!items || items.length === 0) { res.status(400); throw new Error('No items in sale'); }

  // ── Validate all stock upfront ─────────────────────────────────────────────
  const productDocs = [];
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) { res.status(400); throw new Error(`Product not found: ${item.product}`); }
    if (product.stock < item.quantity) { res.status(400); throw new Error(`Insufficient stock for: ${product.name} (have ${product.stock}, need ${item.quantity})`); }
    productDocs.push({ product, item });
  }

  // ── Validate wallet balance upfront ───────────────────────────────────────
  let customerDoc = null;
  let walletBalanceBefore = 0;
  if (paymentMethod === 'wallet_balance') {
    if (!customerId) { res.status(400); throw new Error('A customer must be selected to pay with wallet balance'); }
    customerDoc = await Customer.findById(customerId);
    if (!customerDoc) { res.status(404); throw new Error('Customer not found'); }
    // Approximate total for upfront check
    let approxSub = 0, approxTax = 0;
    for (const { product, item } of productDocs) {
      const d = item.discount || product.discount || 0;
      const t = product.taxRate || 0;
      const base = product.unitPrice * item.quantity;
      approxTax += ((base * (1 - d/100)) * t) / 100;
      approxSub += base;
    }
    const approxTotal = approxSub + approxTax - Number(discountAmount);
    walletBalanceBefore = customerDoc.walletBalance || 0;
    if (walletBalanceBefore < approxTotal) {
      res.status(400);
      throw new Error(`Insufficient wallet balance. Customer has $${walletBalanceBefore.toFixed(2)}, sale total is ~$${approxTotal.toFixed(2)}`);
    }
  }

  // ── Process items ──────────────────────────────────────────────────────────
  let subtotal = 0, taxAmount = 0;
  const processedItems = [];
  const stockChanges = [];

  try {
    for (const { product, item } of productDocs) {
      const itemDiscount = item.discount || product.discount || 0;
      const itemTaxRate  = product.taxRate || 0;
      const basePrice    = product.unitPrice * item.quantity;
      const discountVal  = (basePrice * itemDiscount) / 100;
      const taxVal       = ((basePrice - discountVal) * itemTaxRate) / 100;
      subtotal  += basePrice;
      taxAmount += taxVal;

      const stockBefore = product.stock;
      product.stock -= item.quantity;
      await product.save();
      stockChanges.push({ product, stockBefore });
      await InventoryMovement.create({ product: product._id, type: 'sale', quantity: -item.quantity, stockBefore, stockAfter: product.stock, performedBy: req.user._id });
      processedItems.push({ product: product._id, productId: product.productId, productName: product.name, quantity: item.quantity, unitPrice: product.unitPrice, discount: itemDiscount, taxRate: itemTaxRate, subtotal: basePrice - discountVal + taxVal });
    }

    const total = subtotal + taxAmount - Number(discountAmount);
    const loyaltyPointsEarned = Math.floor(total / 10);

    // ── Customer: snapshot, loyalty, wallet deduction ─────────────────────
    let customerSnapshot = {};
    const finalDetails = { ...(paymentDetails || {}) };

    if (customerId) {
      if (!customerDoc) customerDoc = await Customer.findById(customerId);
      if (customerDoc) {
        customerSnapshot = { name: `${customerDoc.firstName} ${customerDoc.lastName}`, email: customerDoc.email, phone: customerDoc.phone };
        customerDoc.totalPurchases += 1;
        customerDoc.totalSpent     += total;
        customerDoc.loyaltyPoints  += loyaltyPointsEarned;
        if (paymentMethod === 'wallet_balance') {
          finalDetails.walletBalanceBefore = walletBalanceBefore;
          customerDoc.walletBalance        = walletBalanceBefore - total;
          finalDetails.walletBalanceAfter  = customerDoc.walletBalance;
        }
        await customerDoc.save();
      }
    }

    const sale = await Sale.create({ customer: customerId || undefined, customerSnapshot, items: processedItems, subtotal, taxAmount, discountAmount: Number(discountAmount), total, paymentMethod, paymentDetails: finalDetails, notes, processedBy: req.user._id, loyaltyPointsEarned });
    const populated = await Sale.findById(sale._id).populate('customer', 'firstName lastName walletBalance').populate('processedBy', 'name');
    successResponse(res, populated, 'Sale completed successfully', 201);

  } catch (err) {
    for (const { product, stockBefore } of stockChanges) {
      try { product.stock = stockBefore; await product.save(); } catch (e) { console.error('[ROLLBACK]', e.message); }
    }
    res.status(400); throw err;
  }
});

const getTodaySales = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(); end.setHours(23,59,59,999);
  const sales = await Sale.find({ createdAt: { $gte: start, $lte: end }, status: { $ne: 'refunded' } });
  successResponse(res, { count: sales.length, total: sales.reduce((a,s) => a+s.total,0), tax: sales.reduce((a,s) => a+s.taxAmount,0) });
});

module.exports = { getSales, getSale, createSale, getTodaySales };
