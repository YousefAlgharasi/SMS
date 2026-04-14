const asyncHandler = require('express-async-handler');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Return = require('../models/Return');
const { successResponse } = require('../utils/apiResponse');

const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  const groupFormat = groupBy === 'month' ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } } : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

  const [salesData, paymentBreakdown, topProducts] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'refunded' } } },
      { $group: { _id: groupFormat, revenue: { $sum: '$total' }, count: { $sum: 1 }, tax: { $sum: '$taxAmount' }, discounts: { $sum: '$discountAmount' } } },
      { $sort: { _id: 1 } }
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'refunded' } } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'refunded' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.productName' }, revenue: { $sum: '$items.subtotal' }, quantity: { $sum: '$items.quantity' } } },
      { $sort: { revenue: -1 } }, { $limit: 10 }
    ])
  ]);

  const totalRevenue = salesData.reduce((a, d) => a + d.revenue, 0);
  const totalCount = salesData.reduce((a, d) => a + d.count, 0);

  successResponse(res, { salesData, paymentBreakdown, topProducts, summary: { totalRevenue, totalCount, avgOrderValue: totalCount ? totalRevenue / totalCount : 0 } });
});

const getInventoryReport = asyncHandler(async (req, res) => {
  const [byCategory, lowStock, valuation] = await Promise.all([
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$stock' }, value: { $sum: { $multiply: ['$stock', '$costPrice'] } } } },
      { $sort: { value: -1 } }
    ]),
    Product.find({ isActive: true, $expr: { $lte: ['$stock', '$reorderLevel'] } }).select('name productId stock reorderLevel category').sort({ stock: 1 }).limit(20),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalCost: { $sum: { $multiply: ['$stock', '$costPrice'] } }, totalRetail: { $sum: { $multiply: ['$stock', '$unitPrice'] } }, totalItems: { $sum: '$stock' } } }
    ])
  ]);
  successResponse(res, { byCategory, lowStock, valuation: valuation[0] || {} });
});

const getCustomerReport = asyncHandler(async (req, res) => {
  const [topCustomers, newCustomers] = await Promise.all([
    Customer.find({ isActive: true }).sort({ totalSpent: -1 }).limit(10).select('firstName lastName customerId totalSpent totalPurchases loyaltyPoints'),
    Customer.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } }, { $limit: 12 }
    ])
  ]);
  successResponse(res, { topCustomers, newCustomers });
});

module.exports = { getSalesReport, getInventoryReport, getCustomerReport };
