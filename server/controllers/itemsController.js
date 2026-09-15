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
// GET - BUSCAR PRODUCTO POR CÓDIGO / LOTE
// ========================================

const normalizar = (valor) =>
  String(valor || '').trim().toUpperCase();

const escaparRegex = (valor) =>
  String(valor || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const coincideTexto = (valor) => ({
  $regex: `^${escaparRegex(valor)}$`,
  $options: 'i',
});

const obtenerModeloPorCategoria = (categoria) => {
  const mapa = {
    consumables: models.Consumable,
    reagents: models.Reagent,
    equipment: models.Equipment,
  };
  return mapa[categoria] || null;
};

const buscarEnModelo = async (Model, filtros) => {
  const condiciones = [];

  if (filtros.codigoBarras) {
    condiciones.push({ codigoBarras: coincideTexto(filtros.codigoBarras) });
  }

  if (filtros.codigoQR) {
    condiciones.push({ codigoQR: coincideTexto(filtros.codigoQR) });
  }

  if (filtros.codigoQRExterno) {
    condiciones.push({ codigoQRExterno: coincideTexto(filtros.codigoQRExterno) });
  }

  // Un lote solo no alcanza para declarar duplicado: se usa junto
  // con nombre o código para evitar falsos positivos entre productos.
  if (filtros.lote && filtros.nombre) {
    condiciones.push({
      lotes: {
        $elemMatch: {
          numero: coincideTexto(filtros.lote),
        },
      },
      nombre: coincideTexto(filtros.nombre),
    });
  }

  if (!condiciones.length) return null;

  const producto = await Model.findOne({ $or: condiciones });
  if (!producto) return null;

  let encontradoPor = 'producto existente';
  if (filtros.codigoBarras && normalizar(producto.codigoBarras) === filtros.codigoBarras) {
    encontradoPor = 'código de barras';
  } else if (filtros.codigoQR && normalizar(producto.codigoQR) === filtros.codigoQR) {
    encontradoPor = 'código QR MIRÚ';
  } else if (filtros.codigoQRExterno && normalizar(producto.codigoQRExterno) === filtros.codigoQRExterno) {
    encontradoPor = 'QR externo';
  } else if (filtros.lote && filtros.nombre) {
    encontradoPor = 'nombre + lote';
  }

  return { producto, encontradoPor };
};

itemsController.lookupItem = async (req, res, next) => {
  try {
    const categoria = String(req.query.categoria || '').trim();
    const filtros = {
      codigoBarras: normalizar(req.query.codigoBarras),
      codigoQR: normalizar(req.query.codigoQR),
      codigoQRExterno: normalizar(req.query.codigoQRExterno),
      lote: normalizar(req.query.lote),
      nombre: normalizar(req.query.nombre),
    };

    if (!filtros.codigoBarras && !filtros.codigoQR && !filtros.codigoQRExterno && !(filtros.lote && filtros.nombre)) {
      return res.status(400).json({
        encontrado: false,
        error: 'Indicá al menos un código o la combinación nombre + lote.',
      });
    }

    const modelos = categoria
      ? [[categoria, obtenerModeloPorCategoria(categoria)]]
      : [
          ['consumables', models.Consumable],
          ['reagents', models.Reagent],
          ['equipment', models.Equipment],
        ];

    if (categoria && !modelos[0][1]) {
      return res.status(400).json({
        encontrado: false,
        error: `Categoría inválida: ${categoria}`,
      });
    }

    for (const [categoriaEncontrada, Model] of modelos) {
      const resultado = await buscarEnModelo(Model, filtros);
      if (resultado) {
        return res.status(200).json({
          encontrado: true,
          categoria: categoriaEncontrada,
          encontradoPor: resultado.encontradoPor,
          producto: resultado.producto,
        });
      }
    }

    return res.status(200).json({ encontrado: false });
  } catch (err) {
    console.error('Error buscando producto:', err);
    next({ code: 500, error: err });
  }
};

// ========================================
// POST - AGREGAR INGRESO A PRODUCTO EXISTENTE
// ========================================

const generarNumeroPallet = () => `PAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

itemsController.addStock = async (req, res, next) => {
  try {
    const categoria = String(req.params.categoria || '').trim();
    const Model = obtenerModeloPorCategoria(categoria);
    if (!Model || categoria === 'equipment') {
      return res.status(400).json({ error: 'La categoría no permite agregar stock por esta vía.' });
    }

    const cantidad = Number(req.body.cantidad || 0);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor que cero.' });
    }

    const producto = await Model.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });

    const numeroLote = normalizar(req.body.lote);
    if (!numeroLote) return res.status(400).json({ error: 'Indicá el lote del ingreso.' });

    let lote = producto.lotes.find((x) => normalizar(x.numero) === numeroLote);
    if (!lote) {
      lote = {
        numero: String(req.body.lote).trim(),
        cantidad: 0,
        vencimiento: String(req.body.vencimiento || '').trim(),
        ubicacion: '',
        proveedor: String(req.body.proveedor || producto.proveedor || '').trim(),
        fechaIngreso: new Date(),
        pallets: [],
      };
      producto.lotes.push(lote);
      lote = producto.lotes[producto.lotes.length - 1];
    }

    const pallet = {
      numeroPallet: String(req.body.numeroPallet || '').trim() || generarNumeroPallet(),
      cantidad,
      ubicacion: '',
      codigo: String(req.body.codigo || '').trim(),
      estado: 'activo',
      fechaIngreso: new Date(),
    };

    lote.pallets.push(pallet);
    lote.cantidad = Number(lote.cantidad || 0) + cantidad;
    producto.cantidad = Number(producto.cantidad || 0) + cantidad;

    if (req.body.vencimiento) lote.vencimiento = String(req.body.vencimiento).trim();
    if (req.body.proveedor) lote.proveedor = String(req.body.proveedor).trim();
    if (!producto.vencimiento && lote.vencimiento) producto.vencimiento = lote.vencimiento;
    if (!producto.proveedor && lote.proveedor) producto.proveedor = lote.proveedor;

    await producto.save();

    return res.status(200).json({
      mensaje: 'Ingreso agregado al producto existente.',
      producto,
      loteId: String(lote._id),
      pallet,
    });
  } catch (err) {
    console.error('Error agregando ingreso:', err);
    next({ code: 500, error: err });
  }
};

// ========================================
// PUT - ACTUALIZAR UBICACIÓN DE PALLET
// ========================================

itemsController.updatePalletLocation = async (req, res, next) => {
  try {
    const categoria = String(req.params.categoria || '').trim();
    const Model = obtenerModeloPorCategoria(categoria);

    if (!Model || categoria === 'equipment') {
      return res.status(400).json({ error: 'La categoría no permite pallets.' });
    }

    const ubicacion = String(req.body.ubicacion || '').trim();

    const producto = await Model.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    let palletEncontrado = null;
    let loteEncontrado = null;

    for (const lote of producto.lotes || []) {
      const pallet = (lote.pallets || []).id(req.params.palletId);
      if (pallet) {
        palletEncontrado = pallet;
        loteEncontrado = lote;
        break;
      }
    }

    if (!palletEncontrado) {
      return res.status(404).json({ error: 'Pallet no encontrado en el producto.' });
    }

    // La ubicación física pertenece al pallet. No sobrescribimos la ubicación
    // del lote/producto porque un mismo lote puede tener varios pallets en
    // posiciones diferentes.
    palletEncontrado.ubicacion = ubicacion;

    await producto.save();

    return res.status(200).json({
      mensaje: 'Ubicación del pallet actualizada.',
      categoria,
      producto,
      palletId: String(palletEncontrado._id),
      ubicacion,
    });
  } catch (err) {
    console.error('Error actualizando ubicación del pallet:', err);
    next({ code: 500, error: err });
  }
};

// ========================================
// POST - AGREGAR PRODUCTOS
// ========================================

itemsController.addConsumable = async (req, res, next) => {
  try {
    const filtros = {
      codigoBarras: normalizar(req.body.codigoBarras),
      codigoQR: normalizar(req.body.codigoQR),
      codigoQRExterno: normalizar(req.body.codigoQRExterno),
      lote: normalizar(req.body.lote),
      nombre: normalizar(req.body.nombre),
    };
    const existente = await buscarEnModelo(models.Consumable, filtros);
    if (existente) {
      return res.status(409).json({
        error: 'El producto ya existe en MIRÚ.',
        duplicado: true,
        categoria: 'consumables',
        encontradoPor: existente.encontradoPor,
        producto: existente.producto,
      });
    }

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
    const filtros = {
      codigoBarras: normalizar(req.body.codigoBarras),
      codigoQR: normalizar(req.body.codigoQR),
      codigoQRExterno: normalizar(req.body.codigoQRExterno),
      lote: normalizar(req.body.lote),
      nombre: normalizar(req.body.nombre),
    };
    const existente = await buscarEnModelo(models.Reagent, filtros);
    if (existente) {
      return res.status(409).json({
        error: 'El producto ya existe en MIRÚ.',
        duplicado: true,
        categoria: 'reagents',
        encontradoPor: existente.encontradoPor,
        producto: existente.producto,
      });
    }

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
    const filtros = {
      codigoBarras: normalizar(req.body.codigoBarras),
      codigoQR: normalizar(req.body.codigoQR),
      codigoQRExterno: normalizar(req.body.codigoQRExterno),
      lote: normalizar(req.body.lote),
      nombre: normalizar(req.body.nombre),
    };
    const existente = await buscarEnModelo(models.Equipment, filtros);
    if (existente) {
      return res.status(409).json({
        error: 'El producto ya existe en MIRÚ.',
        duplicado: true,
        categoria: 'equipment',
        encontradoPor: existente.encontradoPor,
        producto: existente.producto,
      });
    }

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

