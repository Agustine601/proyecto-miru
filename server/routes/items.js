const express = require('express');

const itemsController = require('../controllers/itemsController');

const router = express.Router();
// ========================================
// RESTABLECER MIRÚ
// ========================================

router.delete(
  '/reset-system',
  itemsController.resetSystem
);
// ========================================
// GET - OBTENER PRODUCTOS
// ========================================

router.get('/', (req, res) => {
  res.json('Has llegado a la sección de productos.');
});

router.get(
  '/consumables',
  itemsController.getConsumables,
  (req, res) => {
    res.status(200).json(res.locals.allConsumables);
  }
);

router.get(
  '/reagents',
  itemsController.getReagents,
  (req, res) => {
    res.status(200).json(res.locals.allReagents);
  }
);

router.get(
  '/equipment',
  itemsController.getEquipment,
  (req, res) => {
    res.status(200).json(res.locals.allEquipment);
  }
);

// ========================================
// POST - AGREGAR PRODUCTOS
// ========================================

router.post('/consumables', itemsController.addConsumable);

router.post('/reagents', itemsController.addReagent);

router.post('/equipment', itemsController.addEquipment);

// ========================================
// DELETE - ELIMINAR PRODUCTOS
// ========================================

router.delete(
  '/consumables/:id',
  itemsController.deleteConsumable,
  (req, res) => {
    res.sendStatus(200);
  }
);

router.delete(
  '/reagents/:id',
  itemsController.deleteReagent,
  (req, res) => {
    res.sendStatus(200);
  }
);

router.delete(
  '/equipment/:id',
  itemsController.deleteEquipment,
  (req, res) => {
    res.sendStatus(200);
  }
);

// ========================================
// UPDATE - ACTUALIZAR PRODUCTOS
// ========================================

router.put(
  '/consumables/:id',
  itemsController.updateConsumable,
  (req, res) => {
    res.sendStatus(200);
  }
);

router.put(
  '/reagents/:id',
  itemsController.updateReagent,
  (req, res) => {
    res.sendStatus(200);
  }
);

router.put(
  '/equipment/:id',
  itemsController.updateEquipment,
  (req, res) => {
    res.sendStatus(200);
  }
);

module.exports = router;
