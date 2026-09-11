import React, { useMemo, useState } from 'react';
import {
  Alert,
  Card,
  Tag,
  Select,
  Spin,
} from 'antd';

import {
  useGetConsumablesQuery,
  useGetReagentsQuery,
} from '../../services/items';

const { Option } = Select;

const Alerts = () => {
  const {
    data: consumables,
    isLoading: loadingConsumables,
  } = useGetConsumablesQuery();

  const {
    data: reagents,
    isLoading: loadingReagents,
  } = useGetReagentsQuery();

  const [filtro, setFiltro] = useState('todos');

  const cargando =
    loadingConsumables || loadingReagents;

  const alertas = useMemo(() => {
    const productos = [
      ...(consumables || []).map((item) => ({
        ...item,
        categoriaNombre: 'Consumibles',
      })),

      ...(reagents || []).map((item) => ({
        ...item,
        categoriaNombre: 'Productos químicos',
      })),
    ];

    const resultado = [];

    productos.forEach((item) => {
      const stockActual = Number(
        item.cantidad ?? 0
      );

      const stockMinimo = Number(
        item.stockMinimo ?? 10
      );

      // ==============================
      // ALERTA DE STOCK
      // ==============================

      if (stockActual <= stockMinimo) {
        resultado.push({
          id: `${item._id}-stock`,
          tipo: 'stock',
          prioridad: 1,
          titulo: 'Stock bajo',
          producto: item.nombre,
          detalle: `${stockActual} ${
            item.unidad || ''
          } disponibles. Mínimo: ${stockMinimo} ${
            item.unidad || ''
          }`,
          color: 'red',
          icono: '📦',
          categoria: item.categoriaNombre,
          lote: item.lote,
          ubicacion: item.ubicacion,
        });
      }

      // ==============================
      // ALERTA DE VENCIMIENTO
      // ==============================

      if (item.vencimiento) {
        const fechaVencimiento = new Date(
          `${item.vencimiento}T23:59:59`
        );

        const hoy = new Date();

        const diferencia =
          fechaVencimiento.getTime() -
          hoy.getTime();

        const diasRestantes = Math.ceil(
          diferencia /
            (1000 * 60 * 60 * 24)
        );

        // VENCIDO
        if (diasRestantes < 0) {
          resultado.push({
            id: `${item._id}-vencido`,
            tipo: 'vencido',
            prioridad: 1,
            titulo: 'Producto vencido',
            producto: item.nombre,
            detalle: `Venció el ${item.vencimiento}`,
            color: 'red',
            icono: '☠️',
            categoria: item.categoriaNombre,
            lote: item.lote,
            ubicacion: item.ubicacion,
          });
        }

        // PRÓXIMO A VENCER
        else if (diasRestantes <= 30) {
          resultado.push({
            id: `${item._id}-proximo`,
            tipo: 'proximo',
            prioridad: 2,
            titulo: 'Próximo a vencer',
            producto: item.nombre,
            detalle: `Vence en ${diasRestantes} días (${item.vencimiento})`,
            color: 'orange',
            icono: '⏳',
            categoria: item.categoriaNombre,
            lote: item.lote,
            ubicacion: item.ubicacion,
          });
        }
      }
    });

    return resultado.sort(
      (a, b) =>
        a.prioridad - b.prioridad
    );
  }, [consumables, reagents]);

  const alertasFiltradas =
    filtro === 'todos'
      ? alertas
      : alertas.filter(
          (alerta) =>
            alerta.tipo === filtro
        );

  if (cargando) {
    return <Spin />;
  }

  return (
    <div
      style={{
        width: '95%',
        margin: '20px auto',
      }}
    >
      <h2>🚨 Alertas del inventario</h2>

      <Select
        value={filtro}
        onChange={setFiltro}
        style={{
          width: '250px',
          marginBottom: '20px',
        }}
      >
        <Option value="todos">
          Todas las alertas
        </Option>

        <Option value="stock">
          📦 Stock bajo
        </Option>

        <Option value="vencido">
          ☠️ Productos vencidos
        </Option>

        <Option value="proximo">
          ⏳ Próximos a vencer
        </Option>
      </Select>

      {alertasFiltradas.length === 0 ? (
        <Alert
          message="Todo en orden"
          description="No hay alertas en este momento."
          type="success"
          showIcon
        />
      ) : (
        alertasFiltradas.map((alerta) => (
          <Card
            key={alerta.id}
            style={{
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                }}
              >
                {alerta.icono}{' '}
                {alerta.producto}
              </h3>

              <Tag color={alerta.color}>
                {alerta.titulo}
              </Tag>
            </div>

            <p>
              <strong>
                {alerta.detalle}
              </strong>
            </p>

            <p>
              <strong>
                Categoría:
              </strong>{' '}
              {alerta.categoria}
            </p>

            <p>
              <strong>
                Lote:
              </strong>{' '}
              {alerta.lote ||
                'Sin lote'}
            </p>

            <p>
              <strong>
                Ubicación:
              </strong>{' '}
              {alerta.ubicacion ||
                'Sin ubicación'}
            </p>
          </Card>
        ))
      )}
    </div>
  );
};

export default Alerts;

