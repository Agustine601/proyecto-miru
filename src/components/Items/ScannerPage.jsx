import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Input,
  Select,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { CameraOutlined, PlusOutlined } from '@ant-design/icons';
import { useAddItemMutation, useGetConsumablesQuery, useGetReagentsQuery } from '../../services/items.js';
import { extraerCodigoQR, extraerGS1, normalizarCodigo } from '../../qr-utils';
import Scanner from './Scanner.jsx';
import { setDisplay } from '../containers/displaySlice';

const { Title, Text } = Typography;

const ScannerPage = () => {
  const [visible, setVisible] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [categoria, setCategoria] = useState('reagents');
  const [solicitante, setSolicitante] = useState('');
  const [destino, setDestino] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [addItem, { isLoading: guardando }] = useAddItemMutation();
  const dispatch = useDispatch();
  const { data: consumables = [] } = useGetConsumablesQuery();
  const { data: reagents = [] } = useGetReagentsQuery();

  const productosExistentes = useMemo(() => [...consumables, ...reagents], [consumables, reagents]);

  const buscarCodigo = async (codigo) => {
    const raw = String(codigo || '').trim();
    if (!raw) return;

    setVisible(false);
    setCargando(true);
    setResultado(null);

    const gs1 = extraerGS1(raw);
    const codigoExtraido = extraerCodigoQR(raw);

    // Primero intentamos reconocer el código contra productos ya existentes.
    const existente = productosExistentes.find((item) =>
      [item.codigoBarras, item.codigoQR, item.codigo, item?.lotes?.[0]?.numero]
        .filter(Boolean)
        .map(normalizarCodigo)
        .includes(normalizarCodigo(raw))
    );

    if (existente) {
      setResultado({
        codigo: raw,
        producto: { ...existente, lote: existente?.lotes?.[0]?.numero || existente.lote || '' },
        origen: 'miru',
        existente: true,
        tipoCodigo: 'Código reconocido por MIRÚ',
      });
      setCargando(false);
      message.success(`Producto encontrado: ${existente.nombre}`);
      return;
    }

    try {
      let productoImportado = null;
      let origen = 'barcode';

      // QR de Logística Rojas: intentamos obtener automáticamente la composición.
      // No exigimos que el producto ya exista en MIRÚ: cualquier QR válido
      // se puede consultar primero y dar de alta después.
      const pareceUrl = /^https?:\/\//i.test(raw);
      const pareceIdentificadorRojas = /^[a-f0-9]{20,}$/i.test(codigoExtraido || '');

      if ((pareceUrl || pareceIdentificadorRojas) && codigoExtraido) {
        const url = `https://logistica-rojas.com.ar/services/api/work-order/dispatch/public/composition/${encodeURIComponent(codigoExtraido)}`;
        console.log('Consultando composición pública:', url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const detalle = data?.requesterDetails?.[0];
          if (detalle) {
            productoImportado = {
              nombre: detalle.product || '',
              codigoBarras: detalle.code || '',
              codigoQR: raw,
              compositionQrCode: data.compositionQrCode || '',
              lote: detalle.lot || '',
              cantidad: Number(detalle.quantity) || 0,
              unidad: detalle.measureType || '',
              pedido: data.orderNumber || '',
              pallet: data.number ?? '',
              cliente: detalle.requesterName || '',
              localidad: detalle.requesterPlace || '',
              transportista: data.transportationName || '',
              chofer: data.transportationDriverName || '',
              equipo: data.transportationDocNumber || '',
              patenteCamion: data.motorPlate || '',
              patenteAcoplado: data.trailerPlate || '',
              numeroEntrega: detalle.deliveryNumber || '',
            };
            origen = 'logistica-rojas';
          }
        } else {
          console.warn('La consulta pública respondió:', response.status);
        }
      }

      // Si no hubo consulta externa, usamos lo que podamos extraer del GS1/barcode.
      if (!productoImportado) {
        productoImportado = {
          nombre: '',
          codigoBarras: gs1.codigoBarras || '',
          codigoQR: raw,
          lote: gs1.lote || '',
          cantidad: 1,
          unidad: 'unidad',
          vencimiento: gs1.vencimiento || '',
          gtin: gs1.gtin || '',
        };
      }

      setResultado({
        codigo: raw,
        producto: productoImportado,
        origen,
        existente: false,
        tipoCodigo: pareceUrl ? 'QR' : (origen === 'logistica-rojas' ? 'QR consultado' : 'Código leído'),
        contenidoQR: raw,
      });
    } catch (error) {
      // Un barcode no necesita internet: dejamos el código listo para completar y guardar.
      setResultado({
        codigo: raw,
        producto: {
          nombre: '',
          codigoBarras: gs1.codigoBarras || raw,
          codigoQR: '',
          lote: gs1.lote || '',
          cantidad: 1,
          unidad: 'unidad',
          vencimiento: gs1.vencimiento || '',
          gtin: gs1.gtin || '',
        },
        origen: pareceUrl ? 'qr' : 'barcode',
        existente: false,
        tipoCodigo: pareceUrl ? 'QR' : 'Código de barras',
        aviso: 'No encontramos una ficha automática. El código fue leído correctamente y queda disponible para completar o consultar.',
      });
    } finally {
      setCargando(false);
    }
  };

  const guardarProducto = async () => {
    const producto = resultado?.producto;
    if (!producto) return;
    if (!producto.nombre?.trim()) return message.warning('Ingresá el nombre del producto.');
    if (categoria === 'consumables' && !solicitante.trim()) return message.warning('Para semillas ingresá a quién va destinado.');

    const lote = producto.lote || `SIN-LOTE-${Date.now()}`;
    const body = {
      nombre: producto.nombre.trim(),
      codigoBarras: producto.codigoBarras || '',
      codigoQR: producto.codigoQR || '',
      cantidad: Number(producto.cantidad) || 0,
      unidad: producto.unidad || 'unidad',
      vencimiento: producto.vencimiento || '',
      ubicacion: ubicacion.trim(),
      proveedor: producto.proveedor || 'Logística Rojas',
      solicitante: categoria === 'consumables' ? solicitante.trim() : '',
      destino: categoria === 'consumables' ? destino.trim() : '',
      descripcion: producto.pedido ? `Pedido ${producto.pedido}` : '',
      lotes: [{ numero: lote, cantidad: Number(producto.cantidad) || 0, vencimiento: producto.vencimiento || '', ubicacion: ubicacion.trim(), proveedor: producto.proveedor || 'Logística Rojas' }],
    };

    try {
      const respuesta = await addItem({ categoria, ...body }).unwrap();
      const productoGuardado = respuesta?.producto || {
        ...body,
        _id: respuesta?.producto?._id,
        categoria,
        lotes: body.lotes,
      };

      // Dejamos el pallet recién ingresado listo para elegir su ubicación
      // directamente sobre el mapa físico del galpón.
      sessionStorage.setItem('miru_pending_warehouse_placement', JSON.stringify({
        product: productoGuardado,
        categoria,
        scannedCode: resultado.codigo,
        createdAt: new Date().toISOString(),
      }));

      message.success(`Producto agregado: ${body.nombre}. Elegí ahora dónde queda el pallet.`);
      setResultado(null);
      setSolicitante('');
      setDestino('');
      setUbicacion('');
      dispatch(setDisplay('warehouse-map'));
    } catch (error) {
      message.error(error?.data?.message || 'No se pudo guardar el producto.');
    }
  };

  const producto = resultado?.producto;
  const gs1Resultado = resultado?.codigo ? extraerGS1(resultado.codigo) : {};

  return (
    <div style={{ width: '100%', maxWidth: 900, padding: 25 }}>
      <Title level={2}>📷 Consultar / ingresar mercadería</Title>
      <Text type="secondary">Escaneá un QR o código de barras, aunque el producto todavía no exista en MIRÚ. Primero consultamos qué contiene y después decidís si querés incorporarlo.</Text>

      <div style={{ margin: '25px 0' }}>
        <Button type="primary" size="large" icon={<CameraOutlined />} onClick={() => { setResultado(null); setVisible(true); }}>
          Abrir cámara y escanear
        </Button>
      </div>

      {cargando && <Card><div style={{ textAlign: 'center', padding: 30 }}><Spin size="large" /><div style={{ marginTop: 20 }}>Procesando código...</div></div></Card>}

      {resultado && !producto && <Alert type="error" showIcon message="No se pudo leer la mercadería" description={resultado.error} />}

      {producto && (
        <Card title="📦 Datos detectados" style={{ maxWidth: 760 }}>
          {resultado.aviso && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Código leído" description={resultado.aviso} />}
          <Alert type="success" showIcon style={{ marginBottom: 20 }} message={resultado.existente ? 'Producto ya registrado' : `Lectura: ${resultado.tipoCodigo}`} description={resultado.existente ? 'MIRÚ encontró un producto existente. Podés revisarlo antes de continuar.' : 'Completá los datos que no estén presentes en la etiqueta y guardalo.'} />

          <Card size="small" type="inner" title="🔎 Contenido leído del código" style={{ marginBottom: 16 }}>
            <Text copyable style={{ wordBreak: 'break-all' }}>{resultado.contenidoQR || resultado.codigo}</Text>
            {gs1Resultado && (gs1Resultado.gtin || gs1Resultado.lote || gs1Resultado.vencimiento || gs1Resultado.cantidad) && (
              <div style={{ marginTop: 10 }}>
                <Tag>GS1 detectado</Tag>
                {gs1Resultado.gtin && <Tag>GTIN: {gs1Resultado.gtin}</Tag>}
                {gs1Resultado.lote && <Tag>Lote: {gs1Resultado.lote}</Tag>}
                {gs1Resultado.vencimiento && <Tag>Vto: {gs1Resultado.vencimiento}</Tag>}
                {gs1Resultado.cantidad && <Tag>Cantidad: {gs1Resultado.cantidad}</Tag>}
              </div>
            )}
          </Card>

          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Producto">
              {resultado.existente ? <strong>{producto.nombre}</strong> : <Input value={producto.nombre} onChange={(e) => setResultado((r) => ({ ...r, producto: { ...r.producto, nombre: e.target.value } }))} placeholder="Nombre del producto" />}
            </Descriptions.Item>
            <Descriptions.Item label="Código de barras">{producto.codigoBarras || '—'}</Descriptions.Item>
            <Descriptions.Item label="QR">{producto.codigoQR || '—'}</Descriptions.Item>
            <Descriptions.Item label="GTIN">{producto.gtin || '—'}</Descriptions.Item>
            <Descriptions.Item label="Lote"><Input value={producto.lote || ''} onChange={(e) => setResultado((r) => ({ ...r, producto: { ...r.producto, lote: e.target.value } }))} /></Descriptions.Item>
            <Descriptions.Item label="Cantidad"><Input value={producto.cantidad ?? ''} onChange={(e) => setResultado((r) => ({ ...r, producto: { ...r.producto, cantidad: Number(e.target.value) || 0 } }))} /></Descriptions.Item>
            <Descriptions.Item label="Unidad"><Input value={producto.unidad || ''} onChange={(e) => setResultado((r) => ({ ...r, producto: { ...r.producto, unidad: e.target.value } }))} /></Descriptions.Item>
            <Descriptions.Item label="Vencimiento"><Input value={producto.vencimiento || ''} onChange={(e) => setResultado((r) => ({ ...r, producto: { ...r.producto, vencimiento: e.target.value } }))} /></Descriptions.Item>
            {producto.pallet && <Descriptions.Item label="Pallet"><Tag color="blue">{producto.pallet}</Tag></Descriptions.Item>}
            {producto.pedido && <Descriptions.Item label="Orden">{producto.pedido}</Descriptions.Item>}
            {producto.cliente && <Descriptions.Item label="Cliente">{producto.cliente}</Descriptions.Item>}
          </Descriptions>

          <Divider />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div><Text strong>Tipo de mercadería</Text><Select style={{ width: '100%', marginTop: 6 }} value={categoria} onChange={setCategoria}><Select.Option value="reagents">🧪 Agroquímico</Select.Option><Select.Option value="consumables">🌱 Semilla</Select.Option></Select></div>
            {categoria === 'consumables' && <div><Text strong>¿A quién va?</Text><Input style={{ marginTop: 6 }} value={solicitante} onChange={(e) => setSolicitante(e.target.value)} placeholder="Cliente / productor" /></div>}
            {categoria === 'consumables' && <div><Text strong>Destino</Text><Input style={{ marginTop: 6 }} value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Campo / localidad / destino" /></div>}
            <div><Text strong>Ubicación en galpón</Text><Input style={{ marginTop: 6 }} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Ej. R07-N2-P03" /></div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            {!resultado.existente && <Button type="primary" size="large" icon={<PlusOutlined />} loading={guardando} onClick={guardarProducto}>Agregar a MIRÚ</Button>}
            <Button size="large" onClick={() => setResultado(null)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {!resultado && !cargando && <Empty description="Todavía no escaneaste ningún producto" />}

      <Scanner visible={visible} onCancel={() => setVisible(false)} onFound={buscarCodigo} />
    </div>
  );
};

export default ScannerPage;
