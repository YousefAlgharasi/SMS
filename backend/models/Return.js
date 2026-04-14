const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String, quantity: { type: Number, required: true, min: 1 },
  unitPrice: Number, refundAmount: Number, reason: String
}, { _id: false });

const returnSchema = new mongoose.Schema({
  returnNumber: { type: String, unique: true },
  originalSale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  receiptNumber: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: [returnItemSchema],
  totalRefund: { type: Number, required: true },
  refundMethod: {
    type: String,
    enum: ['original_payment', 'store_credit', 'cash', 'wallet_balance'],
    default: 'store_credit'
  },
  voucherCode: { type: String, unique: true, sparse: true },
  voucherUsed: { type: Boolean, default: false },
  status: { type: String, enum: ['pending','approved','rejected','completed'], default: 'approved' },
  reason: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

returnSchema.pre('save', async function (next) {
  if (!this.returnNumber) {
    const count = await mongoose.model('Return').countDocuments();
    this.returnNumber = `RET-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.refundMethod === 'store_credit' && !this.voucherCode) {
    this.voucherCode = `VC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Return', returnSchema);
