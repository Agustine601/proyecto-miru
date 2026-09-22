import React, { useRef, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Progress, Space, Tag, Typography, message } from 'antd';
import { CameraOutlined, CheckOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { createWorker } from 'tesseract.js';

const { Text, Title } = Typography;

const clean = (v = '') => String(v).replace(/\s+/g, ' ').trim();

const parseRemito = (text) => {
  const lines = String(text || '').split(/\r?\n/).map(clean).filter(Boolean);
  const joined = lines.join(' ');
  const pick = (regex) => (joined.match(regex)?.[1] || '').trim();
  const products = [];

  // Detecta líneas del tipo: PRODUCTO | LOTE | CANTIDAD | UNIDAD.
  lines.forEach((line) => {
    const m = line.match(/(.+?)\s+(?:lote\s*)?([A-Z0-9][A-Z0-9._/-]{3,})\s+(\d+(?:[.,]\d+)?)\s*(L|LT|KG|KGS|UN|UND|U|LTS|LITROS|UNIDADES)?$/i);
    if (m && !/remito|fecha|cliente|proveedor|total|precio|domicilio/i.test(line)) {
      products.push({
        producto: clean(m[1]),
        lote: clean(m[2]),
        cantidad: Number(String(m[3]).replace(',', '.')) || 0,
        unidad: clean(m[4] || 'unidad'),
      });
    }
  });

  const lotes = [];
  const loteRegex = /(?:lote|lot|partida)\s*[:#-]?\s*([A-Z0-9._/-]{3,})/ig;
  let match;
  while ((match = loteRegex.exec(joined))) {
    const lote = clean(match[1]);
    if (!lotes.includes(lote)) lotes.push(lote);
  }

  const cantidades = [];
  const qtyRegex = /(?:cantidad|cant\.?|qty)\s*[:#-]?\s*(\d+(?:[.,]\d+)?)\s*(L|LT|KG|KGS|UN|UND|U|LTS|LITROS|UNIDADES)?/ig;
  while ((match = qtyRegex.exec(joined))) {
    cantidades.push({ cantidad: Number(match[1].replace(',', '.')) || 0, unidad: clean(match[2] || 'unidad') });
  }

  if (!products.length && lotes.length) {
    lotes.forEach((lote, i) => products.push({
      producto: pick(/(?:producto|artículo|item)\s*[:#-]?\s*([^\n,;]+)/i),
      lote,
      cantidad: cantidades[i]?.cantidad || 0,
      unidad: cantidades[i]?.unidad || 'unidad',
    }));
  }

  return {
    proveedor: pick(/(?:proveedor|raz[oó]n social)\s*[:#-]?\s*([^\n,;]+)/i),
    remito: pick(/(?:remito|nro\.?\s*remito|comprobante)\s*[:#-]?\s*([A-Z0-9-]+)/i),
    fecha: pick(/(?:fecha|fecha de emisi[oó]n)\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i),
    destino: pick(/(?:destino|entrega|domicilio de entrega|dep[oó]sito)\s*[:#-]?\s*([^\n,;]+)/i),
    products,
    rawText: text,
  };
};

const RemitoPhotoReader = ({ open, onCancel, onDetected }) => {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [data, setData] = useState(null);

  const readPhoto = async (file) => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setData(null);
    try {
      const worker = await createWorker('spa', 1, {
        logger: (info) => {
          if (typeof info.progress === 'number') setProgress(Math.round(info.progress * 100));
        },
      });
      const result = await worker.recognize(file);
      await worker.terminate();
      const text = result?.data?.text || '';
      setRawText(text);
      setData(parseRemito(text));
    } catch (e) {
      console.error('MIRÚ OCR remito:', e);
      message.error('No pude leer la foto. Probá con el remito más derecho, cerca y con buena luz.');
    } finally {
      setProcessing(false);
    }
  };

  const confirm = () => {
    if (!data) return;
    onDetected(data);
    onCancel();
  };

  return (
    <Modal open={open} onCancel={onCancel} footer={null} width={720} title="📸 Leer remito con una foto">
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="MIRÚ va a extraer los datos, pero vos confirmás antes del alta."
          description="Si encuentra dos lotes, los presenta como dos partidas separadas para que puedas corregirlas."
        />

        <Button
          type="primary"
          icon={<CameraOutlined />}
          size="large"
          block
          onClick={() => inputRef.current?.click()}
          disabled={processing}
        >
          Sacar foto / elegir foto del remito
        </Button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => readPhoto(e.target.files?.[0])}
        />

        {processing && (
          <Card size="small">
            <Text>Analizando remito…</Text>
            <Progress percent={progress} status="active" />
          </Card>
        )}

        {data && !processing && (
          <Card title={<><FileTextOutlined /> Datos detectados</>}>
            <Space wrap>
              {data.proveedor && <Tag color="blue">Proveedor: {data.proveedor}</Tag>}
              {data.remito && <Tag>Remito: {data.remito}</Tag>}
              {data.fecha && <Tag>Fecha: {data.fecha}</Tag>}
              {data.destino && <Tag color="green">Destino: {data.destino}</Tag>}
            </Space>

            <Title level={5} style={{ marginTop: 18 }}>Partidas</Title>
            {data.products.length ? data.products.map((p, i) => (
              <Card key={`${p.lote}-${i}`} size="small" style={{ marginBottom: 8 }}>
                <Space wrap>
                  <Tag color="green">Partida {i + 1}</Tag>
                  <Text strong>{p.producto || 'Producto no detectado'}</Text>
                  <Tag>Lote: {p.lote || '—'}</Tag>
                  <Tag>Cantidad: {p.cantidad || 0} {p.unidad}</Tag>
                </Space>
              </Card>
            )) : <Alert type="warning" message="No pude separar partidas automáticamente." description="Podés revisar el texto detectado y completar los datos manualmente." />}

            <Button icon={<EditOutlined />} onClick={() => setRawText(rawText)} style={{ marginTop: 8 }}>
              Ver texto detectado
            </Button>
            <Input.TextArea value={rawText} onChange={(e) => setRawText(e.target.value)} autoSize={{ minRows: 5, maxRows: 10 }} style={{ marginTop: 8 }} />

            <Button type="primary" icon={<CheckOutlined />} size="large" block style={{ marginTop: 14 }} onClick={confirm}>
              Usar datos para el alta y revisar
            </Button>
          </Card>
        )}
      </Space>
    </Modal>
  );
};

export default RemitoPhotoReader;
