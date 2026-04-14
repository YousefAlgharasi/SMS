const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config();

const connectDB = require('../config/db');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

const seed = async () => {
  await connectDB();
  await User.deleteMany(); await Customer.deleteMany(); await Product.deleteMany(); await Supplier.deleteMany();

  const admin = await User.create({ name: 'Admin User', email: 'admin@sms.com', password: 'Admin@123', role: 'admin', phone: '+1-555-000-0001' });
  await User.create({ name: 'Sarah Cashier', email: 'cashier@sms.com', password: 'Pass@123', role: 'cashier', phone: '+1-555-000-0002' });
  await User.create({ name: 'Mike Inventory', email: 'inventory@sms.com', password: 'Pass@123', role: 'inventory_manager', phone: '+1-555-000-0003' });
  await User.create({ name: 'Lisa Supervisor', email: 'supervisor@sms.com', password: 'Pass@123', role: 'supervisor', phone: '+1-555-000-0004' });

  const supplier = await Supplier.create({ name: 'Global Tech Supplies', contactPerson: 'John Smith', email: 'john@globaltech.com', phone: '+1-555-100-0001', paymentTerms: 'Net 30', createdBy: admin._id });

  await Product.create([
    { name: 'Laptop Pro 15"', category: 'Electronics', unitPrice: 1299.99, costPrice: 950, stock: 45, reorderLevel: 10, taxRate: 8, supplier: supplier._id, createdBy: admin._id },
    { name: 'Wireless Mouse', category: 'Accessories', unitPrice: 29.99, costPrice: 15, stock: 8, reorderLevel: 15, taxRate: 8, supplier: supplier._id, createdBy: admin._id },
    { name: 'USB-C Hub', category: 'Accessories', unitPrice: 49.99, costPrice: 25, stock: 60, reorderLevel: 20, taxRate: 8, supplier: supplier._id, createdBy: admin._id },
    { name: 'Monitor 27" 4K', category: 'Electronics', unitPrice: 599.99, costPrice: 420, stock: 22, reorderLevel: 5, taxRate: 8, supplier: supplier._id, createdBy: admin._id },
    { name: 'Mechanical Keyboard', category: 'Accessories', unitPrice: 149.99, costPrice: 80, stock: 3, reorderLevel: 10, taxRate: 8, supplier: supplier._id, createdBy: admin._id }
  ]);

  await Customer.create([
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', phone: '+1-555-200-0001', loyaltyPoints: 250, totalPurchases: 8, totalSpent: 2450, createdBy: admin._id },
    { firstName: 'Bob', lastName: 'Williams', email: 'bob@example.com', phone: '+1-555-200-0002', loyaltyPoints: 120, totalPurchases: 4, totalSpent: 1200, createdBy: admin._id },
    { firstName: 'Carol', lastName: 'Davis', email: 'carol@example.com', phone: '+1-555-200-0003', loyaltyPoints: 540, totalPurchases: 15, totalSpent: 5400, createdBy: admin._id }
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('  Admin: admin@sms.com / Admin@123');
  console.log('  Cashier: cashier@sms.com / Pass@123');
  console.log('  Inventory: inventory@sms.com / Pass@123');
  console.log('  Supervisor: supervisor@sms.com / Pass@123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
