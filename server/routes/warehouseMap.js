const express = require('express');
const WarehouseMap = require('../models/warehouseMapModel');
const router = express.Router();

router.get('/', async (req,res,next)=>{
  try {
    const map = await WarehouseMap.findOne({ key:'main' }).lean();
    res.json(map || { key:'main', occupied:{} });
  } catch (error) { next({ code:500, error }); }
});

router.put('/', async (req,res,next)=>{
  try {
    const occupied = req.body?.occupied && typeof req.body.occupied === 'object' ? req.body.occupied : {};
    const map = await WarehouseMap.findOneAndUpdate(
      { key:'main' },
      { $set:{ occupied }, $setOnInsert:{ key:'main' } },
      { new:true, upsert:true, setDefaultsOnInsert:true }
    ).lean();
    res.json(map);
  } catch (error) { next({ code:500, error }); }
});

module.exports = router;
