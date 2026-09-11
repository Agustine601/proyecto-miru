const WorkOrder = require('../models/workOrderModel');
const models = require('../models/itemsModels');
const Movement = require('../models/movementsModel');

const obtenerModelo = (categoria) => {
  if (categoria === 'reagents') return models.Reagent;
  if (categoria === 'consumables') return models.Consumable;
  return null;
};

const generarNumero = () => {
  const fecha = new Date();
  const fechaTexto = fecha.toISOString().slice(0, 10).replace(/-/g, '');
  const sufijo = Math.floor(1000 + Math.random() * 9000);
  return `OT-${fechaTexto}-${sufijo}`;
};

const obtenerLote = (producto, lote) => {
  if (Array.isArray(producto.lotes) && producto.lotes.length) {
    return producto.lotes.find((item) => item.numero === lote);
  }
  return null;
};

const actualizarEstado = (orden) => {
  if (orden.estado === 'cancelado') return;

  const total = orden.items.length;
  const despachados = orden.items.filter((item) => item.despachado).length;

  if (!total || despachados === 0) {
    orden.estado = 'pendiente';
  } else if (despachados === total) {
    orden.estado = 'completo';
    orden.fechaCompletado = new Date();
  } else {
    orden.estado = 'parcial';
  }
};

exports.getWorkOrders = async (req, res) => {
  try {
    const ordenes = await WorkOrder.find().sort({ fechaCreacion: -1 });
    res.json(ordenes);
  } catch (error) {
    console.error('Error al obtener hojas de trabajo:', error);
    res.status(500).json({ error: 'No se pudieron obtener las hojas de trabajo.' });
  }
};

exports.createWorkOrder = async (req, res) => {
  try {
    const { solicitante = '', destino = '', observaciones = '', items = [], creadoPor = 'Usuario' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La hoja de trabajo debe tener al menos un producto.' });
    }

    const itemsValidados = [];

    for (const item of items) {
      if (!item.productoId || !item.categoria || !item.cantidad) {
        return res.status(400).json({ error: 'Cada producto debe tener producto, categoría y cantidad.' });
      }

      const Modelo = obtenerModelo(item.categoria);
      if (!Modelo) return res.status(400).json({ error: 'Categoría no válida para despacho.' });

      const producto = await Modelo.findById(item.productoId);
      if (!producto) return res.status(404).json({ error: `No se encontró el producto ${item.productoId}.` });

      const cantidad = Number(item.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: `Cantidad inválida para ${producto.nombre}.` });
      }

      const lote = item.lote || producto.lote || 'SIN-LOTE';
      const loteProducto = obtenerLote(producto, lote);
      const disponible = loteProducto
        ? Number(loteProducto.cantidad || 0)
        : Number(producto.cantidad || 0);

      if (disponible < cantidad) {
        return res.status(400).json({
          error: `Stock insuficiente para ${producto.nombre}. Disponible: ${disponible} ${producto.unidad || ''}`,
        });
      }

      itemsValidados.push({
        productoId: producto._id,
        producto: producto.nombre,
        categoria: item.categoria,
        lote,
        cantidad,
        unidad: producto.unidad || '',
      });
    }

    const orden = await WorkOrder.create({
      numero: generarNumero(),
      solicitante: String(solicitante).trim(),
      destino: String(destino).trim(),
      observaciones: String(observaciones).trim(),
      items: itemsValidados,
      creadoPor: String(creadoPor || 'Usuario').trim(),
    });

    res.status(201).json(orden);
  } catch (error) {
    console.error('Error al crear hoja de trabajo:', error);
    res.status(500).json({ error: 'No se pudo crear la hoja de trabajo.' });
  }
};

exports.dispatchItem = async (req, res) => {
  try {
    const { itemIndex } = req.params;
    const { responsable = 'Usuario' } = req.body;
    const orden = await WorkOrder.findById(req.params.id);

    if (!orden) return res.status(404).json({ error: 'No se encontró la hoja de trabajo.' });
    if (orden.estado === 'cancelado') return res.status(400).json({ error: 'La hoja está cancelada.' });

    const index = Number(itemIndex);
    const item = orden.items[index];
    if (!item) return res.status(404).json({ error: 'No se encontró el producto dentro de la hoja.' });
    if (item.despachado) return res.status(400).json({ error: 'Ese producto ya fue despachado.' });

    const Modelo = obtenerModelo(item.categoria);
    const producto = await Modelo.findById(item.productoId);
    if (!producto) return res.status(404).json({ error: 'El producto ya no existe en el inventario.' });

    const cantidad = Number(item.cantidad);
    const loteSeleccionado = item.lote || producto.lote || 'SIN-LOTE';
    const loteProducto = obtenerLote(producto, loteSeleccionado);

    if (Array.isArray(producto.lotes) && producto.lotes.length) {
      if (!loteProducto) return res.status(404).json({ error: `No se encontró el lote ${loteSeleccionado}.` });
      const disponible = Number(loteProducto.cantidad || 0);
      if (disponible < cantidad) {
        return res.status(400).json({ error: `Stock insuficiente en ${producto.nombre}. Disponible: ${disponible} ${producto.unidad || ''}` });
      }
      loteProducto.cantidad = disponible - cantidad;
    } else {
      const disponible = Number(producto.cantidad || 0);
      if (disponible < cantidad) {
        return res.status(400).json({ error: `Stock insuficiente en ${producto.nombre}. Disponible: ${disponible} ${producto.unidad || ''}` });
      }
    }

    producto.cantidad = Number(producto.cantidad || 0) - cantidad;
    await producto.save();

    await Movement.create({
      productoId: producto._id,
      producto: producto.nombre,
      categoria: item.categoria,
      lote: loteSeleccionado,
      tipo: 'salida',
      cantidad,
      unidad: producto.unidad || '',
      motivo: `Despacho hoja ${orden.numero}${orden.destino ? ` - ${orden.destino}` : ''}`,
      responsable: String(responsable || 'Usuario'),
    });

    item.despachado = true;
    item.fechaDespacho = new Date();
    item.responsableDespacho = String(responsable || 'Usuario');
    actualizarEstado(orden);
    await orden.save();

    res.json({ orden, stockActual: producto.cantidad });
  } catch (error) {
    console.error('Error al despachar producto:', error);
    res.status(500).json({ error: 'No se pudo despachar el producto.' });
  }
};

exports.cancelWorkOrder = async (req, res) => {
  try {
    const orden = await WorkOrder.findById(req.params.id);
    if (!orden) return res.status(404).json({ error: 'No se encontró la hoja de trabajo.' });
    if (orden.items.some((item) => item.despachado)) {
      return res.status(400).json({ error: 'No se puede cancelar una hoja que ya tiene productos despachados.' });
    }
    orden.estado = 'cancelado';
    await orden.save();
    res.json(orden);
  } catch (error) {
    console.error('Error al cancelar hoja:', error);
    res.status(500).json({ error: 'No se pudo cancelar la hoja.' });
  }
};
