import React, { useMemo, useState } from 'react';
import { Table, Spin, Tag, Alert, Input, Select, DatePicker } from 'antd';

import { useObtenerMovimientosQuery } from '../../services/movements';

const { Option } = Select;
const { RangePicker } = DatePicker;

const MovementsHistory = () => {
  const {
    data: movimientos,
    isLoading,
    isError,
  } = useObtenerMovimientosQuery();

  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [fechas, setFechas] = useState(null);

  const movimientosFiltrados = useMemo(() => {
    let resultado = movimientos || [];

    // ==============================
    // BÚSQUEDA
    // ==============================

    const texto = busqueda.toLowerCase().trim();

    if (texto) {
      resultado = resultado.filter((movimiento) => {
        const campos = [
          movimiento.producto,
          movimiento.lote,
          movimiento.motivo,
          movimiento.responsable,
          movimiento.categoria,
          movimiento.tipo,
          movimiento.cantidad,
          movimiento.unidad,
        ];

        return campos.some((campo) =>
          String(campo || '')
            .toLowerCase()
            .includes(texto)
        );
      });
    }

    // ==============================
    // FILTRO POR TIPO
    // ==============================

    if (tipoFiltro !== 'todos') {
      resultado = resultado.filter(
        (movimiento) =>
          movimiento.tipo === tipoFiltro
      );
    }

    // ==============================
    // FILTRO POR FECHA
    // ==============================

    if (fechas && fechas.length === 2) {
      const fechaDesde = fechas[0]
        .startOf('day')
        .toDate();

      const fechaHasta = fechas[1]
        .endOf('day')
        .toDate();

      resultado = resultado.filter((movimiento) => {
        const fechaMovimiento = new Date(
          movimiento.fecha
        );

        return (
          fechaMovimiento >= fechaDesde &&
          fechaMovimiento <= fechaHasta
        );
      });
    }

    return resultado;
  }, [movimientos, busqueda, tipoFiltro, fechas]);

  if (isLoading) {
    return <Spin />;
  }

  if (isError) {
    return (
      <Alert
        message="Error"
        description="No se pudo cargar el historial de movimientos."
        type="error"
        showIcon
      />
    );
  }

  const columnas = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha) =>
        fecha
          ? new Date(fecha).toLocaleString('es-AR')
          : '-',
    },

    {
      title: 'Producto',
      dataIndex: 'producto',
      key: 'producto',
    },

    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      render: (categoria) => {
        if (categoria === 'reagents') {
          return 'Productos químicos';
        }

        if (categoria === 'consumables') {
          return 'Semillas';
        }

        if (categoria === 'equipment') {
          return 'Equipamiento';
        }

        return categoria || '-';
      },
    },

    {
      title: 'Lote',
      dataIndex: 'lote',
      key: 'lote',
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
      render: (cantidad, movimiento) =>
        `${cantidad ?? 0} ${
          movimiento.unidad || ''
        }`,
    },

    {
      title: 'Motivo',
      dataIndex: 'motivo',
      key: 'motivo',
    },

    {
      title: 'Responsable',
      dataIndex: 'responsable',
      key: 'responsable',
    },
  ];

  return (
    <div
      style={{
        width: '95%',
        margin: '20px auto',
      }}
    >
      <h2>📋 Historial de movimientos</h2>

      {/* ============================== */}
      {/* FILTROS */}
      {/* ============================== */}

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >

        <Input
          placeholder="Buscar producto, lote, motivo..."
          value={busqueda}
          onChange={(e) =>
            setBusqueda(e.target.value)
          }
          allowClear
          style={{
            width: '300px',
          }}
        />

        <Select
          value={tipoFiltro}
          onChange={setTipoFiltro}
          style={{
            width: '180px',
          }}
        >
          <Option value="todos">
            Todos los movimientos
          </Option>

          <Option value="entrada">
            📥 Entradas
          </Option>

          <Option value="salida">
            📤 Salidas
          </Option>

          <Option value="consumo">
            🧪 Consumos
          </Option>
        </Select>

        <RangePicker
          onChange={setFechas}
          format="DD/MM/YYYY"
          placeholder={[
            'Fecha desde',
            'Fecha hasta',
          ]}
        />

      </div>

      {/* ============================== */}
      {/* TABLA */}
      {/* ============================== */}

      <Table
        columns={columnas}
        dataSource={movimientosFiltrados.map(
          (movimiento) => ({
            ...movimiento,
            key: movimiento._id,
          })
        )}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
        }}
        scroll={{
          x: 1100,
        }}
        locale={{
          emptyText:
            'No hay movimientos que coincidan con los filtros.',
        }}
      />

    </div>
  );
};

export default MovementsHistory;