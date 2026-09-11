const express = require('express');

const movementsController = require('../controllers/movementsController');

const router = express.Router();

// ========================================
// REGISTRAR CONSUMO
// ========================================

router.post(
  '/consumo',
  movementsController.registerConsumption
);

// ========================================
// REGISTRAR ENTRADA / SALIDA
// ========================================

router.post(
  '/',
  movementsController.registerMovement
);

// ========================================
// HISTORIAL
// ========================================

router.get(
  '/',
  movementsController.getMovements
);

module.exports = router;