const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { successResponse } = require('../utils/apiResponse');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', productCount: { $sum: 1 }, totalStock: { $sum: '$stock' }, totalValue: { $sum: { $multiply: ['$stock','$unitPrice'] } }, avgPrice: { $avg: '$unitPrice' }, lowStockCount: { $sum: { $cond: [{ $lte: ['$stock','$reorderLevel'] }, 1, 0] } } } },
    { $sort: { _id: 1 } }
  ]);
  successResponse(res, categories);
});

const getCategoryProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ category: { $regex: req.params.name, $options: 'i' }, isActive: true }).populate('supplier','name').sort({ name: 1 });
  successResponse(res, products);
});

const renameCategory = asyncHandler(async (req, res) => {
  const { newName } = req.body;
  if (!newName?.trim()) { res.status(400); throw new Error('New name is required'); }
  const result = await Product.updateMany({ category: { $regex: `^${req.params.name}$`, $options: 'i' } }, { $set: { category: newName.trim() } });
  successResponse(res, { updated: result.modifiedCount }, `Renamed to "${newName}"`);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const result = await Product.updateMany({ category: { $regex: `^${req.params.name}$`, $options: 'i' } }, { $set: { isActive: false } });
  successResponse(res, { deactivated: result.modifiedCount }, 'Category and products deactivated');
});

// NEW: Create a category by setting it on an existing or new product — 
// but since categories are just product.category strings, "creating" just validates the name
// We store it as a special placeholder product? No — simpler: category exists when products use it.
// We expose a createCategory that just returns success so frontend can use it for a future product.
// Actually we'll just let frontend know creation happens when a product with that category is made.
// For the "Add Category" button on CategoriesPage, we don't need a backend route — 
// the category auto-appears when a product with that category is created.
// So the frontend will just redirect to Add Product with the category pre-filled.

module.exports = { getCategories, getCategoryProducts, renameCategory, deleteCategory };
