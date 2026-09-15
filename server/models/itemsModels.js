require('dotenv').config();

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'storeroomDB',
  })
  .then(() => console.log('Conectado a MongoDB.'))
  .catch((err) => console.log(err));

const Schema = mongoose.Schema;

// ================================
// CONSUMIBLES
// ================================
const palletSchema = new Schema(
  {
    numeroPallet: { type: String, default: '', trim: true },
    cantidad: { type: Number, default: 0, min: 0 },
    ubicacion: { type: String, default: '', trim: true },
    codigo: { type: String, default: '', trim: true },
    estado: { type: String, enum: ['activo', 'retirado', 'bloqueado'], default: 'activo' },
    fechaIngreso: { type: Date, default: Date.now },
  },
  { _id: true }
);

const loteSchema = new Schema(
  {
    numero: {
      type: String,
      required: true,
      trim: true,
    },

    cantidad: {
      type: Number,
      default: 0,
      min: 0,
    },

    vencimiento: {
      type: String,
      default: '',
    },

    ubicacion: {
      type: String,
      default: '',
    },

    proveedor: {
      type: String,
      default: '',
    },

    fechaIngreso: {
      type: Date,
      default: Date.now,
    },

    pallets: {
      type: [palletSchema],
      default: [],
    },
  },
  {
    _id: true,
  }
);
const consumableSchema = new Schema({
  nombre: String,
  codigoBarras: { type: String, default: '', trim: true, index: true },
  codigoQR: { type: String, default: '', trim: true, index: true },
  codigoQRExterno: { type: String, default: '', trim: true, index: true },
  lotes: {
  type: [loteSchema],
  default: [],
},
  proveedor: String,
  vencimiento: String,
  cantidad: Number,
  stockMinimo: {
  type: Number,
  default: 10,
},
  unidad: String,
  ubicacion: String,
  descripcion: String,
});

const Consumable = mongoose.model('Consumable', consumableSchema);

// ================================
// PRODUCTOS QUÍMICOS
// ================================

const reagentSchema = new Schema({
  nombre: String,
  codigoBarras: { type: String, default: '', trim: true, index: true },
  codigoQR: { type: String, default: '', trim: true, index: true },
  codigoQRExterno: { type: String, default: '', trim: true, index: true },
  formula: String,
  cas: String,
  lotes: {
  type: [loteSchema],
  default: [],
},
  proveedor: String,
  vencimiento: String,
  cantidad: Number,
  unidad: String,
    stockMinimo: {
    type: Number,
    default: 10,
  },
  ubicacion: String,
  descripcion: String,
});

const Reagent = mongoose.model('Reagent', reagentSchema);

// ================================
// EQUIPAMIENTO
// ================================

const equipmentSchema = new Schema({
  nombre: String,
  codigoBarras: { type: String, default: '', trim: true, index: true },
  codigoQR: { type: String, default: '', trim: true, index: true },
  codigoQRExterno: { type: String, default: '', trim: true, index: true },
  lote: String,
  proveedor: String,
  ubicacion: String,
  descripcion: String,
  ultimoMantenimiento: String,
});

const Equipment = mongoose.model('Equipment', equipmentSchema);

// ================================
// SEMILLAS
// ================================

const seedSchema = new Schema({
  nombre: String,

  solicitante: {
    type: String,
    default: '',
    trim: true,
  },

  imagenBolsa: {
    type: String,
    default: '',
  },

  lotes: {
    type: [loteSchema],
    default: [],
  },

  proveedor: String,

  vencimiento: String,

  cantidad: Number,

  stockMinimo: {
    type: Number,
    default: 10,
  },

  unidad: String,

  ubicacion: String,

  descripcion: String,
});

const Seed = mongoose.model('Seed', seedSchema);


// ================================
// EXPORTAR MODELOS
// ================================

module.exports = {
  Consumable,
  Reagent,
  Equipment,
  Seed,
};