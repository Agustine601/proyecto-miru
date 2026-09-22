const Communication = require('../models/communicationModel');

const areas = ['Recepción', 'Ventas', 'Depósito', 'Despacho', 'Administración'];

exports.getAreas = (req, res) => res.json(areas);

exports.getMessages = async (req, res) => {
  try {
    const area = String(req.query.area || '').trim();
    const filter = area ? { $or: [{ recipientArea: area }, { sender: area }] } : {};
    const messages = await Communication.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json(messages);
  } catch (error) {
    console.error('Error obteniendo comunicaciones:', error);
    res.status(500).json({ error: 'No se pudieron obtener las comunicaciones.' });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const { sender, senderEmail, senderArea, recipientArea, message } = req.body || {};
    if (!recipientArea || !areas.includes(recipientArea)) {
      return res.status(400).json({ error: 'Seleccioná un sector destinatario.' });
    }
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) return res.status(400).json({ error: 'Escribí un mensaje.' });
    const created = await Communication.create({
      sender: String(sender || 'Usuario').trim().slice(0, 80),
      senderEmail: String(senderEmail || '').trim().slice(0, 120),
      senderArea: String(senderArea || '').trim().slice(0, 80),
      recipientArea,
      message: cleanMessage.slice(0, 500),
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creando comunicación:', error);
    res.status(500).json({ error: 'No se pudo enviar el mensaje.' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const updated = await Communication.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Mensaje no encontrado.' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el mensaje.' });
  }
};
