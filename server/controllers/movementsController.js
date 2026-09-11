const Movement = require('../models/movementsModel');
const models = require('../models/itemsModels');

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
              tipo ===
              'entrada'
                ? 'Entrada registrada correctamente.'
                : 'Salida registrada correctamente.',

            movimiento,

            stockActual:
              producto.cantidad,

            stockLote:
              loteProducto.cantidad,
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

            stockLote:
              loteProducto.cantidad,
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

module.exports =
  movementsController;
