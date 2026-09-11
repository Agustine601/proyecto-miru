const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  producto: {
    type: String,
    required: true,
  },

  categoria: {
    type: String,
    required: true,
    enum: ['reagents', 'consumables', 'equipment'],
  },

  lote: {
    type: String,
    default: '',
  },

  tipo: {
    type: String,
    required: true,
    enum: ['entrada', 'salida', 'consumo'],
  },

  cantidad: {
    type: Number,
    required: true,
    min: 0,
  },

  unidad: {
    type: String,
    default: '',
  },

  motivo: {
    type: String,
    default: '',
  },

  responsable: {
    type: String,
    default: 'Usuario',
  },

  fecha: {
    type: Date,
    default: Date.now,
  },
});

const Movement = mongoose.model('Movement', movementSchema);

module.exports = Movement;