import React, { useMemo } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Tag,
  Spin,
  Alert,
  Button,
} from 'antd';

import {
  DatabaseOutlined,
  ExperimentOutlined,
  PaperClipOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  CameraOutlined,
  PlusOutlined,
  SwapOutlined,
  HistoryOutlined,
  SafetyOutlined,
  InboxOutlined,
  RightOutlined,
} from '@ant-design/icons';

import { useDispatch } from 'react-redux';

import {
  useGetConsumablesQuery,
  useGetReagentsQuery,
} from '../../services/items';

import { setDisplay } from '../containers/displaySlice';

const Dashboard = () => {
  const dispatch = useDispatch();

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

  const irA = (pantalla) => {
    dispatch(setDisplay(pantalla));
  };

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

      if (stockActual <= stockMinimo) {
        stockBajo++;
      }

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
        } else if (diasRestantes <= 30) {
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
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin
          size="large"
          tip="Cargando MIRÚ..."
        />
      </div>
    );
  }

  const totalAlertas =
    estadisticas.stockBajo +
    estadisticas.vencidos +
    estadisticas.proximosAVencer;

  const inventarioOK =
    totalAlertas === 0;

  return (
    <div
      style={{
        width: '94%',
        maxWidth: 1400,
        margin: '28px auto 50px',
      }}
    >

      {/* HEADER */}

      <div
        style={{
          marginBottom: 24,
          padding: '26px 28px',
          borderRadius: 20,
          background:
            'linear-gradient(135deg, #285832 0%, #397348 55%, #5d8b62 100%)',
          color: '#fff',
          boxShadow:
            '0 10px 30px rgba(40, 88, 50, 0.18)',
        }}
      >
        <div
          style={{
            fontSize: 13,
            opacity: 0.82,
            marginBottom: 6,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          MIRÚ · GESTIÓN DE INVENTARIO
        </div>

        <h1
          style={{
            margin: 0,
            color: '#fff',
            fontSize: 'clamp(26px, 4vw, 38px)',
            fontWeight: 750,
            lineHeight: 1.15,
          }}
        >
          Panel principal
        </h1>

        <p
          style={{
            margin: '10px 0 0',
            color: 'rgba(255,255,255,0.88)',
            fontSize: 16,
          }}
        >
          Todo lo importante de tu inventario,
          en un solo lugar.
        </p>
      </div>

      {/* ACCIONES RÁPIDAS */}

      <Card
        bordered={false}
        style={{
          marginBottom: 20,
          borderRadius: 18,
          boxShadow:
            '0 5px 20px rgba(35, 69, 43, 0.08)',
        }}
      >
        <div
          style={{
            marginBottom: 16,
          }}
        >
          <div
            style={{
              color: '#718074',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            ACCIONES RÁPIDAS
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 21,
              fontWeight: 700,
              color: '#23452b',
            }}
          >
            ¿Qué querés hacer?
          </div>
        </div>

        <Row gutter={[12, 12]}>

          <Col xs={24} sm={12} lg={6}>
            <Button
              type="primary"
              block
              size="large"
              icon={<PlusOutlined />}
              onClick={() => irA('consumables')}
              style={{
                height: 52,
                borderRadius: 12,
              }}
            >
              Agregar producto
            </Button>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Button
              block
              size="large"
              icon={<CameraOutlined />}
              onClick={() => irA('scanner')}
              style={{
                height: 52,
                borderRadius: 12,
              }}
            >
              Escanear
            </Button>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Button
              block
              size="large"
              icon={<SwapOutlined />}
              onClick={() => irA('movements')}
              style={{
                height: 52,
                borderRadius: 12,
              }}
            >
              Movimientos
            </Button>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Button
              block
              size="large"
              icon={<HistoryOutlined />}
              onClick={() => irA('traceability')}
              style={{
                height: 52,
                borderRadius: 12,
              }}
            >
              Trazabilidad
            </Button>
          </Col>

        </Row>
      </Card>

      {/* ESTADÍSTICAS PRINCIPALES */}

      <Row gutter={[18, 18]}>

        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            hoverable
            onClick={() => irA('default')}
            style={{
              borderRadius: 18,
              height: '100%',
              cursor: 'pointer',
              boxShadow:
                '0 5px 20px rgba(35, 69, 43, 0.08)',
            }}
          >
            <Statistic
              title="Total de productos"
              value={estadisticas.total}
              prefix={<DatabaseOutlined />}
              valueStyle={{
                color: '#285832',
                fontSize: 34,
                fontWeight: 750,
              }}
            />

            <div
              style={{
                marginTop: 12,
                color: '#718074',
                fontSize: 13,
              }}
            >
              Todo el inventario registrado
            </div>

            <div
              style={{
                marginTop: 12,
                color: '#397348',
                fontWeight: 600,
              }}
            >
              Ver inventario <RightOutlined />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            hoverable
            onClick={() => irA('reagents')}
            style={{
              borderRadius: 18,
              height: '100%',
              cursor: 'pointer',
              boxShadow:
                '0 5px 20px rgba(35, 69, 43, 0.08)',
            }}
          >
            <Statistic
              title="Reactivos"
              value={estadisticas.reagentes}
              prefix={<ExperimentOutlined />}
              valueStyle={{
                color: '#397348',
                fontSize: 34,
                fontWeight: 750,
              }}
            />

            <div
              style={{
                marginTop: 12,
                color: '#718074',
                fontSize: 13,
              }}
            >
              Productos químicos registrados
            </div>

            <div
              style={{
                marginTop: 12,
                color: '#397348',
                fontWeight: 600,
              }}
            >
              Ver reactivos <RightOutlined />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            hoverable
            onClick={() => irA('consumables')}
            style={{
              borderRadius: 18,
              height: '100%',
              cursor: 'pointer',
              boxShadow:
                '0 5px 20px rgba(35, 69, 43, 0.08)',
            }}
          >
            <Statistic
              title="Consumibles"
              value={estadisticas.consumibles}
              prefix={<PaperClipOutlined />}
              valueStyle={{
                color: '#5d8b62',
                fontSize: 34,
                fontWeight: 750,
              }}
            />

            <div
              style={{
                marginTop: 12,
                color: '#718074',
                fontSize: 13,
              }}
            >
              Materiales y consumibles
            </div>

            <div
              style={{
                marginTop: 12,
                color: '#397348',
                fontWeight: 600,
              }}
            >
              Ver consumibles <RightOutlined />
            </div>
          </Card>
        </Col>

      </Row>

      {/* ALERTAS */}

      <div style={{ marginTop: 18 }}>

        <Row gutter={[18, 18]}>

          <Col xs={24} md={8}>
            <Card
              bordered={false}
              hoverable
              onClick={() => irA('alerts')}
              style={{
                borderRadius: 18,
                height: '100%',
                cursor: 'pointer',
                background:
                  estadisticas.stockBajo > 0
                    ? '#fff8f6'
                    : '#f7fbf7',
                border:
                  estadisticas.stockBajo > 0
                    ? '1px solid #f4d2ca'
                    : '1px solid #dce9dc',
              }}
            >
              <Statistic
                title="Stock bajo"
                value={estadisticas.stockBajo}
                prefix={<WarningOutlined />}
                valueStyle={{
                  color:
                    estadisticas.stockBajo > 0
                      ? '#cf4b35'
                      : '#397348',
                  fontSize: 32,
                  fontWeight: 750,
                }}
              />

              <div style={{ marginTop: 10 }}>
                {estadisticas.stockBajo > 0 ? (
                  <Tag color="error">
                    Requiere atención
                  </Tag>
                ) : (
                  <Tag color="success">
                    Stock correcto
                  </Tag>
                )}
              </div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              bordered={false}
              hoverable
              onClick={() => irA('alerts')}
              style={{
                borderRadius: 18,
                height: '100%',
                cursor: 'pointer',
                background:
                  estadisticas.vencidos > 0
                    ? '#fff8f6'
                    : '#f7fbf7',
                border:
                  estadisticas.vencidos > 0
                    ? '1px solid #f4d2ca'
                    : '1px solid #dce9dc',
              }}
            >
              <Statistic
                title="Productos vencidos"
                value={estadisticas.vencidos}
                prefix={<FileDoneOutlined />}
                valueStyle={{
                  color:
                    estadisticas.vencidos > 0
                      ? '#cf4b35'
                      : '#397348',
                  fontSize: 32,
                  fontWeight: 750,
                }}
              />

              <div style={{ marginTop: 10 }}>
                {estadisticas.vencidos > 0 ? (
                  <Tag color="error">
                    Retirar del inventario
                  </Tag>
                ) : (
                  <Tag color="success">
                    Sin vencidos
                  </Tag>
                )}
              </div>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              bordered={false}
              hoverable
              onClick={() => irA('alerts')}
              style={{
                borderRadius: 18,
                height: '100%',
                cursor: 'pointer',
                background:
                  estadisticas.proximosAVencer > 0
                    ? '#fffaf2'
                    : '#f7fbf7',
                border:
                  estadisticas.proximosAVencer > 0
                    ? '1px solid #f1dfbc'
                    : '1px solid #dce9dc',
              }}
            >
              <Statistic
                title="Próximos a vencer"
                value={
                  estadisticas.proximosAVencer
                }
                prefix={<ClockCircleOutlined />}
                valueStyle={{
                  color:
                    estadisticas.proximosAVencer > 0
                      ? '#c9851d'
                      : '#397348',
                  fontSize: 32,
                  fontWeight: 750,
                }}
              />

              <div style={{ marginTop: 10 }}>
                {estadisticas.proximosAVencer > 0 ? (
                  <Tag color="warning">
                    Revisar próximamente
                  </Tag>
                ) : (
                  <Tag color="success">
                    Sin vencimientos próximos
                  </Tag>
                )}
              </div>
            </Card>
          </Col>

        </Row>

      </div>

      {/* ESTADO GENERAL */}

      <Card
        bordered={false}
        style={{
          marginTop: 20,
          borderRadius: 18,
          boxShadow:
            '0 5px 20px rgba(35, 69, 43, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <SafetyOutlined
            style={{
              fontSize: 27,
              color:
                inventarioOK
                  ? '#397348'
                  : '#c9851d',
            }}
          />

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                color: '#23452b',
              }}
            >
              Estado del inventario
            </h2>

            <div
              style={{
                marginTop: 3,
                color: '#718074',
                fontSize: 13,
              }}
            >
              Vista general del estado actual
            </div>
          </div>
        </div>

        {inventarioOK ? (
          <Alert
            message="Inventario en buen estado"
            description="No hay productos con stock bajo ni problemas de vencimiento."
            type="success"
            showIcon
            style={{
              borderRadius: 12,
            }}
          />
        ) : (
          <Alert
            message="Hay productos que requieren atención"
            description="Revisá las alertas para consultar los productos que necesitan intervención."
            type="warning"
            showIcon
            action={
              <Button
                size="small"
                onClick={() => irA('alerts')}
              >
                Ver alertas
              </Button>
            }
            style={{
              borderRadius: 12,
            }}
          />
        )}
      </Card>

      {/* RESUMEN */}

      <Row
        gutter={[18, 18]}
        style={{
          marginTop: 20,
        }}
      >

        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              height: '100%',
              boxShadow:
                '0 5px 20px rgba(35, 69, 43, 0.08)',
            }}
          >
            <InboxOutlined
              style={{
                fontSize: 25,
                color: '#397348',
              }}
            />

            <div
              style={{
                marginTop: 10,
                color: '#718074',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              INVENTARIO
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 23,
                fontWeight: 750,
                color: '#23452b',
              }}
            >
              {estadisticas.total}
            </div>

            <div
              style={{
                marginTop: 4,
                color: '#718074',
              }}
            >
              productos registrados
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              height: '100%',
              boxShadow:
                '0 5px 20px rgba(35, 69, 43, 0.08)',
            }}
          >
            <SwapOutlined
              style={{
                fontSize: 25,
                color: '#397348',
              }}
            />

            <div
              style={{
                marginTop: 10,
                color: '#718074',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              TRAZABILIDAD
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 23,
                fontWeight: 750,
                color: '#23452b',
              }}
            >
              Movimientos
            </div>

            <Button
              type="link"
              style={{
                padding: 0,
                marginTop: 2,
              }}
              onClick={() => irA('movements')}
            >
              Consultar historial <RightOutlined />
            </Button>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 18,
              height: '100%',
              boxShadow:
                '0 5px 20px rgba(35, 69, 43, 0.08)',
            }}
          >
            <WarningOutlined
              style={{
                fontSize: 25,
                color:
                  totalAlertas > 0
                    ? '#cf4b35'
                    : '#397348',
              }}
            />

            <div
              style={{
                marginTop: 10,
                color: '#718074',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ATENCIÓN REQUERIDA
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 23,
                fontWeight: 750,
                color: '#23452b',
              }}
            >
              {totalAlertas}
            </div>

            <Button
              type="link"
              style={{
                padding: 0,
                marginTop: 2,
              }}
              onClick={() => irA('alerts')}
            >
              Ver alertas <RightOutlined />
            </Button>
          </Card>
        </Col>

      </Row>

    </div>
  );
};

export default Dashboard;