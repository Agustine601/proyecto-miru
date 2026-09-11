import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Tag, Typography } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { coincideCodigo, extraerCodigoQR } from '../../qr-utils';
import Scanner from './Scanner.jsx';
import MovementModal from '../Modals/MovementModal.jsx';
import { useGetConsumablesQuery, useGetReagentsQuery, useGetEquipmentQuery } from '../../services/items';

const { Title, Text } = Typography;

const ScannerPage = () => {
  const { data: consumables = [] } = useGetConsumablesQuery();
  const { data: reagents = [] } = useGetReagentsQuery();
  const { data: equipment = [] } = useGetEquipmentQuery();
  const [visible, setVisible] = useState(false);
  const [resultado, setResultado] = useState(null);

  const productos = useMemo(() => [
    ...consumables.map((item) => ({ ...item, categoria: 'consumables', categoriaNombre: 'Semilla' })),
    ...reagents.map((item) => ({ ...item, categoria: 'reagents', categoriaNombre: 'Agroquímico' })),
    ...equipment.map((item) => ({ ...item, categoria: 'equipment', categoriaNombre: 'Otros insumos' })),
  ], [consumables, reagents, equipment]);

  const buscarCodigo = (codigo) => {
    const encontrado = productos.find((item) => coincideCodigo(item, codigo));
    const codigoMostrado = extraerCodigoQR(codigo) || String(codigo).trim();

    if (!encontrado) {
      setResultado({ codigo: codigoMostrado, producto: null });
    } else {
      setResultado({ codigo: codigoMostrado, producto: encontrado });
    }
    setVisible(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: 900, padding: 25 }}>
      <Title level={2}>📷 Escanear producto</Title>
      <Text type="secondary">
        Escaneá el código de barras o QR de una bolsa, caja o pallet para encontrarlo en MIRÚ.
      </Text>

      <div style={{ margin: '25px 0' }}>
        <Button type="primary" size="large" icon={<CameraOutlined />} onClick={() => setVisible(true)}>
          Abrir cámara y escanear
        </Button>
      </div>

      {resultado && !resultado.producto && (
        <Alert
          type="warning"
          showIcon
          message="Producto no encontrado"
          description={`El código ${resultado.codigo} no está asociado a ningún producto. Podés agregarlo desde “Agregar producto”.`}
        />
      )}

      {resultado?.producto && (
        <Card title="Producto encontrado" style={{ maxWidth: 650 }}>
          <p><strong>Nombre:</strong> {resultado.producto.nombre}</p>
          <p><strong>Categoría:</strong> <Tag color="green">{resultado.producto.categoriaNombre}</Tag></p>
          <p><strong>Stock:</strong> {resultado.producto.cantidad || 0} {resultado.producto.unidad || ''}</p>
          <p><strong>Código:</strong> {resultado.codigo}</p>
          <p><strong>Lote:</strong> {resultado.producto.lote || resultado.producto.lotes?.[0]?.numero || 'SIN-LOTE'}</p>
          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <MovementModal
              item={resultado.producto}
              categoria={resultado.producto.categoria}
            />
          </div>
          <Alert
            style={{ marginTop: 14 }}
            type="info"
            showIcon
            message="Trazabilidad activa"
            description="Desde este producto escaneado podés registrar entrada o salida. El movimiento queda guardado en el historial con fecha, lote, cantidad y responsable."
          />
        </Card>
      )}

      {!resultado && <Empty description="Todavía no escaneaste ningún producto" />}

      <Scanner
        visible={visible}
        onCancel={() => setVisible(false)}
        onFound={buscarCodigo}
      />
    </div>
  );
};

export default ScannerPage;
