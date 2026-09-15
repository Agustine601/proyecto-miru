import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CameraOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useGetConsumablesQuery, useGetReagentsQuery } from '../../services/items';
import {
  useCreateWorkOrderMutation,
  useDispatchWorkOrderItemMutation,
  useGetWorkOrdersQuery,
} from '../../services/workOrders';
import Scanner from './Scanner.jsx';
import { coincideCodigo } from '../../qr-utils';

const { Title, Text } = Typography;

const nombreCategoria = {
  consumables: 'Semilla',
  reagents: 'Agroquímico',
};

const WorkSheet = () => {
  const { data: consumables = [] } = useGetConsumablesQuery();
  const { data: reagents = [] } = useGetReagentsQuery();
  const { data: ordenes = [], isLoading: cargandoOrdenes } = useGetWorkOrdersQuery();
  const [crearOrden, { isLoading: creando }] = useCreateWorkOrderMutation();
  const [despachar, { isLoading: despachando }] = useDispatchWorkOrderItemMutation();

  const [solicitante, setSolicitante] = useState('');
  const [destino, setDestino] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [productoId, setProductoId] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [lote, setLote] = useState('');
  const [items, setItems] = useState([]);
  const [scannerVisible, setScannerVisible] = useState(false);

  const productos = useMemo(() => [
    ...(Array.isArray(consumables) ? consumables : []).map((item) => ({ ...item, categoria: 'consumables' })),
    ...(Array.isArray(reagents) ? reagents : []).map((item) => ({ ...item, categoria: 'reagents' })),
  ], [consumables, reagents]);

  const productoActual = productos.find((item) => item._id === productoId && item.categoria === categoria);

  const lotes = productoActual?.lotes?.length
    ? productoActual.lotes
    : [{ numero: productoActual?.lote || 'SIN-LOTE', cantidad: productoActual?.cantidad || 0 }];

  const seleccionarProducto = (id, cat) => {
    const producto = productos.find((item) => item._id === id && item.categoria === cat);
    setProductoId(id);
    setCategoria(cat);
    setLote(producto?.lotes?.[0]?.numero || producto?.lote || 'SIN-LOTE');
  };

  const buscarCodigo = (codigo) => {
    const producto = productos.find((item) => coincideCodigo(item, codigo));

    if (!producto) {
      message.warning(`No encontré ningún producto asociado al código ${codigo}.`);
      return;
    }

    seleccionarProducto(producto._id, producto.categoria);
    setScannerVisible(false);
    message.success(`Producto encontrado: ${producto.nombre}`);
  };

  const agregarItem = () => {
    if (!productoActual) return message.warning('Seleccioná un producto.');
    if (!cantidad || cantidad <= 0) return message.warning('Ingresá una cantidad válida.');

    const loteActual = lotes.find((item) => item.numero === lote) || lotes[0];
    const disponible = Number(loteActual?.cantidad || 0);
    if (cantidad > disponible) {
      return message.error(`Stock insuficiente. Disponible: ${disponible} ${productoActual.unidad || ''}`);
    }

    const existente = items.findIndex(
      (item) => item.productoId === productoActual._id && item.categoria === productoActual.categoria && item.lote === (lote || 'SIN-LOTE')
    );

    if (existente >= 0) {
      const copia = [...items];
      const nuevaCantidad = copia[existente].cantidad + Number(cantidad);
      if (nuevaCantidad > disponible) {
        return message.error(`La cantidad total supera el stock disponible (${disponible}).`);
      }
      copia[existente] = { ...copia[existente], cantidad: nuevaCantidad };
      setItems(copia);
    } else {
      setItems([
        ...items,
        {
          productoId: productoActual._id,
          producto: productoActual.nombre,
          categoria: productoActual.categoria,
          lote: lote || 'SIN-LOTE',
          cantidad: Number(cantidad),
          unidad: productoActual.unidad || '',
        },
      ]);
    }

    setCantidad(1);
  };

  const crearHoja = async () => {
    if (!items.length) return message.warning('Agregá al menos un producto al pedido.');

    try {
      await crearOrden({
        solicitante,
        destino,
        observaciones,
        items,
        creadoPor: 'Usuario',
      }).unwrap();

      setSolicitante('');
      setDestino('');
      setObservaciones('');
      setItems([]);
      message.success('Hoja de trabajo creada. Ahora el despacho puede descontar el stock.');
    } catch (error) {
      message.error(error?.data?.error || 'No se pudo crear la hoja de trabajo.');
    }
  };

  const confirmarDespacho = (orden, itemIndex) => {
    const item = orden.items[itemIndex];
    Modal.confirm({
      title: `Despachar ${item.producto}`,
      content: `Se descontarán ${item.cantidad} ${item.unidad || ''} del lote ${item.lote || 'SIN-LOTE'}. Esta acción queda registrada en Movimientos.`,
      okText: 'Sí, despachar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await despachar({
            id: orden._id,
            itemIndex,
            responsable: 'Usuario',
          }).unwrap();
          message.success(`Despacho registrado: ${item.producto}`);
        } catch (error) {
          message.error(error?.data?.error || 'No se pudo despachar el producto.');
        }
      },
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: 1100, padding: 25 }}>
      <Space align="center">
        <FileTextOutlined style={{ fontSize: 28 }} />
        <Title level={2} style={{ margin: 0 }}>Hoja de trabajo / Despachos</Title>
      </Space>
      <p>
        <Text type="secondary">Armá el pedido sin tocar el stock. El stock se descuenta recién cuando el encargado pulsa “Despachar”.</Text>
      </p>

      <Card title="📋 Nueva hoja de trabajo" style={{ marginBottom: 25 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input placeholder="Solicitante" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
          <Input placeholder="Destino / sector / lote de trabajo" value={destino} onChange={(e) => setDestino(e.target.value)} />
          <Input.TextArea rows={2} placeholder="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />

          <Divider>Agregar productos</Divider>

          <Space wrap style={{ width: '100%' }}>
            <Select
              showSearch
              style={{ minWidth: 320 }}
              placeholder="Seleccionar producto"
              value={productoId || undefined}
              optionFilterProp="children"
              onChange={(id) => {
                const producto = productos.find((item) => item._id === id);
                seleccionarProducto(id, producto?.categoria);
              }}
            >
              {productos.map((item) => (
                <Select.Option key={`${item.categoria}-${item._id}`} value={item._id}>
                  {item.nombre} — {nombreCategoria[item.categoria]} — stock {item.cantidad || 0}
                </Select.Option>
              ))}
            </Select>

            <Button icon={<CameraOutlined />} onClick={() => setScannerVisible(true)}>
              Escanear
            </Button>

            <Select
              style={{ minWidth: 220 }}
              value={lote || undefined}
              placeholder="Lote"
              disabled={!productoActual}
              onChange={setLote}
            >
              {lotes.map((item) => (
                <Select.Option key={item.numero} value={item.numero}>
                  {item.numero} — stock {item.cantidad || 0}
                </Select.Option>
              ))}
            </Select>

            <InputNumber min={0.01} value={cantidad} onChange={(value) => setCantidad(value || 1)} />
            <Button type="primary" icon={<PlusOutlined />} onClick={agregarItem}>Agregar</Button>
          </Space>

          {items.length > 0 && (
            <List
              bordered
              dataSource={items}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      key="delete"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={item.producto}
                    description={`${nombreCategoria[item.categoria]} · Lote ${item.lote} · ${item.cantidad} ${item.unidad}`}
                  />
                </List.Item>
              )}
            />
          )}

          <Button type="primary" size="large" icon={<FileTextOutlined />} loading={creando} onClick={crearHoja} disabled={!items.length}>
            Crear hoja de trabajo
          </Button>
        </Space>
      </Card>

      <Card title="📦 Pedidos pendientes de despacho">
        {cargandoOrdenes ? <Alert message="Cargando hojas de trabajo..." type="info" /> : null}
        {!cargandoOrdenes && !ordenes.length ? <Empty description="Todavía no hay hojas de trabajo" /> : null}

        <List
          dataSource={ordenes}
          renderItem={(orden) => (
            <List.Item key={orden._id}>
              <Card style={{ width: '100%' }}>
                <Space wrap>
                  <strong>{orden.numero}</strong>
                  <Tag color={orden.estado === 'completo' ? 'green' : orden.estado === 'parcial' ? 'orange' : orden.estado === 'cancelado' ? 'red' : 'blue'}>
                    {orden.estado.toUpperCase()}
                  </Tag>
                  <span>Solicitante: {orden.solicitante || '-'}</span>
                  <span>Destino: {orden.destino || '-'}</span>
                </Space>

                <List
                  size="small"
                  dataSource={orden.items}
                  renderItem={(item, itemIndex) => (
                    <List.Item
                      actions={[
                        item.despachado ? (
                          <Tag color="green" icon={<CheckCircleOutlined />} key="done">Despachado</Tag>
                        ) : orden.estado !== 'cancelado' ? (
                          <Button type="primary" size="small" loading={despachando} onClick={() => confirmarDespacho(orden, itemIndex)} key="dispatch">
                            Despachar y descontar stock
                          </Button>
                        ) : null,
                      ]}
                    >
                      <List.Item.Meta
                        title={item.producto}
                        description={`${item.cantidad} ${item.unidad || ''} · Lote ${item.lote || 'SIN-LOTE'}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </List.Item>
          )}
        />
      </Card>

      <Scanner
        visible={scannerVisible}
        onCancel={() => setScannerVisible(false)}
        onFound={buscarCodigo}
      />
    </div>
  );
};

export default WorkSheet;
