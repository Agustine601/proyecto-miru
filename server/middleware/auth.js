const crypto = require('crypto');
const Session = require('../models/sessionModel');
const User = require('../models/userModel');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies?.ssid;

    if (!token) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    const session = await Session.findOne({ cookieId: hashToken(token) });

    if (!session || session.expiresAt <= new Date()) {
      res.clearCookie('ssid');
      return res.status(401).json({ error: 'Sesión vencida.' });
    }

    const user = await User.findById(session.userId).lean();

    if (!user) {
      res.clearCookie('ssid');
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    req.user = user;
    req.session = session;
    return next();
  } catch (error) {
    return next(error);
  }
};

auth.hashToken = hashToken;

module.exports = auth;
