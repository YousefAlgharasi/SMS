const asyncHandler = require('express-async-handler');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getPurchaseOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, supplier } = req.query;
  const query = {};
  if (status) query.status = status;
  if (supplier) query.supplier = supplier;
  const total = await PurchaseOrder.countDocuments(query);
  const orders = await PurchaseOrder.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).populate('supplier', 'name supplierId').populate('createdBy', 'name');
  paginatedResponse(res, orders, total, page, limit);
});

const getPurchaseOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findById(req.params.id).populate('supplier').populate('items.product', 'name productId');
  if (!order) { res.status(404); throw new Error('Purchase order not found'); }
  successResponse(res, order);
});

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { supplier, items, expectedDelivery, notes } = req.body;
  const processedItems = [];
  let totalAmount = 0;
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error(`Product not found: ${item.product}`);
    const subtotal = item.quantity * item.unitCost;
    totalAmount += subtotal;
    processedItems.push({ product: item.product, productName: product.name, quantity: item.quantity, unitCost: item.unitCost, subtotal });
  }
  const po = await PurchaseOrder.create({ supplier, items: processedItems, totalAmount, expectedDelivery, notes, createdBy: req.user._id });
  successResponse(res, po, 'Purchase order created', 201);
});

const receiveOrder = asyncHandler(async (req, res) => {
  const { receivedItems } = req.body;
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error('PO not found'); }
  if (order.status === 'received' || order.status === 'cancelled') { res.status(400); throw new Error(`Cannot receive order with status: ${order.status}`); }

  let allReceived = true;
  for (const received of receivedItems) {
    const item = order.items.find(i => i.product.toString() === received.productId);
    if (!item) continue;
    item.receivedQuantity = (item.receivedQuantity || 0) + received.quantity;
    if (item.receivedQuantity < item.quantity) allReceived = false;

    const product = await Product.findById(received.productId);
    if (product) {
      const stockBefore = product.stock;
      product.stock += received.quantity;
      await product.save();
      await InventoryMovement.create({ product: product._id, type: 'purchase', quantity: received.quantity, stockBefore, stockAfter: product.stock, reference: order.poNumber, referenceType: 'PurchaseOrder', performedBy: req.user._id });
    }
  }
  order.status = allReceived ? 'received' : 'partially_received';
  if (allReceived) order.receivedDate = new Date();
  await order.save();
  successResponse(res, order, 'Stock received and updated');
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!order) { res.status(404); throw new Error('PO not found'); }
  successResponse(res, order, 'Status updated');
});

module.exports = { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, receiveOrder, updateOrderStatus };
