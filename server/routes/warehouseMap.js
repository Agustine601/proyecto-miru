const express = require('express');
const WarehouseMap = require('../models/warehouseMapModel');
const router = express.Router();

const normalizeSection = (section) => ({
  occupied:
    section?.occupied && typeof section.occupied === 'object'
      ? section.occupied
      : {},
  blocked:
    Array.isArray(section?.blocked)
      ? [...new Set(section.blocked.map(String))]
      : [],
});

router.get('/', async (req, res, next) => {
  try {
    const map = await WarehouseMap.findOne({ key: 'main' }).lean();

    if (!map) {
      return res.json({
        key: 'main',
        agroquimicos: { occupied: {}, blocked: [] },
        semillas: { occupied: {}, blocked: [] },
        occupied: {},
      });
    }

    const agroquimicos = normalizeSection(
      map.agroquimicos && typeof map.agroquimicos === 'object'
        ? map.agroquimicos
        : { occupied: map.occupied || {} }
    );
    const semillas = normalizeSection(map.semillas);

    return res.json({ ...map, agroquimicos, semillas });
  } catch (error) {
    next({ code: 500, error });
  }
});

router.put('/', async (req, res, next) => {
  try {
    const hasSections =
      req.body?.agroquimicos || req.body?.semillas;

    const agroquimicos = normalizeSection(
      hasSections
        ? req.body.agroquimicos
        : { occupied: req.body?.occupied || {} }
    );
    const semillas = normalizeSection(req.body?.semillas);

    const map = await WarehouseMap.findOneAndUpdate(
      { key: 'main' },
      {
        $set: {
          agroquimicos,
          semillas,
          occupied: agroquimicos.occupied,
        },
        $setOnInsert: { key: 'main' },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      ...map,
      agroquimicos: normalizeSection(map.agroquimicos),
      semillas: normalizeSection(map.semillas),
    });
  } catch (error) {
    next({ code: 500, error });
  }
});

module.exports = router;
