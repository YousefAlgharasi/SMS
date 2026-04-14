const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { street: String, city: String, state: String, country: String, zip: String },
  walletBalance: { type: Number, default: 0, min: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

customerSchema.pre('save', async function (next) {
  if (!this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CUST-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

customerSchema.virtual('fullName').get(function () { return `${this.firstName} ${this.lastName}`; });

module.exports = mongoose.model('Customer', customerSchema);
