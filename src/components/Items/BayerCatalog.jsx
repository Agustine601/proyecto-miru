import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  SafetyCertificateOutlined,
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';

import { useAddItemMutation } from '../../services/items';
import {
  bayerProducts,
  bayerTypes,
  bayerSeeds,
  bayerSeedTypes,
} from '../../data/bayerProducts';
import { quimecoProducts, rizobacterProducts } from '../../data/providerProducts';

const { Panel } = Collapse;

const Wrapper = styled.div`
  width: 100%;
  max-width: 1180px;
  padding: 24px 22px 50px;
`;

const Hero = styled(Card)`
  margin-bottom: 22px;
  overflow: hidden;
  border: none !important;
  background: linear-gradient(135deg, #dcefd9 0%, #f8fbf7 60%, #eef6ed 100%) !important;

  .ant-card-body {
    padding: 28px;
  }
`;

const ProductCard = styled(Card)`
  height: 100%;
  border-radius: 16px !important;
  border: 1px solid #d9e6d7 !important;
  box-shadow: 0 5px 16px rgba(35, 69, 43, 0.07);

  .ant-card-body {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
`;

const IconBox = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 28px;
  background: #edf6eb;
  margin-bottom: 14px;
`;

const ProductDescription = styled.p`
  color: #526057;
  line-height: 1.55;
  flex: 1;
  margin: 10px 0 16px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  align-items: center;
