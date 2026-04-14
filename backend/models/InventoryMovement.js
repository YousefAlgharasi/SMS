const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: {
    type: String,
    enum: ['sale', 'purchase', 'return', 'adjustment', 'damage', 'initial'],
    required: true
  },
  quantity: { type: Number, required: true },
  stockBefore: { type: Number, required: true },
  stockAfter: { type: Number, required: true },
  reference: { type: String },
  referenceType: { type: String },
  notes: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
