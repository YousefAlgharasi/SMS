const asyncHandler = require('express-async-handler');
const Supplier = require('../models/Supplier');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const getSuppliers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, isActive = 'true' } = req.query;
  const query = { isActive: isActive === 'true' };
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { supplierId: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  const total = await Supplier.countDocuments(query);
  const suppliers = await Supplier.find(query).sort({ name: 1 }).skip((page - 1) * limit).limit(Number(limit));
  paginatedResponse(res, suppliers, total, page, limit);
});

const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
  successResponse(res, supplier);
});

const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create({ ...req.body, createdBy: req.user._id });
  successResponse(res, supplier, 'Supplier created', 201);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
  successResponse(res, supplier, 'Supplier updated');
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) { res.status(404); throw new Error('Supplier not found'); }
  supplier.isActive = false;
  await supplier.save();
  successResponse(res, {}, 'Supplier deactivated');
});

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
