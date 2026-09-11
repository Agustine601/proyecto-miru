const models = require('../models/itemsModels');

const itemsController = {};

// ========================================
// GET - OBTENER PRODUCTOS
// ========================================

itemsController.getConsumables = async (req, res, next) => {
  try {
    const consumables = await models.Consumable.find();

    res.locals.allConsumables = consumables;

    next();
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};

itemsController.getReagents = async (req, res, next) => {
  try {
    const reagents = await models.Reagent.find();

    res.locals.allReagents = reagents;

    next();
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};

itemsController.getEquipment = async (req, res, next) => {
  try {
    const equipment = await models.Equipment.find();

    res.locals.allEquipment = equipment;

    next();
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};

// ========================================
// POST - AGREGAR PRODUCTOS
// ========================================

itemsController.addConsumable = async (req, res, next) => {
  try {
    const consumable =
      await models.Consumable.create(
        req.body
      );

    return res.status(201).json({
      mensaje:
        'Producto agregado correctamente.',
      producto: consumable,
    });
  } catch (err) {
    console.error(
      'Error al agregar consumible:',
      err
    );

    next({
      code: 500,
      error: err,
    });
  }
};

itemsController.addReagent = async (req, res, next) => {
  try {
    const reagent =
      await models.Reagent.create(
        req.body
      );

    return res.status(201).json({
      mensaje:
        'Producto agregado correctamente.',
      producto: reagent,
    });
  } catch (err) {
    console.error(
      'Error al agregar producto químico:',
      err
    );

    next({
      code: 500,
      error: err,
    });
  }
};

itemsController.addEquipment = async (req, res, next) => {
  try {
    const equipment =
      await models.Equipment.create(
        req.body
      );

    return res.status(201).json({
      mensaje:
        'Equipamiento agregado correctamente.',
      producto: equipment,
    });
  } catch (err) {
    console.error(
      'Error al agregar equipamiento:',
      err
    );

    next({
      code: 500,
      error: err,
    });
  }
};

// ========================================
// DELETE - ELIMINAR PRODUCTOS
// ========================================

itemsController.deleteConsumable = async (req, res, next) => {
  try {
    await models.Consumable.deleteOne({
      _id: req.params.id,
    });

    return res.status(200).json({
      mensaje:
        'Consumible eliminado correctamente.',
    });
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};

itemsController.deleteReagent = async (req, res, next) => {
  try {
    await models.Reagent.deleteOne({
      _id: req.params.id,
    });

    return res.status(200).json({
      mensaje:
        'Producto químico eliminado correctamente.',
    });
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};

itemsController.deleteEquipment = async (req, res, next) => {
  try {
    await models.Equipment.deleteOne({
      _id: req.params.id,
    });

    return res.status(200).json({
      mensaje:
        'Equipamiento eliminado correctamente.',
    });
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};

// ========================================
// UPDATE - MODIFICAR PRODUCTOS
// ========================================

itemsController.updateConsumable = async (req, res, next) => {
  try {
    const consumable =
      await models.Consumable.findOneAndUpdate(
        { _id: req.params.id },
        req.body,
        {
          new: true,
        }
      );

    return res.status(200).json({
      mensaje:
        'Consumible actualizado correctamente.',
      producto: consumable,
    });
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};

itemsController.updateReagent = async (req, res, next) => {
  try {
    const reagent =
      await models.Reagent.findOneAndUpdate(
        { _id: req.params.id },
        req.body,
        {
          new: true,
        }
      );

    return res.status(200).json({
      mensaje:
        'Producto químico actualizado correctamente.',
      producto: reagent,
    });
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};

itemsController.updateEquipment = async (req, res, next) => {
  try {
    const equipment =
      await models.Equipment.findOneAndUpdate(
        { _id: req.params.id },
        req.body,
        {
          new: true,
        }
      );

    return res.status(200).json({
      mensaje:
        'Equipamiento actualizado correctamente.',
      producto: equipment,
    });
  } catch (err) {
    next({
      code: 500,
      error: err,
    });
  }
};
// ========================================
// RESTABLECER MIRÚ
// ========================================

const Movement = require('../models/movementsModel');
const WorkOrder = require('../models/workOrderModel');

itemsController.resetSystem = async (req, res) => {
  try {
    await Promise.all([
      models.Consumable.deleteMany({}),
      models.Reagent.deleteMany({}),
      models.Equipment.deleteMany({}),
      Movement.deleteMany({}),
      WorkOrder.deleteMany({}),
    ]);

    console.log('MIRÚ fue restablecido correctamente.');

    res.status(200).json({
      success: true,
      message: 'MIRÚ fue restablecido correctamente.',
    });
  } catch (error) {
    console.error('Error al restablecer MIRÚ:', error);

    res.status(500).json({
      success: false,
      message: 'No se pudo restablecer MIRÚ.',
    });
  }
};
module.exports = itemsController;

