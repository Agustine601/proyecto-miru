const Movement = require('../models/movementsModel');
const models = require('../models/itemsModels');
const DailyClosure = require('../models/dailyClosureModel');
const { calcularEquivalente } = require('../utils/conversionStock');

const movementsController = {};

const obtenerModelo = (categoria) => {
  if (categoria === 'reagents') {
    return models.Reagent;
  }

  if (categoria === 'consumables') {
    return models.Consumable;
  }

  if (categoria === 'equipment') {
    return models.Equipment;
  }

  return null;
};

const obtenerLotes = (producto) => {
  /*
   * Productos nuevos:
   * utilizan producto.lotes
   */
  if (
    Array.isArray(producto.lotes) &&
    producto.lotes.length > 0
  ) {
    return producto.lotes;
  }

  /*
   * Productos antiguos:
   * convertimos temporalmente el lote
   * viejo en un lote virtual.
   */
  return [
    {
      numero:
        producto.lote ||
        'SIN-LOTE',

      cantidad:
        Number(
          producto.cantidad || 0
        ),

      vencimiento:
        producto.vencimiento ||
        '',

      ubicacion:
        producto.ubicacion ||
        '',

      proveedor:
        producto.proveedor ||
        '',
    },
  ];
};

/*
 * Actualiza el stock general del producto
 * según el movimiento.
 */
const actualizarStockGeneral = (
  producto,
  tipo,
  cantidad
) => {
  const stockActual =
    Number(
      producto.cantidad || 0
    );

  if (tipo === 'entrada') {
    producto.cantidad =
      stockActual + cantidad;

    return true;
  }

  if (tipo === 'salida') {
    if (
      stockActual <
      cantidad
    ) {
      return false;
    }

    producto.cantidad =
      stockActual - cantidad;

    return true;
  }

  return false;
};

/*
 * Busca un lote por su número.
 */
const buscarLote = (
  producto,
  loteSeleccionado
) => {
  const lotes = obtenerLotes(
    producto
  );

  return lotes.find(
    (lote) =>
      lote.numero ===
      loteSeleccionado
  );
};

/*
 * Busca un pallet dentro de todos los lotes del producto.
 */
const buscarPallet = (producto, palletId) => {
  if (!palletId || !Array.isArray(producto.lotes)) return null;

  for (const lote of producto.lotes) {
    const pallet = (lote.pallets || []).id(palletId);
    if (pallet) return { pallet, lote };
  }

  return null;
};

const actualizarPalletMovimiento = ({
  producto,
  palletId,
  tipo,
  cantidad,
}) => {
  if (!palletId) return { ok: true, pallet: null };

  const encontrado = buscarPallet(producto, palletId);

  if (!encontrado) {
    return {
      ok: false,
      error: 'El pallet indicado no existe dentro del producto.',
    };
  }

  const pallet = encontrado.pallet;
  const stockPallet = Number(pallet.cantidad || 0);

  if (['salida', 'consumo'].includes(tipo)) {
    if (stockPallet < cantidad) {
      return {
        ok: false,
        error: `Stock insuficiente en el pallet. Disponible: ${stockPallet} ${producto.unidad || ''}`,
      };
    }

    pallet.cantidad = stockPallet - cantidad;

    if (pallet.cantidad === 0) {
      pallet.estado = 'retirado';
    }
  } else if (tipo === 'entrada') {
    pallet.cantidad = stockPallet + cantidad;
    pallet.estado = 'activo';
  }

  return { ok: true, pallet };
};

/*
 * REGISTRAR ENTRADA / SALIDA
 */

