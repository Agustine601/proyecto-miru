const mongoose = require('mongoose');

const workOrderItemSchema = new mongoose.Schema({
  productoId: { type: mongoose.Schema.Types.ObjectId, required: true },
  producto: { type: String, required: true },
  categoria: { type: String, enum: ['reagents', 'consumables'], required: true },
  lote: { type: String, default: '' },
  cantidad: { type: Number, required: true, min: 0.01 },
  unidad: { type: String, default: '' },
  despachado: { type: Boolean, default: false },
  fechaDespacho: { type: Date, default: null },
  responsableDespacho: { type: String, default: '' },
});

const workOrderSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  solicitante: { type: String, default: '' },
  destino: { type: String, default: '' },
  observaciones: { type: String, default: '' },
  estado: {
    type: String,
    enum: ['pendiente', 'parcial', 'completo', 'cancelado'],
    default: 'pendiente',
  },
  items: { type: [workOrderItemSchema], default: [] },
  fechaCreacion: { type: Date, default: Date.now },
  fechaCompletado: { type: Date, default: null },
  creadoPor: { type: String, default: 'Usuario' },
});

module.exports = mongoose.model('WorkOrder', workOrderSchema);
