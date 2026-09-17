import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Alert,
  Button,
  Card,
  Collapse,
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
import {
  CameraOutlined,
  CopyOutlined,
  DatabaseOutlined,
  PlusOutlined,
  ScanOutlined,
} from '@ant-design/icons';

import {
  useAddItemMutation,
  useAddStockMutation,
  useGetConsumablesQuery,
  useGetReagentsQuery,
} from '../../services/items.js';
import {
  analizarContenidoQR,
  extraerCodigoQR,
  extraerGS1,
  normalizarCodigo,
  formatearDatosQR,
} from '../../qr-utils';
import Scanner from './Scanner.jsx';
import { setDisplay } from '../containers/displaySlice';

const { Title, Text } = Typography;

const CampoQR = ({ campo }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(130px, 0.8fr) minmax(0, 1.4fr)',
      gap: 10,
      padding: '9px 0',
      borderBottom: '1px solid #edf1ed',
    }}
  >
    <Text strong style={{ wordBreak: 'break-word' }}>
      {campo.label || campo.key}
    </Text>
    <Text style={{ wordBreak: 'break-word' }}>
      {String(campo.value ?? '—')}
    </Text>
  </div>
);

const ScannerPage = () => {
  const [visible, setVisible] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [categoria, setCategoria] = useState('reagents');
  const [solicitante, setSolicitante] = useState('');
  const [destino, setDestino] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  const [addItem, { isLoading: guardando }] = useAddItemMutation();
  const [addStock] = useAddStockMutation();
  const dispatch = useDispatch();

  const { data: consumables = [] } = useGetConsumablesQuery();
  const { data: reagents = [] } = useGetReagentsQuery();

  const productosExistentes = useMemo(
    () => [
      ...(Array.isArray(consumables) ? consumables : []),
      ...(Array.isArray(reagents) ? reagents : []),
    ],
    [consumables, reagents]
  );

  const buscarCodigo = async (codigo) => {
    const raw = String(codigo || '').trim();
    if (!raw) return;

    setVisible(false);
    setCargando(true);
    setResultado(null);

    const analizado = analizarContenidoQR(raw);
    const gs1 = extraerGS1(raw);
    const codigoExtraido = extraerCodigoQR(raw);

    const existente = productosExistentes.find((item) =>
      [
        item.codigoBarras,
        item.codigoQR,
        item.codigoQRExterno,
        item.codigo,
        item?.lotes?.[0]?.numero,
      ]
        .filter(Boolean)
        .map(normalizarCodigo)
        .includes(normalizarCodigo(raw)) ||
      [
        item.codigoBarras,
        item.codigoQR,
        item.codigoQRExterno,
        item.codigo,
      ]
        .filter(Boolean)
        .map(normalizarCodigo)
        .includes(normalizarCodigo(codigoExtraido))
    );

    if (existente) {
      setResultado({
        codigo: raw,
        producto: {
          ...existente,
          lote:
            existente?.lotes?.[0]?.numero ||
            existente.lote ||
            '',
        },
        origen: 'miru',
        existente: true,
        tipoCodigo: 'Código reconocido por MIRÚ',
        datosQR: formatearDatosQR(raw),
      });
      setCargando(false);
      message.success(`Producto encontrado: ${existente.nombre}`);
      return;
    }

    try {
      let productoImportado = null;
      let origen = /^https?:\/\//i.test(raw) ? 'qr' : 'barcode';
      let respuestaExterna = null;

      // QR de Logística Rojas: si el QR contiene el identificador
      // de composición, recuperamos los datos publicados.
      const pareceUrl = /^https?:\/\//i.test(raw);
      const pareceIdentificadorRojas =
        /^[a-f0-9]{20,}$/i.test(codigoExtraido || '');

      if ((pareceUrl || pareceIdentificadorRojas) && codigoExtraido) {
        try {
          const response = await fetch(
            `/qr/lookup?code=${encodeURIComponent(codigoExtraido)}`
          );

          if (response.ok) {
            const proxyResponse = await response.json();
            respuestaExterna = proxyResponse?.data || null;
            const detalle = respuestaExterna?.requesterDetails?.[0];

            if (detalle) {
              productoImportado = {
                nombre: detalle.product || '',
                codigoBarras: detalle.code || '',
                codigoQR: raw,
                codigoQRExterno:
                  respuestaExterna.compositionQrCode || '',
                compositionQrCode:
                  respuestaExterna.compositionQrCode || '',
                lote: detalle.lot || '',
                cantidad: Number(detalle.quantity) || 0,
                unidad: detalle.measureType || '',
                pedido: respuestaExterna.orderNumber || '',
                pallet: respuestaExterna.number ?? '',
                cliente: detalle.requesterName || '',
                localidad: detalle.requesterPlace || '',
                transportista:
                  respuestaExterna.transportationName || '',
                chofer:
                  respuestaExterna.transportationDriverName || '',
                equipo:
                  respuestaExterna.transportationDocNumber || '',
                patenteCamion:
                  respuestaExterna.motorPlate || '',
                patenteAcoplado:
                  respuestaExterna.trailerPlate || '',
                numeroEntrega:
                  detalle.deliveryNumber || '',
              };

              origen = 'logistica-rojas';
            }
          }
        } catch (externalError) {
          console.info(
            'MIRÚ: no se pudo consultar la composición externa.',
            externalError
          );
        }
      }

      if (!productoImportado) {
        const json =
          analizado.objeto &&
          typeof analizado.objeto === 'object'
            ? analizado.objeto
            : {};

        // Tomamos nombres comunes sin inventar valores.
        const campo = (names) => {
          const found = analizado.campos.find((x) =>
            names.some(
              (name) =>
                normalizarCodigo(x.key) === normalizarCodigo(name) ||
                normalizarCodigo(x.label) === normalizarCodigo(name)
            )
          );
          return found?.value || '';
        };

        productoImportado = {
          nombre:
            campo(['producto', 'product', 'nombre']) || '',
          codigoBarras:
            campo(['codigoBarras', 'codigo de barras', 'ean', 'gtin']) ||
            gs1.gtin ||
            '',
          codigoQR: raw,
          lote:
            campo(['lote', 'lot']) ||
            gs1.lote ||
            '',
          cantidad:
            Number(
              campo(['cantidad', 'contenido', 'quantity']) ||
              gs1.cantidad ||
              1
            ) || 0,
          unidad:
            campo(['unidad', 'unit', 'measureType']) ||
            'unidad',
          vencimiento:
            campo(['vencimiento', 'fecha vencimiento', 'expiration']) ||
            gs1.vencimiento ||
            '',
          gtin: gs1.gtin || '',
          cultivar: campo(['cultivar', 'variedad']),
          partida: campo(['partida']),
          contenido: campo(['contenido', 'content']),
          produccion: campo(['produccion', 'producción', 'production']),
          bolsasPorPallet: campo([
            'bolsas por pallet',
            'bolsasPorPallet',
          ]),
          grado: campo(['grado']),
          placaSugerida: campo([
            'placa sugerida',
            'placaSugerida',
          ]),
          material: campo(['material']),
          numeroPallet: campo([
            'nro. de pallet',
            'nro pallet',
            'numero de pallet',
            'pallet',
          ]),
          pesoBolsa: campo([
            'peso de bolsa',
            'pesoBolsa',
          ]),
          datosOriginales:
            Object.keys(json).length ? json : undefined,
        };
      }

      setResultado({
        codigo: raw,
        producto: productoImportado,
        origen,
        existente: false,
        tipoCodigo:
          pareceUrl || origen === 'logistica-rojas'
            ? 'QR'
            : 'Código de barras / QR',
        contenidoQR: raw,
        datosQR: {
          ...formatearDatosQR(raw),
          respuestaExterna,
        },
      });
    } catch (error) {
      setResultado({
        codigo: raw,
        producto: {
          nombre: '',
          codigoBarras: gs1.gtin || '',
          codigoQR: raw,
          lote: gs1.lote || '',
          cantidad: gs1.cantidad || 1,
          unidad: 'unidad',
          vencimiento: gs1.vencimiento || '',
          gtin: gs1.gtin || '',
        },
        origen: 'qr',
        existente: false,
        tipoCodigo: 'QR',
        contenidoQR: raw,
        datosQR: formatearDatosQR(raw),
        aviso:
          'El código fue leído, pero no se pudo consultar información externa. El contenido original queda guardado.',
      });
    } finally {
      setCargando(false);
    }
  };

  const actualizarProducto = (campo, value) => {
    setResultado((actual) => ({
      ...actual,
      producto: {
        ...actual.producto,
        [campo]: value,
      },
    }));
  };

  const copiarContenido = async () => {
    const raw = resultado?.contenidoQR || resultado?.codigo || '';
    try {
      await navigator.clipboard.writeText(raw);
      message.success('Contenido QR copiado');
    } catch (_) {
      message.warning('No se pudo copiar automáticamente.');
    }
  };

  const guardarProducto = async () => {
    const producto = resultado?.producto;
    if (!producto) return;

    if (!producto.nombre?.trim()) {
      return message.warning(
        'Ingresá el nombre del producto antes de guardarlo.'
      );
    }

    if (
      categoria === 'consumables' &&
      !solicitante.trim()
    ) {
      return message.warning(
        'Para semillas ingresá a quién va destinado.'
      );
    }

    const lote =
      producto.lote ||
      `SIN-LOTE-${Date.now()}`;

    const cantidad =
      Number(producto.cantidad) || 0;

    const datosQR = {
      ...(resultado.datosQR || {}),
      camposProducto: {
        produccion: producto.produccion || '',
        cultivar: producto.cultivar || '',
        partida: producto.partida || '',
        contenido: producto.contenido || '',
        bolsasPorPallet: producto.bolsasPorPallet || '',
        grado: producto.grado || '',
        placaSugerida: producto.placaSugerida || '',
        lote: producto.lote || '',
        material: producto.material || '',
        numeroPallet: producto.numeroPallet || '',
        pesoBolsa: producto.pesoBolsa || '',
      },
      escaneadoEn: new Date().toISOString(),
    };

    const body = {
      nombre: producto.nombre.trim(),
      codigoBarras: producto.codigoBarras || '',
      codigoQR: producto.codigoQR || resultado.codigo || '',
      codigoQRExterno:
        producto.codigoQRExterno ||
        resultado.codigo ||
        '',
      // El stock físico se crea con addStock para generar el pallet.
      // Por eso el alta inicial queda en cero y se evita duplicar la cantidad.
      cantidad: 0,
      unidad: producto.unidad || 'unidad',
      vencimiento: producto.vencimiento || '',
      ubicacion: ubicacion.trim(),
      proveedor:
        producto.proveedor ||
        'Logística Rojas',
      solicitante:
        categoria === 'consumables'
          ? solicitante.trim()
          : '',
      destino:
        categoria === 'consumables'
          ? destino.trim()
          : '',
      descripcion:
        producto.pedido
          ? `Pedido ${producto.pedido}`
          : '',
      datosQR,
      lotes: [],
    };

    try {
      const respuesta = await addItem({
        categoria,
        ...body,
      }).unwrap();

      const productoGuardado =
        respuesta?.producto;

      if (!productoGuardado?._id) {
        throw new Error(
          'MIRÚ no devolvió el producto creado.'
        );
      }

      // Creamos también el pallet real en MongoDB. Así el mapa
      // puede asignarle una posición física y luego moverlo.
      let palletId = '';
      let stockRespuesta = null;

      if (
        (categoria === 'consumables' ||
          categoria === 'reagents') &&
        cantidad > 0
      ) {
        stockRespuesta =
          await addStock({
            categoria,
            id: productoGuardado._id,
            cantidad,
            lote,
            vencimiento:
              producto.vencimiento || '',
            proveedor:
              producto.proveedor ||
              'Logística Rojas',
            numeroPallet:
              producto.numeroPallet ||
              undefined,
            codigo:
              resultado.codigo || '',
          }).unwrap();

        palletId =
          stockRespuesta?.pallet?._id ||
          '';
      }

      const listoParaMapa = {
        ...productoGuardado,
        categoria,
        palletId,
        lote,
        numeroPallet:
          producto.numeroPallet ||
          stockRespuesta?.pallet?.numeroPallet ||
          '',
        _pendingPlacement: true,
      };

      sessionStorage.setItem(
        'miru_pending_warehouse_placement',
        JSON.stringify({
          product: listoParaMapa,
          categoria,
          scannedCode: resultado.codigo,
          createdAt: new Date().toISOString(),
        })
      );

      message.success(
        'Producto guardado. Elegí ahora la posición física del pallet.'
      );

      setResultado(null);
      setSolicitante('');
      setDestino('');
      setUbicacion('');
      dispatch(setDisplay('warehouse-map'));
    } catch (error) {
      console.error(
        'MIRÚ: error guardando producto escaneado',
        error
      );
      message.error(
        error?.data?.message ||
          error?.data?.error ||
          error?.message ||
          'No se pudo guardar el producto.'
      );
    }
  };

  const producto = resultado?.producto;
  const datos = resultado?.datosQR || {};
  const campos =
    Array.isArray(datos.campos)
      ? datos.campos
      : [];
  const gs1Resultado =
    resultado?.codigo
      ? extraerGS1(resultado.codigo)
      : {};

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1050,
        padding: '18px 8px 40px',
      }}
    >
      <Card
        style={{
          marginBottom: 18,
          background:
            'linear-gradient(135deg,#eff8ef 0%,#ffffff 65%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              flex: '0 0 52px',
              borderRadius: 15,
              display: 'grid',
              placeItems: 'center',
              background: '#397348',
              color: '#fff',
              fontSize: 25,
            }}
          >
            <ScanOutlined />
          </div>

          <div>
            <Title level={2} style={{ margin: 0 }}>
              Escanear producto
            </Title>
            <Text type="secondary">
              Leé el QR, revisá todos sus datos y,
              si querés, incorporalo a MIRÚ.
            </Text>
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<CameraOutlined />}
          style={{
            marginTop: 20,
            height: 50,
            borderRadius: 12,
          }}
          onClick={() => {
            setResultado(null);
            setVisible(true);
          }}
        >
          Abrir cámara y escanear
        </Button>
      </Card>

      {cargando && (
        <Card style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            Procesando el contenido del código…
          </div>
        </Card>
      )}

      {resultado && !producto && (
        <Alert
          type="error"
          showIcon
          message="No se pudo procesar la lectura"
          description={resultado.error}
        />
      )}

      {producto && (
        <Card
          title="📦 Datos detectados"
          style={{
            borderRadius: 16,
          }}
        >
          {resultado.aviso && (
            <Alert
              type="warning"
              showIcon
              style={{
                marginBottom: 16,
                borderRadius: 10,
              }}
              message="Código leído"
              description={resultado.aviso}
            />
          )}

          <Alert
            type={resultado.existente ? 'info' : 'success'}
            showIcon
            style={{
              marginBottom: 18,
              borderRadius: 10,
            }}
            message={
              resultado.existente
                ? 'Producto ya registrado'
                : resultado.tipoCodigo
            }
            description={
              resultado.existente
                ? 'MIRÚ encontró una ficha existente.'
                : 'Revisá los datos y completá los campos que falten antes de guardar.'
            }
          />

          <Card
            size="small"
            type="inner"
            title="🔎 Contenido original del QR"
            extra={
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={copiarContenido}
              >
                Copiar
              </Button>
            }
            style={{
              marginBottom: 18,
              borderRadius: 12,
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 9,
                background: '#f6f8f6',
                wordBreak: 'break-all',
                fontFamily:
                  'ui-monospace, SFMono-Regular, Consolas, monospace',
                fontSize: 13,
              }}
            >
              {resultado.contenidoQR ||
                resultado.codigo}
            </div>

            <div
              style={{
                marginTop: 10,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              <Tag color="green">
                {datos.tipo || 'QR'}
              </Tag>
              {gs1Resultado.gtin && (
                <Tag>
                  GTIN: {gs1Resultado.gtin}
                </Tag>
              )}
              {gs1Resultado.lote && (
                <Tag>
                  Lote: {gs1Resultado.lote}
                </Tag>
              )}
              {gs1Resultado.vencimiento && (
                <Tag>
                  Vto: {gs1Resultado.vencimiento}
                </Tag>
              )}
              {gs1Resultado.cantidad > 0 && (
                <Tag>
                  Cantidad: {gs1Resultado.cantidad}
                </Tag>
              )}
            </div>
          </Card>

          {campos.length > 0 && (
            <Card
              size="small"
              type="inner"
              title={`📋 Todos los datos encontrados (${campos.length})`}
              style={{
                marginBottom: 18,
                borderRadius: 12,
              }}
            >
              {campos.map((campo, index) => (
                <CampoQR
                  key={`${campo.key}-${index}`}
                  campo={campo}
                />
              ))}
            </Card>
          )}

          <Descriptions
            bordered
            column={1}
            size="small"
            title="Ficha para MIRÚ"
          >
            <Descriptions.Item label="Producto">
              {resultado.existente ? (
                <strong>{producto.nombre}</strong>
              ) : (
                <Input
                  value={producto.nombre || ''}
                  onChange={(e) =>
                    actualizarProducto(
                      'nombre',
                      e.target.value
                    )
                  }
                  placeholder="Nombre del producto"
                />
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Código de barras">
              {producto.codigoBarras || '—'}
            </Descriptions.Item>

            <Descriptions.Item label="Código QR">
              <Text copyable>
                {producto.codigoQR || resultado.codigo || '—'}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="GTIN">
              {producto.gtin || gs1Resultado.gtin || '—'}
            </Descriptions.Item>

            {[
              ['produccion', 'Producción'],
              ['cultivar', 'Cultivar'],
              ['partida', 'Partida'],
              ['bolsasPorPallet', 'Bolsas por pallet'],
              ['grado', 'Grado'],
              ['placaSugerida', 'Placa sugerida'],
              ['material', 'Material'],
              ['numeroPallet', 'Nro. de pallet'],
              ['pesoBolsa', 'Peso de bolsa'],
            ].map(([key, label]) =>
              producto[key] ? (
                <Descriptions.Item
                  label={label}
                  key={key}
                >
                  <Input
                    value={producto[key]}
                    onChange={(e) =>
                      actualizarProducto(
                        key,
                        e.target.value
                      )
                    }
                  />
                </Descriptions.Item>
              ) : null
            )}

            <Descriptions.Item label="Lote">
              <Input
                value={producto.lote || ''}
                onChange={(e) =>
                  actualizarProducto(
                    'lote',
                    e.target.value
                  )
                }
              />
            </Descriptions.Item>

            <Descriptions.Item label="Cantidad">
              <Input
                type="number"
                value={producto.cantidad ?? ''}
                onChange={(e) =>
                  actualizarProducto(
                    'cantidad',
                    Number(e.target.value) || 0
                  )
                }
              />
            </Descriptions.Item>

            <Descriptions.Item label="Unidad">
              <Input
                value={producto.unidad || ''}
                onChange={(e) =>
                  actualizarProducto(
                    'unidad',
                    e.target.value
                  )
                }
              />
            </Descriptions.Item>

            <Descriptions.Item label="Vencimiento">
              <Input
                value={producto.vencimiento || ''}
                onChange={(e) =>
                  actualizarProducto(
                    'vencimiento',
                    e.target.value
                  )
                }
              />
            </Descriptions.Item>

            {producto.pallet && (
              <Descriptions.Item label="Pallet">
                <Tag color="blue">
                  {producto.pallet}
                </Tag>
              </Descriptions.Item>
            )}

            {producto.pedido && (
              <Descriptions.Item label="Orden">
                {producto.pedido}
              </Descriptions.Item>
            )}

            {producto.cliente && (
              <Descriptions.Item label="Cliente">
                {producto.cliente}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(220px,1fr))',
              gap: 12,
            }}
          >
            <div>
              <Text strong>Tipo de mercadería</Text>
              <Select
                style={{
                  width: '100%',
                  marginTop: 6,
                }}
                value={categoria}
                onChange={setCategoria}
              >
                <Select.Option value="reagents">
                  🧪 Agroquímico
                </Select.Option>
                <Select.Option value="consumables">
                  🌱 Semilla
                </Select.Option>
              </Select>
            </div>

            {categoria === 'consumables' && (
              <div>
                <Text strong>¿A quién va?</Text>
                <Input
                  style={{ marginTop: 6 }}
                  value={solicitante}
                  onChange={(e) =>
                    setSolicitante(e.target.value)
                  }
                  placeholder="Cliente / productor"
                />
              </div>
            )}

            {categoria === 'consumables' && (
              <div>
                <Text strong>Destino</Text>
                <Input
                  style={{ marginTop: 6 }}
                  value={destino}
                  onChange={(e) =>
                    setDestino(e.target.value)
                  }
                  placeholder="Campo / localidad / destino"
                />
              </div>
            )}

            <div>
              <Text strong>
                Ubicación inicial (opcional)
              </Text>
              <Input
                style={{ marginTop: 6 }}
                value={ubicacion}
                onChange={(e) =>
                  setUbicacion(e.target.value)
                }
                placeholder="También podés elegirla en el mapa"
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 20,
            }}
          >
            {!resultado.existente && (
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                loading={guardando}
                onClick={guardarProducto}
              >
                Guardar producto + pallet
              </Button>
            )}

            <Button
              size="large"
              onClick={() => setResultado(null)}
            >
              Limpiar lectura
            </Button>
          </div>

          <Collapse
            ghost
            style={{ marginTop: 18 }}
            items={[
              {
                key: 'raw-json',
                label: '🧾 Ver datos técnicos completos guardados',
                children: (
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      background: '#f6f8f6',
                      padding: 12,
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(
                      resultado.datosQR ||
                        resultado.producto ||
                        {},
                      null,
                      2
                    )}
                  </pre>
                ),
              },
            ]}
          />
        </Card>
      )}

      {!resultado && !cargando && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Todavía no escaneaste ningún producto"
        />
      )}

      <Scanner
        visible={visible}
        onCancel={() => setVisible(false)}
        onFound={buscarCodigo}
      />
    </div>
  );
};

export default ScannerPage;
