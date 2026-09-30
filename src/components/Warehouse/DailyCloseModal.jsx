import React from 'react';
import { Modal, Button, Alert, Statistic, Row, Col, message } from 'antd';
import {
  useObtenerCierreHoyQuery,
  useCerrarJornadaMutation,
} from '../../services/movements';

const DailyCloseModal = ({ visible, onClose }) => {
  const {
    data,
    isLoading,
    refetch,
  } = useObtenerCierreHoyQuery(undefined, {
    skip: !visible,
  });

  const [cerrarJornada, { isLoading: cerrando }] =
    useCerrarJornadaMutation();

  const cerrar = async () => {
    try {
      await cerrarJornada({ responsable: 'Usuario' }).unwrap();
      message.success('Jornada cerrada y saldo diario consolidado.');
      await refetch();
    } catch (error) {
      message.error(
        error?.data?.error || 'No se pudo cerrar la jornada.'
      );
    }
  };

  const resumen = data?.resumen || {
    entradas: 0,
    salidas: 0,
    consumos: 0,
  };

  return (
    <Modal
      visible={visible}
      title="🌙 Cierre de jornada"
      onCancel={onClose}
      width={620}
      footer={[
        <Button key="cerrar" onClick={onClose}>
          Cerrar ventana
        </Button>,
        !data?.cerrado && (
          <Button
            key="confirmar"
            type="primary"
            loading={cerrando}
            disabled={isLoading}
            onClick={cerrar}
          >
            🔒 Cerrar jornada
          </Button>
        ),
      ]}
    >
      {data?.cerrado ? (
        <Alert
          type="success"
          showIcon
          message="La jornada de hoy ya está cerrada."
          description={`Cierre realizado: ${
            data.fechaCierre
              ? new Date(data.fechaCierre).toLocaleString('es-AR')
              : '—'
          }`}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message="Resumen del día"
          description="Los retiros ya descuentan el stock en tiempo real. Este cierre guarda la fotografía final de la jornada para control."
        />
      )}

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={8}>
          <Statistic title="📥 Entradas" value={resumen.entradas} />
        </Col>
        <Col span={8}>
          <Statistic title="📤 Retiros" value={resumen.salidas} />
        </Col>
        <Col span={8}>
          <Statistic title="🧪 Consumos" value={resumen.consumos} />
        </Col>
      </Row>

      <p style={{ marginTop: 20, marginBottom: 8 }}>
        <b>Movimientos registrados:</b> {data?.movimientos ?? 0}
      </p>

      {Object.entries(data?.resumen?.totalesPorUnidad || {}).map(
        ([unidad, totales]) => (
          <div
            key={unidad}
            style={{
              padding: '8px 10px',
              background: '#fafafa',
              border: '1px solid #eee',
              borderRadius: 6,
              marginBottom: 6,
            }}
          >
            <b>{unidad}</b> · Entradas: {totales.entradas || 0} ·
            Retiros: {totales.salidas || 0} · Consumos: {totales.consumos || 0}
          </div>
        )
      )}
    </Modal>
  );
};

export default DailyCloseModal;
