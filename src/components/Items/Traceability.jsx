import React, { useMemo, useState } from 'react';
import {
  Input,
  Select,
  Table,
  Tag,
  Spin,
  Alert,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';

import {
  useObtenerMovimientosQuery,
} from '../../services/movements';

import {
  useGetConsumablesQuery,
  useGetReagentsQuery,
} from '../../services/items';

const { Option } = Select;

const Traceability = () => {
  const {
    data: movimientos = [],
    isLoading: loadingMovimientos,
    isError: errorMovimientos,
  } = useObtenerMovimientosQuery();

  const {
    data: consumables = [],
    isLoading: loadingConsumables,
    isError: errorConsumables,
  } = useGetConsumablesQuery();

  const {
    data: reagents = [],
    isLoading: loadingReagents,
    isError: errorReagents,
  } = useGetReagentsQuery();

  const [busqueda, setBusqueda] = useState('');
  const [loteSeleccionado, setLoteSeleccionado] = useState('');

  const cargando =
    loadingMovimientos ||
    loadingConsumables ||
    loadingReagents;

  const hayError =
    errorMovimientos ||
    errorConsumables ||
    errorReagents;

  /*
   * Armamos una lista única de productos.
   * Cada producto puede tener un lote.
   */
  const productos = useMemo(() => {
    const consumiblesSeguros = Array.isArray(consumables) ? consumables : [];
    const reagentesSeguros = Array.isArray(reagents) ? reagents : [];
    return [
      ...consumiblesSeguros.map((item) => ({
        ...item,
        categoriaNombre: 'Consumibles',
        categoria: 'consumables',
      })),

      ...reagentesSeguros.map((item) => ({
        ...item,
        categoriaNombre: 'Productos químicos',
        categoria: 'reagents',
      })),
    ];
  }, [consumables, reagents]);

  /*
   * Generamos las opciones de producto + lote
   * usando los movimientos registrados.
   */
  const lotesDisponibles = useMemo(() => {
    const mapa = new Map();

    const movimientosSeguros = Array.isArray(movimientos) ? movimientos : [];

    movimientosSeguros.forEach((movimiento) => {
      const lote = movimiento.lote || 'SIN-LOTE';

      const clave =
        `${movimiento.productoId}-${lote}`;

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          productoId: movimiento.productoId,
          producto: movimiento.producto,
          lote,
          categoria: movimiento.categoria,
        });
      }
    });

    /*
     * También agregamos productos que todavía
     * no tienen movimientos.
     */
    productos.forEach((producto) => {
      const lote = producto.lote || 'SIN-LOTE';

      const clave =
        `${producto._id}-${lote}`;

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          clave,
          productoId: producto._id,
          producto: producto.nombre,
          lote,
          categoria: producto.categoria,
        });
      }
    });

    return Array.from(mapa.values()).sort(
      (a, b) =>
        `${a.producto} ${a.lote}`.localeCompare(
          `${b.producto} ${b.lote}`
        )
    );
  }, [movimientos, productos]);

  /*
   * Filtrado de las opciones del selector.
   */
  const opcionesFiltradas = useMemo(() => {
    const texto = busqueda
      .toLowerCase()
      .trim();

    if (!texto) {
      return lotesDisponibles;
    }

    return lotesDisponibles.filter((item) =>
      `${item.producto} ${item.lote}`
        .toLowerCase()
        .includes(texto)
    );
  }, [lotesDisponibles, busqueda]);

  /*
   * Encontramos el producto/lote seleccionado.
   */
  const loteActual = useMemo(() => {
    return lotesDisponibles.find(
      (item) =>
        item.clave === loteSeleccionado
    );
  }, [lotesDisponibles, loteSeleccionado]);

  /*
   * Movimientos exclusivamente del lote seleccionado.
   */
  const movimientosLote = useMemo(() => {
    if (!loteActual) {
      return [];
    }

    const movimientosSeguros = Array.isArray(movimientos) ? movimientos : [];

    return movimientosSeguros.filter(
      (movimiento) => {
        const lote =
          movimiento.lote || 'SIN-LOTE';

        return (
          String(movimiento.productoId) ===
            String(loteActual.productoId) &&
          lote === loteActual.lote
        );
      }
    );
  }, [
    movimientos,
    loteActual,
  ]);

  /*
   * Buscamos el producto actual para conocer
   * el stock que tiene actualmente.
   */
  const productoActual = useMemo(() => {
    if (!loteActual) {
      return null;
    }

    return productos.find(
      (producto) =>
        String(producto._id) ===
          String(loteActual.productoId) &&
        (producto.lote || 'SIN-LOTE') ===
          loteActual.lote
    );
  }, [
    productos,
    loteActual,
  ]);

  /*
   * Calculamos estadísticas del lote.
   */
  const estadisticas = useMemo(() => {
    let entradas = 0;
    let salidas = 0;
    let consumos = 0;

    (Array.isArray(movimientosLote) ? movimientosLote : []).forEach(
      (movimiento) => {
        const cantidad =
          Number(movimiento.cantidad) || 0;

        if (
          movimiento.tipo === 'entrada'
        ) {
          entradas += cantidad;
        }

        if (
          movimiento.tipo === 'salida'
        ) {
          salidas += cantidad;
        }

        if (
          movimiento.tipo === 'consumo'
        ) {
          consumos += cantidad;
        }
      }
    );

    const fechas = movimientosLote
      .map((movimiento) =>
        movimiento.fecha
          ? new Date(movimiento.fecha)
          : null
      )
      .filter(Boolean)
      .sort((a, b) => a - b);

    return {
      entradas,
      salidas,
      consumos,
      movimientos:
        movimientosLote.length,

      primeraFecha:
        fechas.length > 0
          ? fechas[0]
          : null,

      ultimaFecha:
        fechas.length > 0
          ? fechas[fechas.length - 1]
          : null,
    };
  }, [movimientosLote]);

  /*
   * Columnas de la tabla.
   */
  const columnas = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha) =>
        fecha
          ? new Date(
              fecha
            ).toLocaleString('es-AR')
          : '-',
    },

    {
      title: 'Movimiento',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (tipo) => {
        if (tipo === 'entrada') {
          return (
            <Tag color="green">
              📥 Entrada
            </Tag>
          );
        }

        if (tipo === 'salida') {
          return (
            <Tag color="orange">
              📤 Salida
            </Tag>
          );
        }

        if (tipo === 'consumo') {
          return (
            <Tag color="blue">
              🧪 Consumo
            </Tag>
          );
        }

        return <Tag>{tipo}</Tag>;
      },
    },

    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      render: (
        cantidad,
        movimiento
      ) =>
        `${cantidad ?? 0} ${
          movimiento.unidad || ''
        }`,
    },

    {
      title: 'Motivo',
      dataIndex: 'motivo',
      key: 'motivo',
      render: (motivo) =>
        motivo || '-',
    },

    {
      title: 'Responsable',
      dataIndex: 'responsable',
      key: 'responsable',
      render: (responsable) =>
        responsable || '-',
    },
  ];

  if (cargando) {
    return <Spin />;
  }

  if (hayError) {
    return (
      <Alert
        message="Error"
        description="No se pudo cargar la información de trazabilidad."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div
      style={{
        width: '95%',
        margin: '20px auto',
      }}
    >
      <h2>
        🔍 Trazabilidad por lote
      </h2>

      <p>
        Seleccioná un producto y lote para
        consultar toda su trazabilidad.
      </p>

      {/* BUSCADOR */}
      <Card
        style={{
          marginBottom: '20px',
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Input
              placeholder="🔎 Buscar producto o lote..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
              allowClear
            />
          </Col>

          <Col xs={24} md={14}>
            <Select
              showSearch
              value={
                loteSeleccionado ||
                undefined
              }
              onChange={
                setLoteSeleccionado
              }
              placeholder="Seleccionar producto y lote"
              style={{
                width: '100%',
              }}
              optionFilterProp="children"
              allowClear
              onClear={() =>
                setLoteSeleccionado('')
              }
            >
              {opcionesFiltradas.map(
                (item) => (
                  <Option
                    key={item.clave}
                    value={item.clave}
                  >
                    {item.producto} — Lote:{' '}
                    {item.lote}
                  </Option>
                )
              )}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* SIN SELECCIÓN */}
      {!loteActual && (
        <Alert
          message="Seleccioná un producto y lote"
          description="Elegí un producto de la lista para consultar su historial y estado actual."
          type="info"
          showIcon
        />
      )}

      {/* INFORMACIÓN DEL LOTE */}
      {loteActual && (
        <>
          <Card
            title="📦 Información del lote"
            style={{
              marginBottom: '20px',
            }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Producto:
                  </strong>
                  <br />
                  {loteActual.producto}
                </p>
              </Col>

              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Lote:
                  </strong>
                  <br />
                  <Tag color="blue">
                    {loteActual.lote}
                  </Tag>
                </p>
              </Col>

              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Categoría:
                  </strong>
                  <br />
                  {productoActual?.categoriaNombre ||
                    loteActual.categoria}
                </p>
              </Col>

              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Proveedor:
                  </strong>
                  <br />
                  {productoActual?.proveedor ||
                    'No especificado'}
                </p>
              </Col>

              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Ubicación:
                  </strong>
                  <br />
                  {productoActual?.ubicacion ||
                    'No especificada'}
                </p>
              </Col>

              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Vencimiento:
                  </strong>
                  <br />
                  {productoActual?.vencimiento ||
                    'Sin fecha'}
                </p>
              </Col>
            </Row>
          </Card>

          {/* ESTADÍSTICAS */}
          <Row
            gutter={[16, 16]}
            style={{
              marginBottom: '20px',
            }}
          >
            <Col
              xs={24}
              sm={12}
              lg={6}
            >
              <Card>
                <Statistic
                  title="Stock actual"
                  value={
                    productoActual?.cantidad ??
                    0
                  }
                  suffix={
                    productoActual?.unidad ||
                    ''
                  }
                />
              </Card>
            </Col>

            <Col
              xs={24}
              sm={12}
              lg={6}
            >
              <Card>
                <Statistic
                  title="Total entradas"
                  value={
                    estadisticas.entradas
                  }
                  suffix={
                    productoActual?.unidad ||
                    ''
                  }
                />
              </Card>
            </Col>

            <Col
              xs={24}
              sm={12}
              lg={6}
            >
              <Card>
                <Statistic
                  title="Total salidas"
                  value={
                    estadisticas.salidas
                  }
                  suffix={
                    productoActual?.unidad ||
                    ''
                  }
                />
              </Card>
            </Col>

            <Col
              xs={24}
              sm={12}
              lg={6}
            >
              <Card>
                <Statistic
                  title="Total consumido"
                  value={
                    estadisticas.consumos
                  }
                  suffix={
                    productoActual?.unidad ||
                    ''
                  }
                />
              </Card>
            </Col>
          </Row>

          {/* DATOS TEMPORALES */}
          <Card
            title="🕐 Información temporal"
            style={{
              marginBottom: '20px',
            }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Movimientos registrados:
                  </strong>
                  <br />
                  {estadisticas.movimientos}
                </p>
              </Col>

              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Primer movimiento:
                  </strong>
                  <br />
                  {estadisticas.primeraFecha
                    ? estadisticas.primeraFecha.toLocaleString(
                        'es-AR'
                      )
                    : 'Sin movimientos'}
                </p>
              </Col>

              <Col xs={24} md={8}>
                <p>
                  <strong>
                    Último movimiento:
                  </strong>
                  <br />
                  {estadisticas.ultimaFecha
                    ? estadisticas.ultimaFecha.toLocaleString(
                        'es-AR'
                      )
                    : 'Sin movimientos'}
                </p>
              </Col>
            </Row>
          </Card>

          {/* HISTORIAL */}
          <Card title="📋 Historial del lote">
            {movimientosLote.length === 0 ? (
              <Alert
                message="Sin movimientos"
                description="Este producto/lote todavía no tiene movimientos registrados."
                type="info"
                showIcon
              />
            ) : (
              <Table
                columns={columnas}
                dataSource={movimientosLote.map(
                  (movimiento) => ({
                    ...movimiento,
                    key:
                      movimiento._id,
                  })
                )}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                }}
                scroll={{
                  x: 900,
                }}
                locale={{
                  emptyText:
                    'No hay movimientos registrados.',
                }}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Traceability;