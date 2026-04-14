const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: {
    street: String, city: String, state: String, country: String, zip: String
  },
  paymentTerms: { type: String, default: 'Net 30' },
  taxId: { type: String },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

supplierSchema.pre('save', async function (next) {
  if (!this.supplierId) {
    const count = await mongoose.model('Supplier').countDocuments();
    this.supplierId = `SUP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);
