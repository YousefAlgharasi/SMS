const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productId: String, productName: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  subtotal: { type: Number, required: true }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  receiptNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerSnapshot: { name: String, email: String, phone: String },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'digital_wallet', 'wallet_balance', 'custom'],
    required: true
  },
  paymentDetails: {
    cashReceived: Number, changeReturned: Number,
    cardLast4: String, walletProvider: String,
    transactionRef: String,
    customMethodName: String, customPayerName: String, customPayerPhone: String, customNote: String,
    walletBalanceBefore: Number, walletBalanceAfter: Number,
  },
  status: { type: String, enum: ['pending','completed','refunded','partially_refunded'], default: 'completed' },
  notes: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loyaltyPointsEarned: { type: Number, default: 0 }
}, { timestamps: true });

saleSchema.pre('save', async function (next) {
  if (!this.receiptNumber) {
    const count = await mongoose.model('Sale').countDocuments();
    const date = new Date();
    const prefix = `RCP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    this.receiptNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
