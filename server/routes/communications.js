const express = require('express');
const mongoose = require('mongoose');
const Communication = require('../models/communicationModel');

const router = express.Router();

const AREAS = ['Recepción', 'Ventas', 'Depósito', 'Despacho', 'Administración'];
const PRIORITIES = ['normal', 'importante', 'urgente'];

router.get('/', async (req, res) => {
  try {
    const messages = await Communication.find()
      .sort({ pinned: -1, createdAt: -1 })
      .limit(500)
      .lean();

    res.json(messages);
  } catch (error) {
    console.error('Error obteniendo comunicaciones:', error);
    res.status(500).json({ error: 'No se pudieron obtener las comunicaciones.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      sender,
      senderEmail,
      senderArea,
      recipientArea,
      message,
      priority = 'normal',
      parentId = null,
    } = req.body || {};

    if (!sender || !message || !AREAS.includes(senderArea) || !AREAS.includes(recipientArea)) {
      return res.status(400).json({ error: 'Faltan datos válidos para enviar el mensaje.' });
    }

    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Prioridad inválida.' });
    }

    const cleanMessage = String(message).trim();
    if (!cleanMessage) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }

    if (parentId && !mongoose.isValidObjectId(parentId)) {
      return res.status(400).json({ error: 'La respuesta no referencia un mensaje válido.' });
    }

    const created = await Communication.create({
      sender: String(sender).slice(0, 120),
      senderEmail: String(senderEmail || '').slice(0, 180),
      senderArea,
      recipientArea,
      message: cleanMessage.slice(0, 500),
      priority,
      parentId: parentId || null,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error enviando comunicación:', error);
    res.status(500).json({ error: 'No se pudo enviar el mensaje.' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Mensaje inválido.' });
    }

    const updated = await Communication.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Mensaje no encontrado.' });

    res.json(updated);
  } catch (error) {
    console.error('Error marcando comunicación como leída:', error);
    res.status(500).json({ error: 'No se pudo marcar el mensaje.' });
  }
});

router.patch('/:id/pin', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Mensaje inválido.' });
    }

    const updated = await Communication.findByIdAndUpdate(
      req.params.id,
      { pinned: Boolean(req.body?.pinned) },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Mensaje no encontrado.' });

    res.json(updated);
  } catch (error) {
    console.error('Error fijando comunicación:', error);
    res.status(500).json({ error: 'No se pudo actualizar el mensaje.' });
  }
});

module.exports = router;
