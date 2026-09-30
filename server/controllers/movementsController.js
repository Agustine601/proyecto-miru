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