movementsController.registerMovement =
  async (req, res) => {
    const {
      productoId,
      categoria,
      tipo,
      cantidad,
      motivo,
      responsable,
      lote,
      palletId,
      ubicacion,
    } = req.body;

    try {
      if (
        !productoId ||
        !categoria ||
        !tipo ||
        !cantidad
      ) {
        return res
          .status(400)
          .json({
            error:
              'Faltan datos para registrar el movimiento.',
          });
      }

      if (
        ![
          'reagents',
          'consumables',
          'equipment',
        ].includes(
          categoria
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Las entradas y salidas solo pueden registrarse para productos químicos, semillas u otros insumos.',
          });
      }

      if (
        ![
          'entrada',
          'salida',
        ].includes(tipo)
      ) {
        return res
          .status(400)
          .json({
            error:
              'El tipo de movimiento no es válido.',
          });
      }

      const cantidadMovimiento =
        Number(cantidad);

      if (
        !Number.isFinite(
          cantidadMovimiento
        ) ||
        cantidadMovimiento <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              'La cantidad debe ser mayor a cero.',
          });
      }

      const Modelo =
        obtenerModelo(
          categoria
        );

      const producto =
        await Modelo.findById(
          productoId
        );

      if (!producto) {
        return res
          .status(404)
          .json({
            error:
              'No se encontró el producto.',
          });
      }

      /*
       * Si no viene lote, usamos el lote
       * anterior para mantener compatibilidad.
       */
      const loteSeleccionado =
        lote ||
        producto.lote ||
        'SIN-LOTE';

      /*
       * ------------------------------------------------
       * PRODUCTOS CON MÚLTIPLES LOTES
       * ------------------------------------------------
       */
      if (
        Array.isArray(
          producto.lotes
        ) &&
        producto.lotes.length > 0
      ) {
        const loteProducto =
          buscarLote(
            producto,
            loteSeleccionado
          );

        if (!loteProducto) {
          return res
            .status(404)
            .json({
              error:
                `No se encontró el lote ${loteSeleccionado} en el producto.`,
            });
        }

        const stockLote =
          Number(
            loteProducto.cantidad ||
              0
          );

        if (
          tipo === 'salida' &&
          stockLote < cantidadMovimiento
        ) {
          return res.status(400).json({
            error:
              `Stock insuficiente en el lote ${loteSeleccionado}. Disponible: ${stockLote} ${producto.unidad || ''}`,
          });
        }

        const actualizacionPallet =
          actualizarPalletMovimiento({
            producto,
            palletId,
            tipo,
            cantidad: cantidadMovimiento,
          });

        if (!actualizacionPallet.ok) {
          return res.status(400).json({
            error: actualizacionPallet.error,
          });
        }

        /*
         * SALIDA
         */
        if (
          tipo === 'salida'
        ) {
          if (
            stockLote <
            cantidadMovimiento
          ) {
            return res
              .status(400)
              .json({
                error:
                  `Stock insuficiente en el lote ${loteSeleccionado}. Disponible: ${stockLote} ${
                    producto.unidad ||
                    ''
                  }`,
              });
          }

          loteProducto.cantidad =
            stockLote -
            cantidadMovimiento;

          /*
           * También actualizamos
           * el stock general.
           */
          producto.cantidad =
            Number(
              producto.cantidad ||
                0
            ) -
            cantidadMovimiento;
        }

        /*
         * ENTRADA
         */
        if (
          tipo === 'entrada'
        ) {
          loteProducto.cantidad =
            stockLote +
            cantidadMovimiento;

          producto.cantidad =
            Number(
              producto.cantidad ||
                0
            ) +
            cantidadMovimiento;
        }

        await producto.save();

        const movimiento =
          await Movement.create({
            productoId:
              producto._id,

            producto:
              producto.nombre,

            categoria,

            lote:
              loteSeleccionado,

            palletId:
              palletId || null,

            ubicacion:
              ubicacion || actualizacionPallet.pallet?.ubicacion || '',

            tipo,

            cantidad:
              cantidadMovimiento,

            unidad:
              producto.unidad ||
              '',

            ...(() => {
              const equivalente = calcularEquivalente(cantidadMovimiento, producto);
              return {
                cantidadEquivalente: equivalente?.cantidad ?? null,
                unidadEquivalente: equivalente?.unidad || '',
                factorConversion: equivalente?.factor ?? null,
              };
            })(),

            motivo:
              motivo || '',

            responsable:
              responsable ||
              'Usuario',
          });

        return res
          .status(201)
          .json({
            mensaje:
              tipo ===
              'entrada'
                ? 'Entrada registrada correctamente.'
                : 'Salida registrada correctamente.',

            movimiento,

            stockActual:
              producto.cantidad,

            stockLote:
              loteProducto.cantidad,

            stockPallet:
              actualizacionPallet.pallet
                ? actualizacionPallet.pallet.cantidad
                : null,

            pallet:
              actualizacionPallet.pallet || null,
          });
      }

      /*
       * ------------------------------------------------
       * PRODUCTOS ANTIGUOS
       * ------------------------------------------------
       */

      const stockActual =
        Number(
          producto.cantidad ||
            0
        );

      if (
        tipo === 'salida' &&
        stockActual <
          cantidadMovimiento
      ) {
        return res
          .status(400)
          .json({
            error:
              `Stock insuficiente. Disponible: ${stockActual} ${
                producto.unidad ||
                ''
              }`,
          });
      }

      actualizarStockGeneral(
        producto,
        tipo,
        cantidadMovimiento
      );

      await producto.save();

      const movimiento =
        await Movement.create({
          productoId:
            producto._id,

          producto:
            producto.nombre,

          categoria,

          lote:
            loteSeleccionado,

          tipo,

          cantidad:
            cantidadMovimiento,

          unidad:
            producto.unidad ||
            '',

          motivo:
            motivo || '',

          responsable:
            responsable ||
            'Usuario',
        });

      return res
        .status(201)
        .json({
          mensaje:
            tipo === 'entrada'
              ? 'Entrada registrada correctamente.'
              : 'Salida registrada correctamente.',

          movimiento,

          stockActual:
            producto.cantidad,
        });
    } catch (error) {
      console.error(
        'Error al registrar movimiento:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error interno al registrar el movimiento.',
        });
    }
  };


