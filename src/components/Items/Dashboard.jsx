import React, { useMemo } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Tag,
  Spin,
  Alert,
} from 'antd';

import {
  DatabaseOutlined,
  ExperimentOutlined,
  PaperClipOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';

import {
  useGetConsumablesQuery,
  useGetReagentsQuery,
} from '../../services/items';

const Dashboard = () => {
  const {
    data: consumables = [],
    isLoading: loadingConsumables,
  } = useGetConsumablesQuery();

  const {
    data: reagents = [],
    isLoading: loadingReagents,
  } = useGetReagentsQuery();

  const cargando =
    loadingConsumables || loadingReagents;

  const estadisticas = useMemo(() => {
    const productos = [
      ...consumables,
      ...reagents,
    ];

    let stockBajo = 0;
    let vencidos = 0;
    let proximosAVencer = 0;

    productos.forEach((item) => {
      const stockActual = Number(
        item.cantidad ?? 0
      );

      const stockMinimo = Number(
        item.stockMinimo ?? 10
      );

      // STOCK BAJO

      if (stockActual <= stockMinimo) {
        stockBajo++;
      }

      // VENCIMIENTO

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

        if (diasRestantes < 0) {
          vencidos++;
        } else if (
          diasRestantes <= 30
        ) {
          proximosAVencer++;
        }
      }
    });

    return {
      total: productos.length,
      consumibles: consumables.length,
      reagentes: reagents.length,
      stockBajo,
      vencidos,
      proximosAVencer,
    };
  }, [consumables, reagents]);

  if (cargando) {
    return <Spin />;
  }

  return (
    <div
      style={{
        width: '95%',
        margin: '25px auto',
      }}
    >
      <h1>
        📊 Panel principal
      </h1>

      <p>
        Resumen general del inventario
      </p>

      <Row
        gutter={[
          16,
          16,
        ]}
      >

        {/* TOTAL */}

        <Col
          xs={24}
          sm={12}
          lg={8}
        >
          <Card>
            <Statistic
              title="Total de productos"
              value={estadisticas.total}
              prefix={
                <DatabaseOutlined />
              }
            />
          </Card>
        </Col>

        {/* REACTIVOS */}

        <Col
          xs={24}
          sm={12}
          lg={8}
        >
          <Card>
            <Statistic
              title="Productos químicos"
              value={estadisticas.reagentes}
              prefix={
                <ExperimentOutlined />
              }
            />
          </Card>
        </Col>

        {/* CONSUMIBLES */}

        <Col
          xs={24}
          sm={12}
          lg={8}
        >
          <Card>
            <Statistic
              title="Consumibles"
              value={estadisticas.consumibles}
              prefix={
                <PaperClipOutlined />
              }
            />
          </Card>
        </Col>

        {/* STOCK BAJO */}

        <Col
          xs={24}
          sm={12}
          lg={8}
        >
          <Card>
            <Statistic
              title="Stock bajo"
              value={estadisticas.stockBajo}
              prefix={
                <WarningOutlined />
              }
            />

            {estadisticas.stockBajo > 0 && (
              <Tag
                color="red"
                style={{
                  marginTop: 10,
                }}
              >
                Requiere atención
              </Tag>
            )}
          </Card>
        </Col>

        {/* VENCIDOS */}

        <Col
          xs={24}
          sm={12}
          lg={8}
        >
          <Card>
            <Statistic
              title="Productos vencidos"
              value={estadisticas.vencidos}
              prefix={
                <FileDoneOutlined />
              }
            />

            {estadisticas.vencidos > 0 && (
              <Tag
                color="red"
                style={{
                  marginTop: 10,
                }}
              >
                Retirar del inventario
              </Tag>
            )}
          </Card>
        </Col>

        {/* PRÓXIMOS */}

        <Col
          xs={24}
          sm={12}
          lg={8}
        >
          <Card>
            <Statistic
              title="Próximos a vencer"
              value={
                estadisticas.proximosAVencer
              }
              prefix={
                <ClockCircleOutlined />
              }
            />

            {estadisticas.proximosAVencer >
              0 && (
              <Tag
                color="orange"
                style={{
                  marginTop: 10,
                }}
              >
                Revisar próximamente
              </Tag>
            )}
          </Card>
        </Col>

      </Row>

      {/* ESTADO GENERAL */}

      <Card
        style={{
          marginTop: 25,
        }}
      >
        <h2>
          Estado del inventario
        </h2>

        {estadisticas.stockBajo === 0 &&
        estadisticas.vencidos === 0 &&
        estadisticas.proximosAVencer ===
          0 ? (
          <Alert
            message="Inventario en buen estado"
            description="No hay productos con stock bajo ni problemas de vencimiento."
            type="success"
            showIcon
          />
        ) : (
          <Alert
            message="Hay productos que requieren atención"
            description="Revisá el Centro de Alertas para consultar los detalles."
            type="warning"
            showIcon
          />
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
