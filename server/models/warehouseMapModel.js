const mongoose = require('mongoose');

const warehouseMapSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'main' },
  occupied: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('WarehouseMap', warehouseMapSchema);
