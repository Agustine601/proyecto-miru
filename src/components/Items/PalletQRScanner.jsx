import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Divider, Modal, Space, Tag, Typography, message } from 'antd';
import { CameraOutlined, LinkOutlined, StopOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_ID = 'miru-pallet-qr-reader';

const parseQR = (decodedText) => {
  const text = String(decodedText || '').trim();

  let url = null;
  try {
    url = new URL(text);
  } catch (error) {
    // El QR puede contener texto plano. No hacemos nada especial en ese caso.
  }

  const esLogisticaRojas = Boolean(
    url && url.hostname.toLowerCase().includes('logistica-rojas.com.ar')
  );

  let compositionId = '';
  if (url) {
    const match = url.pathname.match(/\/composition\/([^/]+)/i);
    if (match) compositionId = match[1];
  }

  return {
    texto: text,
    url: url ? url.toString() : '',
    esLogisticaRojas,
    compositionId,
  };
};

const PalletQRScanner = () => {
  const scannerRef = useRef(null);
  const [escaneando, setEscaneando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const detenerCamara = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      const estado = scanner.getState();
      if (estado === 2 || estado === 3) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch (error) {
      console.warn('No se pudo detener el lector QR:', error);
    } finally {
      scannerRef.current = null;
      setEscaneando(false);
    }
  };

  const iniciarCamara = async () => {
    setResultado(null);

    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1,
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          const datos = parseQR(decodedText);
          setResultado(datos);
          message.success(
            datos.esLogisticaRojas
              ? 'QR de Logística Rojas reconocido.'
              : 'QR reconocido correctamente.'
          );
          await detenerCamara();
        },
        () => {
          // Los errores de lectura por frame son normales mientras se busca el QR.
        }
      );

      setEscaneando(true);
    } catch (error) {
      console.error(error);
      scannerRef.current = null;
      setEscaneando(false);
      message.error(
        'No se pudo abrir la cámara. Revisá los permisos del navegador y que MIRÚ esté en HTTPS o localhost.'
      );
    }
  };

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear().catch(() => {}));
      }
    };
  }, []);

  const cerrarResultado = () => setResultado(null);

  return (
    <Card
      title={
        <Space>
          <QrcodeOutlined />
          Ingreso por QR de pallet
        </Space>
      }
      style={{ width: '100%', maxWidth: 900, margin: '24px auto' }}
    >
      <Typography.Paragraph>
        Escaneá el QR de la etiqueta del pallet con la cámara del celular o de la computadora.
        MIRÚ reconoce especialmente los QR de <strong>Logística Rojas</strong>.
      </Typography.Paragraph>

      <div
        id={SCANNER_ID}
        style={{
          width: '100%',
          maxWidth: 520,
          minHeight: escaneando ? 340 : 80,
          margin: '0 auto 18px',
          overflow: 'hidden',
          borderRadius: 12,
          background: '#f5f5f5',
        }}
      />

      <Space wrap>
        {!escaneando ? (
          <Button
            type="primary"
            size="large"
            icon={<CameraOutlined />}
            onClick={iniciarCamara}
          >
            Escanear QR
          </Button>
        ) : (
          <Button
            danger
            size="large"
            icon={<StopOutlined />}
            onClick={detenerCamara}
          >
            Detener cámara
          </Button>
        )}
      </Space>

      {escaneando && (
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="Apuntá la cámara al QR de la etiqueta"
          description="No hace falta sacar una foto: MIRÚ detecta el código en tiempo real."
        />
      )}

      <Modal
        title="QR reconocido"
        open={Boolean(resultado)}
        onCancel={cerrarResultado}
        footer={[
          resultado?.url && (
            <Button
              key="abrir"
              type="default"
              icon={<LinkOutlined />}
              href={resultado.url}
              target="_blank"
              rel="noreferrer"
            >
              Abrir etiqueta
            </Button>
          ),
          <Button key="cerrar" type="primary" onClick={cerrarResultado}>
            Cerrar
          </Button>,
        ]}
      >
        {resultado?.esLogisticaRojas ? (
          <>
            <Tag color="green">LOGÍSTICA ROJAS</Tag>
            <Typography.Title level={4} style={{ marginTop: 16 }}>
              Pallet reconocido
            </Typography.Title>
            <Typography.Paragraph>
              MIRÚ detectó un QR de tipo <strong>composition</strong> de Logística Rojas.
            </Typography.Paragraph>
            <Divider />
            <Typography.Paragraph>
              <strong>ID de composición:</strong> {resultado.compositionId || 'No detectado'}
            </Typography.Paragraph>
            <Typography.Paragraph copyable={{ text: resultado.url }}>
              <strong>QR:</strong> {resultado.url}
            </Typography.Paragraph>
            <Alert
              type="info"
              showIcon
              message="El QR contiene una URL y un identificador"
              description="Los datos impresos de la etiqueta (orden, SKU, lote y cantidad) no están visibles dentro del contenido del QR leído por MIRÚ. Para cargarlos automáticamente necesitamos integrar MIRÚ con la fuente de datos de Logística Rojas."
            />
          </>
        ) : (
          <>
            <Tag color="blue">QR</Tag>
            <Typography.Title level={4} style={{ marginTop: 16 }}>
              Código reconocido
            </Typography.Title>
            <Typography.Paragraph copyable={{ text: resultado?.texto }}>
              {resultado?.texto}
            </Typography.Paragraph>
          </>
        )}
      </Modal>
    </Card>
  );
};

export default PalletQRScanner;
