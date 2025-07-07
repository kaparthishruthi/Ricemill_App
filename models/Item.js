const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  dateAdded: { type: Date, default: Date.now },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.model('Item', itemSchema);
