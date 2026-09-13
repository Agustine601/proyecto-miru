const path = require('path');
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

const itemsRouter = require('./routes/items');
const movementsRouter = require('./routes/movements');
const workOrdersRouter = require('./routes/workOrders');
const warehouseMapRouter = require('./routes/warehouseMap');

const userController = require('./controllers/userController');
const cookieController = require('./controllers/cookieController');
const sessionController = require('./controllers/sessionController');

// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Generador QR local. No depende de api.qrserver ni de servicios externos.
app.get('/qr', (req, res) => {
  const data = String(req.query.data || '').slice(0, 2048);
  if (!data) return res.status(400).send('Missing QR data');
  try {
    const { spawn } = require('child_process');
    const script = path.join(__dirname, 'generate_qr.py');
    const py = spawn(process.platform === 'win32' ? 'python' : 'python3', [script, data]);
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    py.stdout.pipe(res);
    py.stderr.on('data', (chunk) => console.error('QR:', String(chunk)));
    py.on('error', (error) => {
      console.error('No se pudo ejecutar el generador QR:', error);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (error) {
    console.error('Error generando QR:', error);
    if (!res.headersSent) res.status(500).send('QR generation error');
  }
});

// ========================================
// RUTAS
// ========================================

// Productos
app.use('/items', itemsRouter);

// Movimientos
app.use('/movements', movementsRouter);

// Hojas de trabajo / pedidos
app.use('/work-orders', workOrdersRouter);

// Mapa de ubicaciones del galpón
app.use('/warehouse-map', warehouseMapRouter);

app.post(
  '/signup',
  userController.createUser,
  cookieController.setSSIDCookie,
  sessionController.startSession,
  (req, res) => {
    // Registro de usuario
  }
);

// ========================================
// PRODUCCIÓN
// ========================================

if (process.env.NODE_ENV === 'production') {
  app.get('/manifest.json', (req, res) =>
    res.sendFile(path.join(__dirname, '../manifest.json'))
  );

  app.get('/service-worker.js', (req, res) =>
    res.sendFile(path.join(__dirname, '../service-worker.js'))
  );

  app.get('/miru.png', (req, res) =>
    res.sendFile(path.join(__dirname, '../src/assets/miru.png'))
  );

  app.use(
    '/build',
    express.static(path.join(__dirname, '../build'))
  );

  app.get('/', (req, res) => {
    return res
      .status(200)
      .sendFile(path.join(__dirname, '../index.html'));
  });
}

// ========================================
// 404
// ========================================

app.use((req, res) =>
  res
    .status(404)
    .send("404! This is not the page you're looking for...")
);

// ========================================
// ERROR HANDLER
// ========================================

app.use(({ code, error }, req, res, next) => {
  res.status(code || 500).json({
    error,
  });
});

// ========================================
// SERVIDOR
// ========================================

const httpsOptions = {
  key: fs.readFileSync(
    path.join(__dirname, '../192.168.1.52+2-key.pem')
  ),
  cert: fs.readFileSync(
    path.join(__dirname, '../192.168.1.52+2.pem')
  ),
};

https.createServer(httpsOptions, app).listen(
  port,
  '0.0.0.0',
  () => {
    console.log(`MIRÚ HTTPS funcionando en https://localhost:${port}`);
    console.log(`MIRÚ HTTPS en red: https://192.168.1.52:${port}`);
  }
);