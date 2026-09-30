const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const Session = require('../models/sessionModel');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ||
  '261481707145-q95uebl2j0k3bnlmlo19l61hm1sv30v9.apps.googleusercontent.com';
const SESSION_DAYS = 7;

const publicUser = (user) => ({
  id: String(user._id),
  name: user.name || user.username || user.email || 'Usuario',
  email: user.email || '',
  role: user.role || 'user',
  sector: user.sector || 'General',
  isOwner: Boolean(user.isOwner),
});

const createSession = async (user, res) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await Session.deleteMany({ userId: user._id });
  await Session.create({
    cookieId: crypto.createHash('sha256').update(rawToken).digest('hex'),
    userId: user._id,
    expiresAt,
  });

  const cookie = [
    `ssid=${encodeURIComponent(rawToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
  ].join('; ');
  res.setHeader('Set-Cookie', cookie);
};

const authController = {};

authController.login = async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    }

    const user = await User.findOne({ username }).select('+password');
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    await createSession(user, res);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

authController.signup = async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const name = String(req.body.name || username).trim();

    if (!username || password.length < 8) {
      return res.status(400).json({ error: 'El usuario es obligatorio y la contraseña debe tener al menos 8 caracteres.' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ error: 'El usuario ya existe.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, password: hash, name, role: 'user', sector: 'General' });

    await createSession(user, res);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

authController.google = async (req, res, next) => {
  try {
    const credential = String(req.body.credential || '');
    if (!credential) {
      return res.status(400).json({ error: 'Falta la credencial de Google.' });
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      return res.status(401).json({ error: 'La credencial de Google no es válida.' });
    }

    const profile = await response.json();
    if (profile.aud !== GOOGLE_CLIENT_ID || profile.email_verified !== 'true') {
      return res.status(401).json({ error: 'La identidad de Google no pudo verificarse.' });
    }

    let user = await User.findOne({ googleSub: profile.sub });
    if (!user && profile.email) {
      user = await User.findOne({ email: String(profile.email).toLowerCase() });
    }

    if (!user) {
      user = await User.create({
        name: profile.name || profile.email,
        email: String(profile.email || '').toLowerCase(),
        googleSub: profile.sub,
        role: 'user',
        sector: 'General',
      });
    } else {
      user.name = profile.name || user.name;
      user.email = String(profile.email || user.email || '').toLowerCase();
      user.googleSub = profile.sub;
      await user.save();
    }

    await createSession(user, res);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

authController.me = async (req, res) => {
  return res.json({ user: publicUser(req.user) });
};

authController.logout = async (req, res, next) => {
  try {
    if (req.cookies?.ssid) {
      await Session.deleteOne({ cookieId: authController.hashToken(req.cookies.ssid) });
    }
    const clearCookie = [
      'ssid=',
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
    res.setHeader('Set-Cookie', clearCookie);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};

// Reutilizado por logout para evitar duplicar la función de hash.
authController.hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

module.exports = authController;