`;

const BayerCatalog = () => {
  const [proveedor, setProveedor] = useState('bayer');
  const [seccion, setSeccion] = useState('agroquimicos');
  const [tipo, setTipo] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [producto, setProducto] = useState(null);
  const [lote, setLote] = useState('');
  const [cantidad, setCantidad] = useState(0);
  const [unidad, setUnidad] = useState('L');
  const [vencimiento, setVencimiento] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [addItem, { isLoading }] = useAddItemMutation();

  const esSemilla = proveedor === 'bayer' && seccion === 'semillas';
  const proveedorActual = proveedor === 'quimeco'
    ? { nombre: 'Quimeco', url: 'https://quimeco.com.ar/productos/', products: quimecoProducts }
    : proveedor === 'rizobacter'
      ? { nombre: 'Rizobacter', url: 'https://www.rizobacter.com/ar/es/productos/', products: rizobacterProducts }
      : { nombre: 'Bayer', url: 'https://www.agro.bayer.com.ar/cp', products: esSemilla ? bayerSeeds : bayerProducts };
  const catalogoActual = proveedorActual.products;
  const tiposActuales = [...new Set(['Todos', ...catalogoActual.map((item) => item.tipo).filter(Boolean)])];
  const categoriaInventario = esSemilla ? 'consumables' : 'reagents';
  const etiquetaCategoria = esSemilla ? 'Semillas' : 'Agroquímicos';

  const productos = useMemo(() => {
    if (tipo === 'Todos') return catalogoActual;
    return catalogoActual.filter((item) => item.tipo === tipo);
  }, [catalogoActual, tipo]);

  const cambiarProveedor = (valor) => {
    setProveedor(valor);
    setSeccion('agroquimicos');
    setTipo('Todos');
    setBusqueda('');
  };

  const cambiarSeccion = (valor) => {
    setSeccion(valor);
    setTipo('Todos');
    setBusqueda('');
  };

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((item) =>
      `${item.nombre} ${item.descripcion}`.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const abrirCarga = (item) => {
    setProducto(item);
    setLote('');
    setCantidad(0);
    setUnidad(item.categoria === 'consumables' ? 'bolsa' : 'L');
    setVencimiento('');
    setUbicacion('');
  };

  const cerrar = () => {
    if (!isLoading) setProducto(null);
  };

  const guardar = async () => {
    if (!lote.trim()) {
      message.warning('Ingresá el número de lote.');
      return;
    }

    if (Number(cantidad) <= 0) {
      message.warning('Ingresá una cantidad mayor a cero.');
      return;
    }

    try {
      await addItem({
        categoria: producto.categoria || categoriaInventario,
        nombre: producto.region
          ? `${producto.nombre} — ${producto.region}`
          : producto.nombre,
        formula: producto.categoria === 'consumables' ? undefined : '',
        cas: producto.categoria === 'consumables' ? undefined : '',
        proveedor: proveedorActual.nombre,
        vencimiento,
        cantidad: Number(cantidad),
        stockMinimo: 10,
        unidad,
        ubicacion,
        descripcion: `${producto.tipo} ${proveedorActual.nombre}${producto.region ? ` · Región ${producto.region}` : ''}${producto.madurezRelativa ? ` · MR ${producto.madurezRelativa}` : ''}${producto.tecnologia ? ` · Tecnología ${producto.tecnologia}` : ''}. ${producto.descripcion}`,
        lotes: [
          {
            numero: lote.trim(),
            cantidad: Number(cantidad),
            vencimiento,
            ubicacion,
            proveedor: proveedorActual.nombre,
          },
        ],
      }).unwrap();

      message.success(`${producto.nombre} agregado al inventario.`);
      cerrar();
    } catch (error) {
      message.error(error?.data?.error || 'No se pudo agregar el producto.');
    }
  };

  return (
    <Wrapper>
      <Hero>
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={17}>
            <Tag color="green">CATÁLOGOS DE PROVEEDORES</Tag>
            <Typography.Title level={2} style={{ margin: '10px 0 6px' }}>
              Catálogo {proveedorActual.nombre} para MIRÚ
            </Typography.Title>
            <Typography.Paragraph style={{ maxWidth: 760, marginBottom: 0 }}>
              Elegí el catálogo que querés consultar. Consultá los productos del proveedor seleccionado y cargalos directamente al inventario.
            </Typography.Paragraph>
          </Col>
          <Col xs={24} md={7} style={{ textAlign: 'center' }}>
            <SafetyCertificateOutlined style={{ fontSize: 72, color: '#397348' }} />
            <div style={{ marginTop: 8, fontWeight: 700, color: '#285832' }}>Bayer Agro</div>
          </Col>
        </Row>
      </Hero>

      <FilterBar>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
          {['bayer', 'quimeco', 'rizobacter'].map((p) => (
            <Button
              key={p}
              type={proveedor === p ? 'primary' : 'default'}
              onClick={() => cambiarProveedor(p)}
              style={{ fontWeight: 800 }}
            >
              {p === 'bayer' ? '🟢 Bayer' : p === 'quimeco' ? '🟠 Quimeco' : '🔵 Rizobacter'}
            </Button>
          ))}
          {proveedor === 'bayer' && (
            <Select value={seccion} onChange={cambiarSeccion} style={{ minWidth: 170 }}>
              <Select.Option value="agroquimicos">🧪 Agroquímicos</Select.Option>
              <Select.Option value="semillas">🌱 Semillas</Select.Option>
            </Select>
          )}
        </div>
        <strong>Filtrar:</strong>
        <Select value={tipo} onChange={setTipo} style={{ minWidth: 180 }}>
          {tiposActuales.map((item) => (
            <Select.Option key={item} value={item}>{item}</Select.Option>
          ))}
        </Select>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          style={{ width: 260 }}
        />
        <Tag>{productosFiltrados.length} {etiquetaCategoria.toLowerCase()}</Tag>
      </FilterBar>

      <Row gutter={[18, 18]}>
        {productosFiltrados.map((item) => (
          <Col xs={24} sm={12} lg={8} key={`${proveedor}-${item.nombre}-${item.region || item.tipo}`}>
            <ProductCard>
              {item.imagen ? (
                <img
                  src={item.imagen}
                  alt={item.nombre}
                  style={{
                    width: '100%',
                    height: 150,
                    objectFit: 'contain',
                    borderRadius: 12,
                    marginBottom: 14,
                    background: '#fff',
                  }}
                />
              ) : (
                <IconBox>{item.icono}</IconBox>
              )}
              <Tag color={item.color}>{item.tipo}</Tag>
              <Typography.Title level={4} style={{ margin: '12px 0 0' }}>
                {item.nombre}
              </Typography.Title>
              {item.region && <p><strong>Región:</strong> {item.region}</p>}
              {item.madurezRelativa && <p><strong>Madurez relativa:</strong> {item.madurezRelativa}</p>}
              {item.tecnologia && <p><strong>Tecnología:</strong> {item.tecnologia}</p>}
              <ProductDescription>{item.descripcion}</ProductDescription>

              {item.momentoAplicacion && (
                <Tag color="volcano" style={{ marginBottom: 12 }}>
                  {item.momentoAplicacion}
                </Tag>
              )}

              {item.detalles && (
                <Collapse ghost size="small" style={{ marginBottom: 12 }}>
                  <Panel header="Detalles técnicos" key="detalles">
                    {Object.entries(item.detalles).map(([etiqueta, valor]) => (
                      <p key={etiqueta} style={{ marginBottom: 6 }}>
                        <strong>{etiqueta}:</strong> {valor}
                      </p>
                    ))}
                  </Panel>
                </Collapse>
              )}

              {item.requiereVerificacion && (
                <Tag color="gold" style={{ marginBottom: 12 }}>
                  Verificar ficha vigente
                </Tag>
              )}

              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={() => abrirCarga(item)}
              >
                Cargar al inventario
              </Button>

              <Button
                type="link"
                icon={<LinkOutlined />}
                href={item.url || proveedorActual.url}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: 4 }}
              >
                Ver fuente {proveedorActual.nombre}
              </Button>
            </ProductCard>
          </Col>
        ))}
      </Row>

      <Modal
        title={`Cargar ${producto?.nombre || ''} en ${etiquetaCategoria}`}
        visible={Boolean(producto)}
        onCancel={cerrar}
        onOk={guardar}
        okText="Guardar producto"
        cancelText="Cancelar"
        confirmLoading={isLoading}
        centered
      >
        <Form layout="vertical">
          <Form.Item label="Producto">
            <Input value={producto?.nombre || ''} disabled />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item label="Número de lote" required>
                <Input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Ej. BA-2026-001" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Cantidad" required>
                <InputNumber min={0} value={cantidad} onChange={(value) => setCantidad(value || 0)} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item label="Unidad">
                <Select value={unidad} onChange={setUnidad}>
                  {producto?.categoria === 'consumables' && <Select.Option value="bolsa">bolsa</Select.Option>}
                  <Select.Option value="L">L</Select.Option>
                  <Select.Option value="kg">kg</Select.Option>
                  <Select.Option value="unidad">unidad</Select.Option>
                  <Select.Option value="bidón">bidón</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item label="Vencimiento">
                <Input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Ubicación">
            <Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Ej. Depósito A - Estante 3" />
          </Form.Item>
        </Form>
      </Modal>
    </Wrapper>
  );
};

export default BayerCatalog;
