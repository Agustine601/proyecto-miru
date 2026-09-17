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

router.get('/lookup', itemsController.lookupItem);

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

router.post('/:categoria/:id/stock', itemsController.addStock);
router.put('/:categoria/:id/pallet/:palletId/location', itemsController.updatePalletLocation);

// ========================================
// DELETE - ELIMINAR PRODUCTOS
// ========================================

router.delete('/consumables/:id', itemsController.deleteConsumable);

router.delete('/reagents/:id', itemsController.deleteReagent);

router.delete('/equipment/:id', itemsController.deleteEquipment);

// ========================================
// UPDATE - ACTUALIZAR PRODUCTOS
// ========================================

router.put('/consumables/:id', itemsController.updateConsumable);

router.put('/reagents/:id', itemsController.updateReagent);

router.put('/equipment/:id', itemsController.updateEquipment);

module.exports = router;