/*
 * MOVIMIENTO RAPIDO EN LOTE.
 * Para salidas/consumos distribuye la cantidad entre pallets activos del
 * mismo producto, conservando lote, pallet y ubicación en cada movimiento.
 * Primero valida todas las líneas; recién después persiste los cambios.
 */
movementsController.registerBatch = async (req, res) => {
  const { operaciones = [], motivo = '', responsable = 'Usuario' } = req.body || {};
  if (!Array.isArray(operaciones) || !operaciones.length) {
    return res.status(400).json({ error: 'Agregá al menos una operación.' });
  }
  if (operaciones.length > 100) {
    return res.status(400).json({ error: 'El máximo es 100 operaciones por lote.' });
  }

  try {
    const planes = [];
    const documentos = new Map();

    for (let index = 0; index < operaciones.length; index += 1) {
      const op = operaciones[index];
      const { productoId, categoria, tipo } = op;
      const cantidad = Number(op.cantidad);
      if (!productoId || !['consumables', 'reagents', 'equipment'].includes(categoria) || !['entrada', 'salida', 'consumo'].includes(tipo) || !Number.isFinite(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: `La operación ${index + 1} tiene datos incompletos o inválidos.` });
      }
      if (tipo === 'consumo' && categoria === 'equipment') {
        return res.status(400).json({ error: 'El equipamiento no admite consumo interno.' });
      }
      const Modelo = obtenerModelo(categoria);
      const key = `${categoria}:${productoId}`;
      let producto = documentos.get(key);
      if (!producto) {
        producto = await Modelo.findById(productoId);
        if (!producto) return res.status(404).json({ error: `No se encontró el producto de la operación ${index + 1}.` });
        documentos.set(key, producto);
      }
      // Migración suave de productos antiguos que tenían cantidad/lote sin arreglo de lotes.
      if ((!Array.isArray(producto.lotes) || producto.lotes.length === 0) && Number(producto.cantidad || 0) > 0) {
        producto.lotes = [{ numero: producto.lote || 'SIN-LOTE', cantidad: Number(producto.cantidad || 0), pallets: [] }];
      }

      const unidades = [];
      if (['salida', 'consumo'].includes(tipo)) {
        let restante = cantidad;
        const lotes = Array.isArray(producto.lotes) ? producto.lotes : [];
        // Si el usuario indicó lote, se respeta; si no, se distribuye entre lotes/pallets disponibles.
        const lotesOrdenados = op.lote
          ? lotes.filter(l => String(l.numero) === String(op.lote))
          : lotes.slice();
        if (op.lote && !lotesOrdenados.length) return res.status(404).json({ error: `No existe el lote ${op.lote} de ${producto.nombre}.` });
        for (const lote of lotesOrdenados) {
          const pallets = (lote.pallets || []).filter(p => p.estado !== 'retirado' && Number(p.cantidad || 0) > 0);
          for (const pallet of pallets) {
            if (op.palletId && String(pallet._id) !== String(op.palletId)) continue;
            const yaAsignadoEnLote = unidades.filter(u => u.lote === lote).reduce((sum, u) => sum + u.cantidad, 0);
            const saldoLoteDisponible = Math.max(0, Number(lote.cantidad || 0) - yaAsignadoEnLote);
            const tomar = Math.min(restante, Number(pallet.cantidad || 0), saldoLoteDisponible);
            if (tomar > 0) {
              unidades.push({ lote, pallet, cantidad: tomar });
              restante -= tomar;
            }
            if (restante <= 0) break;
          }
          if (restante <= 0) break;
        }
        // Compatibilidad con productos/lotes sin pallet físico.
        if (restante > 0 && !op.palletId) {
          for (const lote of lotesOrdenados) {
            const yaAsignado = unidades.filter(u => u.lote === lote).reduce((sum, u) => sum + u.cantidad, 0);
            const libre = Math.max(0, Number(lote.cantidad || 0) - yaAsignado);
            const tomar = Math.min(restante, libre);
            if (tomar > 0) {
              unidades.push({ lote, pallet: null, cantidad: tomar });
              restante -= tomar;
            }
            if (restante <= 0) break;
          }
        }
        if (restante > 0) return res.status(400).json({ error: `Stock insuficiente de ${producto.nombre}. Faltan ${restante} ${producto.unidad || ''}.` });
      } else {
        // Ingreso: asignar al lote solicitado; si no existe, crear uno nuevo.
        const numeroLoteIngreso = op.lote || `ING-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
        let lote = (producto.lotes || []).find(l => String(l.numero) === String(numeroLoteIngreso));
        if (!lote) {
          lote = { numero: numeroLoteIngreso, cantidad: 0, pallets: [] };
          producto.lotes = producto.lotes || [];
          producto.lotes.push(lote);
          lote = producto.lotes[producto.lotes.length - 1];
        }
        let pallet = op.palletId ? (lote.pallets || []).id(op.palletId) : null;
        if (op.palletId && !pallet) return res.status(404).json({ error: `No se encontró el pallet indicado para ${producto.nombre}.` });
        unidades.push({ lote, pallet, cantidad });
      }

      // Planificar las cantidades de lote y producto sin guardar aún.
      for (const unidad of unidades) {
        if (unidad.lote) {
          unidad.lote.cantidad = Number(unidad.lote.cantidad || 0) + (tipo === 'entrada' ? unidad.cantidad : -unidad.cantidad);
        }
        if (unidad.pallet) {
          unidad.pallet.cantidad = Number(unidad.pallet.cantidad || 0) + (tipo === 'entrada' ? unidad.cantidad : -unidad.cantidad);
          unidad.pallet.estado = unidad.pallet.cantidad <= 0 ? 'retirado' : 'activo';
        }
        planes.push({ producto, categoria, tipo, lote: unidad.lote, pallet: unidad.pallet, cantidad: unidad.cantidad, motivo: op.motivo || motivo, responsable });
      }
      producto.cantidad = Math.max(0, Number(producto.cantidad || 0) + (tipo === 'entrada' ? cantidad : -cantidad));
    }

    // Persistir una vez por producto y generar una línea histórica por pallet/lote afectado.
    for (const producto of documentos.values()) await producto.save();
    const movimientos = await Movement.insertMany(planes.map(plan => {
      const equivalente = calcularEquivalente(plan.cantidad, plan.producto);
      return {
        productoId: plan.producto._id,
        producto: plan.producto.nombre,
        categoria: plan.categoria,
        lote: plan.lote?.numero || 'SIN-LOTE',
        palletId: plan.pallet?._id || null,
        ubicacion: plan.pallet?.ubicacion || plan.lote?.ubicacion || '',
        tipo: plan.tipo,
        cantidad: plan.cantidad,
        unidad: plan.producto.unidad || '',
        cantidadEquivalente: equivalente?.cantidad ?? null,
        unidadEquivalente: equivalente?.unidad || '',
        factorConversion: equivalente?.factor ?? null,
        motivo: plan.motivo || '',
        responsable: plan.responsable || 'Usuario',
      };
    }));
    return res.status(201).json({ mensaje: 'Operaciones registradas.', operaciones: movimientos.length, movimientos, productosActualizados: documentos.size });
  } catch (error) {
    console.error('Error en movimiento rápido:', error);
    return res.status(500).json({ error: 'No se pudo completar el movimiento rápido.' });
  }
};

/*
 * REGISTRAR CONSUMO
 */
movementsController.registerConsumption =
  async (req, res) => {
    const {
      productoId,
      categoria,
      cantidad,
      motivo,
      responsable,
      lote,
      palletId,
      ubicacion,
    } = req.body;

    try {
      if (
        !productoId ||
        !categoria ||
        !cantidad
      ) {
        return res
          .status(400)
          .json({
            error:
              'Faltan datos para registrar el consumo.',
          });
      }

      if (
        ![
          'reagents',
          'consumables',
        ].includes(
          categoria
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              'Los consumos solo pueden registrarse para productos químicos o consumibles.',
          });
      }

      const cantidadConsumo =
        Number(cantidad);

      if (
        !Number.isFinite(
          cantidadConsumo
        ) ||
        cantidadConsumo <= 0
      ) {
        return res
          .status(400)
          .json({
            error:
              'La cantidad debe ser mayor a cero.',
          });
      }

      const Modelo =
        obtenerModelo(
          categoria
        );

      const producto =
        await Modelo.findById(
          productoId
        );

      if (!producto) {
        return res
          .status(404)
          .json({
            error:
              'No se encontró el producto.',
          });
      }

      const loteSeleccionado =
        lote ||
        producto.lote ||
        'SIN-LOTE';

      /*
       * ------------------------------------------------
       * PRODUCTOS CON MÚLTIPLES LOTES
       * ------------------------------------------------
       */

      if (
        Array.isArray(
          producto.lotes
        ) &&
        producto.lotes.length > 0
      ) {
        const loteProducto =
          buscarLote(
            producto,
            loteSeleccionado
          );

        if (!loteProducto) {
          return res
            .status(404)
            .json({
              error:
                `No se encontró el lote ${loteSeleccionado} en el producto.`,
            });
        }

        const stockLote =
          Number(
            loteProducto.cantidad ||
              0
          );

        if (stockLote < cantidadConsumo) {
          return res.status(400).json({
            error:
              `Stock insuficiente en el lote ${loteSeleccionado}. Disponible: ${stockLote} ${producto.unidad || ''}`,
          });
        }

        const actualizacionPallet =
          actualizarPalletMovimiento({
            producto,
            palletId,
            tipo: 'consumo',
            cantidad: cantidadConsumo,
          });

        if (!actualizacionPallet.ok) {
          return res.status(400).json({
            error: actualizacionPallet.error,
          });
        }

        if (
          stockLote <
          cantidadConsumo
        ) {
          return res
            .status(400)
            .json({
              error:
                `Stock insuficiente en el lote ${loteSeleccionado}. Disponible: ${stockLote} ${
                  producto.unidad ||
                  ''
                }`,
            });
        }

        loteProducto.cantidad =
          stockLote -
          cantidadConsumo;

        producto.cantidad =
          Number(
            producto.cantidad ||
              0
          ) -
          cantidadConsumo;

        await producto.save();

        const movimiento =
          await Movement.create({
            productoId:
              producto._id,

            producto:
              producto.nombre,

            categoria,

            lote:
              loteSeleccionado,

            palletId:
              palletId || null,

            ubicacion:
              ubicacion || actualizacionPallet.pallet?.ubicacion || '',

            tipo: 'consumo',

            cantidad:
              cantidadConsumo,

            unidad:
              producto.unidad ||
              '',

            ...(() => {
              const equivalente = calcularEquivalente(cantidadConsumo, producto);
              return {
                cantidadEquivalente: equivalente?.cantidad ?? null,
                unidadEquivalente: equivalente?.unidad || '',
                factorConversion: equivalente?.factor ?? null,
              };
            })(),

            motivo:
              motivo || '',

            responsable:
              responsable ||
              'Usuario',
          });

        return res
          .status(201)
          .json({
            mensaje:
              'Consumo registrado correctamente.',

            movimiento,

            stockActual:
              producto.cantidad,

            stockLote:
              loteProducto.cantidad,

            stockPallet:
              actualizacionPallet.pallet
                ? actualizacionPallet.pallet.cantidad
                : null,

            pallet:
              actualizacionPallet.pallet || null,
          });
      }

      /*
       * ------------------------------------------------
       * PRODUCTOS ANTIGUOS
       * ------------------------------------------------
       */

      if (
        Number(
          producto.cantidad ||
            0
        ) <
        cantidadConsumo
      ) {
        return res
          .status(400)
          .json({
            error:
              `Stock insuficiente. Disponible: ${producto.cantidad} ${
                producto.unidad ||
                ''
              }`,
          });
      }

      producto.cantidad =
        Number(
          producto.cantidad || 0
        ) -
        cantidadConsumo;

      await producto.save();

      const movimiento =
        await Movement.create({
          productoId:
            producto._id,

          producto:
            producto.nombre,

          categoria,

          lote:
            loteSeleccionado,

          tipo: 'consumo',

          cantidad:
            cantidadConsumo,

          unidad:
            producto.unidad ||
            '',

          motivo:
            motivo || '',

          responsable:
            responsable ||
            'Usuario',
        });

      return res
        .status(201)
        .json({
          mensaje:
            'Consumo registrado correctamente.',

          movimiento,

          stockActual:
            producto.cantidad,
        });
    } catch (error) {
      console.error(
        'Error al registrar consumo:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error interno al registrar el consumo.',
        });
    }
  };

/*
 * HISTORIAL
 */
movementsController.getMovements =
  async (req, res) => {
    try {
      const movements =
        await Movement.find()
          .sort({
            fecha: -1,
          });

      return res
        .status(200)
        .json(movements);
    } catch (error) {
      console.error(
        'Error al obtener movimientos:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Error al obtener el historial de movimientos.',
        });
    }
  };


/*
 * CIERRE DIARIO
 *
 * El stock ya se actualiza en cada retiro/entrada.
 * El cierre consolida lo ocurrido durante la jornada y
 * guarda el saldo final como fotografía de control.
 */
const fechaKeyArgentina = (fecha = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Cordoba',
  }).format(fecha);

const rangoDiaArgentina = (dateKey) => ({
  desde: new Date(`${dateKey}T00:00:00-03:00`),
  hasta: new Date(`${dateKey}T23:59:59.999-03:00`),
});

movementsController.getTodayClosure = async (req, res) => {
  try {
    const dateKey = fechaKeyArgentina();
    const existente = await DailyClosure.findOne({ dateKey }).lean();

    if (existente) {
      return res.status(200).json({
        cerrado: true,
        ...existente,
      });
    }

    const { desde, hasta } = rangoDiaArgentina(dateKey);
    const movimientos = await Movement.find({
      fecha: { $gte: desde, $lte: hasta },
    }).sort({ fecha: 1 }).lean();

    const resumen = movimientos.reduce((acc, m) => {
      const cantidad = Number(m.cantidad || 0);
      const tipoKey =
        m.tipo === 'entrada'
          ? 'entradas'
          : m.tipo === 'salida'
            ? 'salidas'
            : 'consumos';

      acc[tipoKey] += 1;

      const unidad = String(m.unidad || 'unidad').trim() || 'unidad';
      if (!acc.totalesPorUnidad[unidad]) {
        acc.totalesPorUnidad[unidad] = {
          entradas: 0,
          salidas: 0,
          consumos: 0,
        };
      }

      acc.totalesPorUnidad[unidad][tipoKey] += cantidad;
      return acc;
    }, {
      entradas: 0,
      salidas: 0,
      consumos: 0,
      totalesPorUnidad: {},
    });

    return res.status(200).json({
      cerrado: false,
      dateKey,
      movimientos: movimientos.length,
      resumen,
    });
  } catch (error) {
    console.error('Error obteniendo cierre diario:', error);
    return res.status(500).json({
      error: 'No se pudo obtener el resumen del día.',
    });
  }
};

movementsController.closeToday = async (req, res) => {
  try {
    const dateKey = fechaKeyArgentina();
    const existente = await DailyClosure.findOne({ dateKey }).lean();

    if (existente) {
      return res.status(409).json({
        error: 'La jornada de hoy ya fue cerrada.',
        cierre: existente,
      });
    }

    const { desde, hasta } = rangoDiaArgentina(dateKey);
    const movimientos = await Movement.find({
      fecha: { $gte: desde, $lte: hasta },
    }).sort({ fecha: 1 }).lean();

    const resumen = movimientos.reduce((acc, m) => {
      const cantidad = Number(m.cantidad || 0);
      const tipoKey =
        m.tipo === 'entrada'
          ? 'entradas'
          : m.tipo === 'salida'
            ? 'salidas'
            : 'consumos';

      acc[tipoKey] += 1;

      const unidad = String(m.unidad || 'unidad').trim() || 'unidad';
      if (!acc.totalesPorUnidad[unidad]) {
        acc.totalesPorUnidad[unidad] = {
          entradas: 0,
          salidas: 0,
          consumos: 0,
        };
      }

      acc.totalesPorUnidad[unidad][tipoKey] += cantidad;
      return acc;
    }, {
      entradas: 0,
      salidas: 0,
      consumos: 0,
      totalesPorUnidad: {},
    });

    const porProducto = new Map();
    movimientos.forEach((m) => {
      const key = String(m.productoId);
      if (!porProducto.has(key)) {
        porProducto.set(key, {
          productoId: m.productoId,
          producto: m.producto,
          categoria: m.categoria,
          entradas: 0,
          salidas: 0,
          consumos: 0,
          unidad: m.unidad || '',
        });
      }

      const fila = porProducto.get(key);
      fila[m.tipo === 'entrada' ? 'entradas' : m.tipo === 'salida' ? 'salidas' : 'consumos'] += Number(m.cantidad || 0);
    });

    const productos = [];
    for (const fila of porProducto.values()) {
      const Model = obtenerModelo(fila.categoria);
      const producto = Model ? await Model.findById(fila.productoId).lean() : null;

      const saldoFinal = Number(producto?.cantidad || 0);
      const saldoInicial =
        saldoFinal -
        Number(fila.entradas || 0) +
        Number(fila.salidas || 0) +
        Number(fila.consumos || 0);

      productos.push({
        ...fila,
        saldoInicial,
        saldoFinal,
      });
    }

    const cierre = await DailyClosure.create({
      dateKey,
      fechaCierre: new Date(),
      responsable: String(req.body?.responsable || 'Usuario'),
      resumen,
      movimientos: movimientos.length,
      productos,
    });

    return res.status(201).json({
      cerrado: true,
      cierre,
    });
  } catch (error) {
    console.error('Error cerrando jornada:', error);
    return res.status(500).json({
      error: 'No se pudo cerrar la jornada.',
    });
  }
};

module.exports =
  movementsController;
