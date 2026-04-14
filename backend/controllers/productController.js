const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, category, isActive = 'true', lowStock } = req.query;
  const query = { isActive: isActive === 'true' };
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { productId: { $regex: search, $options: 'i' } }, { barcode: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }];
  if (category) query.category = { $regex: category, $options: 'i' };
  if (lowStock === 'true') query.$expr = { $lte: ['$stock', '$reorderLevel'] };
  const total = await Product.countDocuments(query);
  const products = await Product.find(query).populate('supplier', 'name supplierId').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  paginatedResponse(res, products, total, page, limit);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('supplier', 'name supplierId email phone');
  if (!product) { res.status(404); throw new Error('Product not found'); }
  successResponse(res, product);
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create({ ...req.body, createdBy: req.user._id });
  await InventoryMovement.create({
    product: product._id, type: 'initial', quantity: product.stock,
    stockBefore: 0, stockAfter: product.stock, notes: 'Initial stock', performedBy: req.user._id
  });
  successResponse(res, product, 'Product created', 201);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) { res.status(404); throw new Error('Product not found'); }
  successResponse(res, product, 'Product updated');
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }
  product.isActive = false;
  await product.save();
  successResponse(res, {}, 'Product deactivated');
});

const adjustStock = asyncHandler(async (req, res) => {
  const { quantity, type = 'adjustment', notes } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) { res.status(404); throw new Error('Product not found'); }
  const stockBefore = product.stock;
  product.stock = Math.max(0, product.stock + Number(quantity));
  await product.save();
  await InventoryMovement.create({
    product: product._id, type, quantity: Number(quantity),
    stockBefore, stockAfter: product.stock, notes, performedBy: req.user._id
  });
  successResponse(res, product, 'Stock adjusted');
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category', { isActive: true });
  successResponse(res, categories);
});

const getByBarcode = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ barcode: req.params.barcode, isActive: true });
  if (!product) { res.status(404); throw new Error('Product not found'); }
  successResponse(res, product);
});

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, adjustStock, getCategories, getByBarcode };
