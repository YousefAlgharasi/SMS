const asyncHandler = require('express-async-handler');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Return = require('../models/Return');
const { successResponse } = require('../utils/apiResponse');

const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23, 59, 59, 999);

  const [todaySales, yesterdaySales, monthSales, totalCustomers, lowStockCount, recentSales, salesTrend] = await Promise.all([
    Sale.aggregate([{ $match: { createdAt: { $gte: today, $lte: todayEnd }, status: { $ne: 'refunded' } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: yesterday, $lte: yesterdayEnd }, status: { $ne: 'refunded' } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: monthStart }, status: { $ne: 'refunded' } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Customer.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$reorderLevel'] } }),
    Sale.find({ status: { $ne: 'refunded' } }).sort({ createdAt: -1 }).limit(5).populate('customer', 'firstName lastName').populate('processedBy', 'name'),
    Sale.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: { $ne: 'refunded' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);

  const todayTotal = todaySales[0]?.total || 0;
  const yesterdayTotal = yesterdaySales[0]?.total || 0;
  const growthRate = yesterdayTotal ? (((todayTotal - yesterdayTotal) / yesterdayTotal) * 100).toFixed(1) : 0;

  successResponse(res, {
    today: { revenue: todayTotal, transactions: todaySales[0]?.count || 0, growthRate: Number(growthRate) },
    month: { revenue: monthSales[0]?.total || 0, transactions: monthSales[0]?.count || 0 },
    totalCustomers, lowStockCount, recentSales, salesTrend
  });
});

module.exports = { getDashboardStats };
