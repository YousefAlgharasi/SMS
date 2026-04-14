const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getInventoryOverview = asyncHandler(async (req, res) => {
  const [total, lowStock, outOfStock, totalValue] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$reorderLevel'] } }),
    Product.countDocuments({ isActive: true, stock: 0 }),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$costPrice'] } }, retail: { $sum: { $multiply: ['$stock', '$unitPrice'] } } } }])
  ]);
  successResponse(res, { total, lowStock, outOfStock, totalCostValue: totalValue[0]?.value || 0, totalRetailValue: totalValue[0]?.retail || 0 });
});

const getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, $expr: { $lte: ['$stock', '$reorderLevel'] } }).populate('supplier', 'name email phone').sort({ stock: 1 });
  successResponse(res, products);
});

const getMovements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, product, type, startDate, endDate } = req.query;
  const query = {};
  if (product) query.product = product;
  if (type) query.type = type;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  const total = await InventoryMovement.countDocuments(query);
  const movements = await InventoryMovement.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).populate('product', 'name productId').populate('performedBy', 'name');
  paginatedResponse(res, movements, total, page, limit);
});

module.exports = { getInventoryOverview, getLowStockProducts, getMovements };
