require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const models = require('../models/itemsModels');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('Falta MONGO_URI en .env'); process.exit(1); }

const archivo = path.join(__dirname, '..', 'data', 'controlStockImport.json');
const productos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
const modelos = { consumables: models.Consumable, reagents: models.Reagent, equipment: models.Equipment };

async function importar() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, dbName: 'storeroomDB' });
  let creados = 0; let actualizados = 0;
  for (const item of productos) {
    const Modelo = modelos[item.categoria];
    if (!Modelo) continue;
    const existente = await Modelo.findOne({ nombre: item.nombre, galpon: item.galpon, centroOperativo: item.centroOperativo });
    const datos = { nombre: item.nombre, codigoInterno: item.codigoInterno || '', galpon: item.galpon, centroOperativo: item.centroOperativo, lotes: item.lotes, cantidad: item.cantidad, stockMinimo: item.stockMinimo, unidad: item.unidad, vencimiento: item.vencimiento, ubicacion: item.ubicacion, descripcion: item.descripcion };
    if (existente) { Object.assign(existente, datos); await existente.save(); actualizados++; }
    else { await Modelo.create(datos); creados++; }
  }
  console.log(`Importación terminada. Creados: ${creados}. Actualizados: ${actualizados}. Total procesados: ${productos.length}.`);
  await mongoose.disconnect();
}

importar().catch(async (error) => { console.error('Error al importar Control Stock.xlsx:', error); try { await mongoose.disconnect(); } catch (_) {} process.exit(1); });
