const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true, trim: true, maxlength: 120 },
    senderEmail: { type: String, default: '', trim: true, maxlength: 180 },
    senderArea: {
      type: String,
      required: true,
      enum: ['Recepción', 'Ventas', 'Depósito', 'Despacho', 'Administración'],
    },
    recipientArea: {
      type: String,
      required: true,
      enum: ['Recepción', 'Ventas', 'Depósito', 'Despacho', 'Administración'],
    },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    priority: {
      type: String,
      enum: ['normal', 'importante', 'urgente'],
      default: 'normal',
    },
    read: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Communication',
      default: null,
    },
  },
  { timestamps: true }
);

communicationSchema.index({ createdAt: -1 });
communicationSchema.index({ recipientArea: 1, read: 1 });
communicationSchema.index({ pinned: 1, createdAt: -1 });

module.exports =
  mongoose.models.Communication ||
  mongoose.model('Communication', communicationSchema);
