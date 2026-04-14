const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  category: { type: String, required: true, trim: true },
  barcode: { type: String, unique: true, sparse: true },
  sku: { type: String, unique: true, sparse: true },
  unitPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 10 },
  reorderQuantity: { type: Number, default: 50 },
  unit: { type: String, default: 'piece' },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  images: [String],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

productSchema.pre('save', async function (next) {
  if (!this.productId) {
    const count = await mongoose.model('Product').countDocuments();
    this.productId = `PROD-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

productSchema.virtual('isLowStock').get(function () {
  return this.stock <= this.reorderLevel;
});

productSchema.virtual('profitMargin').get(function () {
  if (!this.costPrice || this.costPrice === 0) return 0;
  return (((this.unitPrice - this.costPrice) / this.unitPrice) * 100).toFixed(2);
});

module.exports = mongoose.model('Product', productSchema);
