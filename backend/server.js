const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const salesRoutes = require('./routes/salesRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const returnRoutes = require('./routes/returnRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

// Connect DB
connectDB();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/categories', categoryRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Cron job: check low stock every hour
cron.schedule('0 * * * *', async () => {
  const Product = require('./models/Product');
  try {
    const lowStock = await Product.find({ $expr: { $lte: ['$stock', '$reorderLevel'] }, isActive: true });
    if (lowStock.length > 0) {
      console.log(`[CRON] Low stock alert: ${lowStock.length} products need reordering`);
    }
  } catch (err) {
    console.error('[CRON] Low stock check failed:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SMS Server running on port ${PORT} [${process.env.NODE_ENV}]`));
