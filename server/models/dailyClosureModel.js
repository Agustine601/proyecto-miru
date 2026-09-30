const mongoose = require('mongoose');

const dailyClosureSchema = new mongoose.Schema({
  dateKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  fechaCierre: {
    type: Date,
    default: Date.now,
  },

  responsable: {
    type: String,
    default: 'Usuario',
  },

  resumen: {
    entradas: { type: Number, default: 0 },
    salidas: { type: Number, default: 0 },
    consumos: { type: Number, default: 0 },
  },

  movimientos: {
    type: Number,
    default: 0,
  },

  productos: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('DailyClosure', dailyClosureSchema);
