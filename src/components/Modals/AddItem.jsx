import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  InputNumber,
  Card,
  Divider,
  Tag,
  Alert,
  message,
} from 'antd';

import {
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

import {
  useAddItemMutation,
  useAddStockMutation,
  useLazyLookupItemQuery,
} from '../../services/items.js';
import Scanner from '../Items/Scanner.jsx';
import { extraerCodigoQR, extraerGS1 } from '../../qr-utils.js';
import { setDisplay } from '../containers/displaySlice';

const StyledButton = styled(Button)`
  margin-top: 1rem;
  margin-right: 1rem;
`;


const QRPreview = ({ codigo }) => {
  const qrRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const render = () => {
      const host = qrRef.current;
      if (!host || !codigo) return;
      host.innerHTML = '';
      const QR = window.QRCode;
      if (typeof QR === 'function') {
        try {
          new QR(host, {
            text: codigo,
            width: 240,
            height: 240,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QR.CorrectLevel?.M ?? 0,
          });
          setReady(true);
          return;
        } catch (e) {
          console.error('No se pudo generar el QR local:', e);
        }
      }
      setReady(false);
      const img = document.createElement('img');
      img.src = `/qr?data=${encodeURIComponent(codigo)}&size=240&v=5`;
      img.width = 240;
      img.height = 240;
      img.alt = `Código QR ${codigo}`;
      img.style.display = 'block';
      img.style.margin = '0 auto';
      img.onerror = () => {
        img.remove();
        const err = document.createElement('div');
        err.style.padding = '30px 10px';
        err.style.color = '#b42318';
        err.textContent = 'No se pudo generar el QR. Recargá MIRÚ e intentá nuevamente.';
        host.appendChild(err);
      };
      host.appendChild(img);
    };
    render();
    const timer = setTimeout(render, 400);
    return () => clearTimeout(timer);
  }, [codigo]);

  const imprimir = () => {
    const host = qrRef.current;
    if (!host) return;
    const ventana = window.open('', '_blank', 'width=420,height=520');
    if (!ventana) return;
    ventana.document.write(`<!doctype html><html><head><title>QR ${codigo}</title><style>body{font-family:Arial;text-align:center;padding:30px}img{max-width:300px} .codigo{font-family:monospace;font-size:18px;margin-top:12px}</style></head><body><h2>MIRÚ</h2>${host.innerHTML}<div class="codigo">${codigo}</div><script>window.onload=function(){window.print();}</script></body></html>`);
    ventana.document.close();
  };

  return (
    <div style={{ marginTop: 10, padding: 16, border: '2px solid #23452b', borderRadius: 12, textAlign: 'center', background: '#fff' }}>
      <div style={{ fontWeight: 700, color: '#23452b', marginBottom: 8 }}>✓ QR DEL PRODUCTO</div>
      <div ref={qrRef} style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 16 }}>{codigo}</div>
      <Button style={{ marginTop: 10 }} onClick={imprimir}>🖨 Imprimir QR</Button>
      {!ready && <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>Generando QR…</div>}
    </div>
  );
};

const loteInicial = {
  numero: '',
  cantidad: 0,
  vencimiento: '',
  ubicacion: '',
  proveedor: '',
};

const AddItem = () => {
  const [visible, setVisible] = useState(false);

  const [addItem, { isLoading }] =
    useAddItemMutation();
  const [buscarProducto] = useLazyLookupItemQuery();
  const [agregarStock, { isLoading: agregandoStock }] = useAddStockMutation();
  const dispatch = useDispatch();

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [apodo, setApodo] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [destino, setDestino] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [codigoQR, setCodigoQR] = useState('');
  const [codigoQRExterno, setCodigoQRExterno] = useState('');
  const [consultaQR, setConsultaQR] = useState(null);
  const [consultaVisible, setConsultaVisible] = useState(false);
  const [duplicadoVisible, setDuplicadoVisible] = useState(false);
  const [duplicadoInfo, setDuplicadoInfo] = useState(null);
  const [ingresoCantidad, setIngresoCantidad] = useState(0);
  const [ingresoLote, setIngresoLote] = useState('');
  const [ingresoPallet, setIngresoPallet] = useState('');

  const generarCodigoQR = () => {
    const ahora = Date.now().toString(36).toUpperCase();
    const aleatorio = Math.random().toString(36).slice(2, 7).toUpperCase();
    setCodigoQR(`MIRU-${ahora}-${aleatorio}`);
  };

  useEffect(() => {
    if (visible && !codigoQR) generarCodigoQR();
  }, [visible]);
  const [proveedor, setProveedor] = useState('');
  const [unidad, setUnidad] = useState('');
  const [stockMinimo, setStockMinimo] = useState(10);
  const [descripcion, setDescripcion] = useState('');

  const [lotes, setLotes] = useState([
    { ...loteInicial },
  ]);

  const agregarLote = () => {
    setLotes([
      ...lotes,
      { ...loteInicial },
    ]);
  };

  const eliminarLote = (indice) => {
    if (lotes.length === 1) {
      message.warning(
        'El producto debe tener al menos un lote.'
      );
      return;
    }

    setLotes(
      lotes.filter(
        (_, index) => index !== indice
      )
    );
  };

  const actualizarLote = (
    indice,
    campo,
    valor
  ) => {
    setLotes((lotesActuales) =>
      lotesActuales.map(
        (lote, index) =>
          index === indice
            ? {
                ...lote,
                [campo]: valor,
              }
            : lote
      )
    );
  };

  const aplicarLoteEscaneado = (datos) => {
    setLotes((actuales) => {
      const base = actuales[0] || { ...loteInicial };
      return [{
        ...base,
        numero: datos.lote || base.numero || '',
        cantidad: Number(datos.cantidad ?? base.cantidad ?? 0),
        vencimiento: datos.vencimiento || base.vencimiento || '',
        proveedor: datos.proveedor || base.proveedor || '',
      }, ...actuales.slice(1)];
    });
  };

  const abrirScanner = () => {
    if (scanning) return;

    // Cada apertura usa una instancia nueva del lector.
    setScannerKey((key) => key + 1);
    setScannerVisible(true);
  };

  const cerrarScanner = () => {
    setScannerVisible(false);
    setScanning(false);
    setScannerKey((key) => key + 1);
  };

  const consultarQR = async (raw) => {
    const texto = String(raw || '').trim();
    const gs1 = extraerGS1(texto);
    const esUrl = /^https?:\/\//i.test(texto);
    const codigoExtraido = extraerCodigoQR(texto);
    const resultado = {
      raw: texto,
      tipo: esUrl ? 'QR / URL externa' : (gs1.gtin ? 'Código GS1' : 'QR / código'),
      gtin: gs1.gtin || '', lote: gs1.lote || '', cantidad: Number(gs1.cantidad || 0),
      vencimiento: gs1.vencimiento || '', producto: '', proveedor: '', solicitante: '', destino: '',
      origen: 'Lectura local',
    };
    if (esUrl && codigoExtraido) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 7000);
      try {
        const url = `https://logistica-rojas.com.ar/services/api/work-order/dispatch/public/composition/${encodeURIComponent(codigoExtraido)}`;
        const response = await fetch(url, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          const detalle = data?.requesterDetails?.[0];
          if (detalle) {
            resultado.producto = (detalle.product || '').trim();
            resultado.gtin = (detalle.code || resultado.gtin || '').trim();
            resultado.lote = detalle.lot || resultado.lote;
            resultado.cantidad = Number(detalle.quantity) || resultado.cantidad;
            resultado.vencimiento = detalle.expirationDate || resultado.vencimiento;
            resultado.proveedor = detalle.provider || 'Logística Rojas';
            resultado.solicitante = detalle.requesterName || '';
            resultado.destino = detalle.requesterPlace || '';
            resultado.origen = 'Logística Rojas';
          }
        }
      } catch (error) {
        resultado.origen = error?.name === 'AbortError' ? 'Lectura local (consulta externa agotó el tiempo)' : 'Lectura local (consulta externa no disponible)';
      } finally { window.clearTimeout(timeoutId); }
    }
    // Antes de ofrecer el alta, MIRÚ consulta su propio inventario.
    try {
      const respuesta = await buscarProducto({
        ...(categoria ? { categoria } : {}),
        ...(resultado.gtin ? { codigoBarras: resultado.gtin } : {}),
        ...(texto ? { codigoQRExterno: texto } : {}),
        ...(gs1.gtin ? { codigoBarras: gs1.gtin } : {}),
        ...(gs1.lote && resultado.producto ? { lote: gs1.lote, nombre: resultado.producto } : {}),
      }).unwrap();

      if (respuesta?.encontrado) {
        resultado.duplicado = true;
        resultado.duplicadoInfo = respuesta;
        setDuplicadoInfo(respuesta);
        setDuplicadoVisible(true);
      }
    } catch (error) {
      // La consulta de duplicados no debe impedir la lectura del QR.
      console.warn('No se pudo consultar duplicados en MIRÚ:', error);
    }

    setCodigoQRExterno(texto);
    setConsultaQR(resultado);
    setConsultaVisible(true);
    return resultado;
  };

  const aplicarConsultaQR = (datos) => {
    if (!datos) return;
    if (datos.producto) setNombre(datos.producto);
    if (datos.gtin) setCodigoBarras(datos.gtin);
    if (datos.proveedor) setProveedor(datos.proveedor);
    if (datos.solicitante) setSolicitante(datos.solicitante);
    if (datos.destino) setDestino(datos.destino);
    aplicarLoteEscaneado({ lote: datos.lote, cantidad: datos.cantidad, vencimiento: datos.vencimiento, proveedor: datos.proveedor });
    setConsultaVisible(false);
    message.success('Datos cargados. Revisalos antes de guardar el producto.');
  };

  const procesarCodigoEscaneado = async (codigo) => {
    const raw = String(codigo || '').trim();
    if (!raw) return;
    setScannerVisible(false);
    setScannerKey((key) => key + 1);
    setScanning(true);
    try { await consultarQR(raw); } finally { setScanning(false); }
  };

  const limpiarFormulario = () => {
    setNombre('');
    setCategoria('');
    setApodo('');
    setSolicitante('');
    setDestino('');
    setCodigoBarras('');
    setCodigoQR('');
    setCodigoQRExterno('');
    setConsultaQR(null);
    setConsultaVisible(false);
    setDuplicadoVisible(false);
    setDuplicadoInfo(null);
    setProveedor('');
    setUnidad('');
    setStockMinimo(10);
    setDescripcion('');

    setLotes([
      { ...loteInicial },
    ]);
  };

  const agregarIngresoAlExistente = async () => {
    const info = duplicadoInfo;
    const producto = info?.producto;
    if (!info?.categoria || !producto?._id) {
      message.error('No se pudo identificar el producto existente.');
      return;
    }
    const cantidad = Number(ingresoCantidad || 0);
    const lote = String(ingresoLote || '').trim();
    if (cantidad <= 0) {
      message.warning('Indicá una cantidad mayor que cero.');
      return;
    }
    if (!lote) {
      message.warning('Indicá el lote del ingreso.');
      return;
    }

    try {
      const respuesta = await agregarStock({
        categoria: info.categoria,
        id: producto._id,
        cantidad,
        lote,
        numeroPallet: ingresoPallet.trim(),
        vencimiento: consultaQR?.vencimiento || '',
        proveedor: consultaQR?.proveedor || producto.proveedor || '',
        codigo: codigoQRExterno.trim() || codigoBarras.trim(),
      }).unwrap();

      const pallet = respuesta?.pallet;
      const productoActualizado = respuesta?.producto || producto;
      const pendiente = {
        product: {
          id: String(productoActualizado._id || producto._id),
          nombre: productoActualizado.nombre || producto.nombre || 'Sin nombre',
          lote,
          categoria: info.categoria,
          ubicacion: '',
          cantidad,
          numeroPallet: pallet?.numeroPallet || ingresoPallet.trim() || '',
          palletId: pallet?._id ? String(pallet._id) : '',
        },
        source: 'ingreso-duplicado',
        createdAt: Date.now(),
      };
      sessionStorage.setItem('miru_pending_warehouse_placement', JSON.stringify(pendiente));
      setDuplicadoVisible(false);
      limpiarFormulario();
      setVisible(false);
      dispatch(setDisplay('warehouse-map'));
      message.success('Ingreso agregado. Elegí ahora la ubicación física del pallet en el mapa.');
    } catch (error) {
      console.error('Error agregando ingreso al producto existente:', error);
      message.error(error?.data?.error || 'No se pudo agregar el ingreso.');
    }
  };

  const handleSubmit = async () => {
    if (!categoria) {
      message.warning(
        'Seleccioná una categoría.'
      );
      return;
    }

    if (!nombre.trim()) {
      message.warning(
        'Ingresá el nombre del producto.'
      );
      return;
    }

    if (!proveedor.trim()) {
      message.warning(
        'Ingresá el proveedor.'
      );
      return;
    }

    const lotesValidos = lotes.filter(
      (lote) =>
        lote.numero &&
        lote.numero.trim() !== ''
    );

    if (lotesValidos.length === 0) {
      message.warning(
        'Ingresá al menos un número de lote.'
      );
      return;
    }

    const primerLote =
      lotesValidos[0];

    const cantidadTotal =
      lotesValidos.reduce(
        (total, lote) =>
          total +
          Number(lote.cantidad || 0),
        0
      );

    const nuevoProducto = {
      nombre: nombre.trim(),

      categoria,

      apodo:
        categoria === 'reagents'
          ? apodo.trim()
          : '',

      solicitante:
        categoria === 'consumables'
          ? solicitante.trim()
          : '',

      destino:
        categoria === 'consumables'
          ? destino.trim()
          : '',

      codigoBarras: codigoBarras.trim(),
      codigoQR: codigoQR.trim(),
      codigoQRExterno: codigoQRExterno.trim(),

      lote: primerLote.numero,

      proveedor: proveedor.trim(),

      vencimiento:
        primerLote.vencimiento || '',

      cantidad: cantidadTotal,

      stockMinimo:
        Number(stockMinimo || 0),

      unidad,

      ubicacion:
        primerLote.ubicacion || '',

      descripcion:
        descripcion.trim(),

      lotes: lotesValidos.map(
        (lote) => ({
          numero:
            lote.numero.trim(),

          cantidad:
            Number(lote.cantidad || 0),

          vencimiento:
            lote.vencimiento || '',

          ubicacion:
            lote.ubicacion || '',

          proveedor:
            lote.proveedor?.trim() ||
            proveedor.trim(),
        })
      ),
    };

    console.log(
      'Producto enviado:',
      nuevoProducto
    );

    // Último control antes de guardar: evita duplicados incluso
    // si el usuario completó los datos manualmente.
    try {
      const respuestaLookup = await buscarProducto({
        categoria,
        ...(nuevoProducto.codigoBarras ? { codigoBarras: nuevoProducto.codigoBarras } : {}),
        ...(nuevoProducto.codigoQR ? { codigoQR: nuevoProducto.codigoQR } : {}),
        ...(nuevoProducto.codigoQRExterno ? { codigoQRExterno: nuevoProducto.codigoQRExterno } : {}),
        ...(primerLote.numero && nuevoProducto.nombre ? { lote: primerLote.numero, nombre: nuevoProducto.nombre } : {}),
      }).unwrap();

      if (respuestaLookup?.encontrado) {
        setDuplicadoInfo(respuestaLookup);
        setIngresoCantidad(Number(primerLote.cantidad || consultaQR?.cantidad || 0));
        setIngresoLote(primerLote.numero || consultaQR?.lote || '');
        setIngresoPallet('');
        setDuplicadoVisible(true);
        message.warning('Este producto ya está cargado en MIRÚ.');
        return;
      }
    } catch (lookupError) {
      console.warn('No se pudo verificar duplicados antes del alta:', lookupError);
    }

    try {
      const respuesta = await addItem(
        nuevoProducto
      ).unwrap();

      limpiarFormulario();
      setVisible(false);

      message.success(
        'Producto agregado correctamente.'
      );
    } catch (error) {
      console.error(
        'Error al agregar producto:',
        error
      );

      if (error?.status === 409 && error?.data?.duplicado) {
        setDuplicadoInfo(error.data);
        setIngresoCantidad(Number(primerLote.cantidad || consultaQR?.cantidad || 0));
        setIngresoLote(primerLote.numero || consultaQR?.lote || '');
        setIngresoPallet('');
        setDuplicadoVisible(true);
        message.warning('Este producto ya está cargado en MIRÚ.');
        return;
      }

      message.error(
        error?.data?.error ||
          'No se pudo agregar el producto.'
      );
    }
  };

  return (
    <div>
      <StyledButton
        type="primary"
        shape="round"
        icon={<PlusOutlined />}
        size="default"
        onClick={() =>
          setVisible(true)
        }
      >
        Agregar producto
      </StyledButton>

      <Modal
        title="Agregar nuevo producto"
        centered
        visible={visible}
        onOk={handleSubmit}
        onCancel={() => {
          if (!isLoading) {
            setVisible(false);
            limpiarFormulario();
          }
        }}
        width={900}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={isLoading}
      >
        <Form
          labelCol={{
            span: 6,
          }}
          wrapperCol={{
            span: 16,
          }}
          layout="horizontal"
        >

          {/* ========================= */}
          {/* CATEGORÍA */}
          {/* ========================= */}

          <Form.Item
            label="Categoría"
            required
          >
            <Select
              placeholder="Seleccione una categoría"
              value={
                categoria ||
                undefined
              }
              onChange={setCategoria}
            >
              <Select.Option value="consumables">
                🌱 Semilla
              </Select.Option>

              <Select.Option value="reagents">
                🧪 Agroquímico
              </Select.Option>

              <Select.Option value="equipment">
                📦 Otros insumos
              </Select.Option>
            </Select>
          </Form.Item>

          {/* ========================= */}
          {/* NOMBRE */}
          {/* ========================= */}

          <Form.Item
            label="Nombre"
            required
          >
            <Input
              placeholder="Ej: Roundup"
              value={nombre}
              onChange={(e) =>
                setNombre(
                  e.target.value
                )
              }
            />
          </Form.Item>

          {/* ========================= */}
          {/* APODO - AGROQUÍMICO */}
          {/* ========================= */}

          {categoria ===
            'reagents' && (
            <Form.Item label="Apodo">
              <Input
                placeholder="Ej: Glifo"
                value={apodo}
                onChange={(e) =>
                  setApodo(
                    e.target.value
                  )
                }
              />
            </Form.Item>
          )}

          {/* ========================= */}
          {/* DATOS PARA IDENTIFICACIÓN */}
          {/* ========================= */}

          {categoria === 'consumables' && (
            <Form.Item label="Solicitante">
              <Input
                placeholder="Ej: Juan Pérez / Producción"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
              />
            </Form.Item>
          )}

          {categoria === 'consumables' && (
            <Form.Item label="Destino">
              <Input
                placeholder="Ej: Campo / localidad / destino"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </Form.Item>
          )}

          <Form.Item label="Escaneo rápido">
            <Button
              type="primary"
              icon={<span role="img" aria-label="cámara">📷</span>}
              onClick={abrirScanner}
              loading={scanning}
            >
              Escanear QR / código de barras
            </Button>
            <div style={{ marginTop: 6, color: '#66736a', fontSize: 12 }}>
              Leé la etiqueta del pallet. MIRÚ usa los datos que estén codificados y te deja completar lo que falte.
            </div>
          </Form.Item>

          <Form.Item label="Código de barras">
            <Input
              placeholder="Ej: 7791234567890"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
            />
          </Form.Item>

          <Form.Item label="Código QR">
            <Input
              placeholder="Se genera automáticamente"
              value={codigoQR}
              onChange={(e) => setCodigoQR(e.target.value)}
              addonAfter={
                <Button type="link" size="small" onClick={generarCodigoQR}>
                  Generar otro
                </Button>
              }
            />
            {codigoQR && <QRPreview codigo={codigoQR} />}
          </Form.Item>

          {/* ========================= */}
          {/* PROVEEDOR */}
          {/* ========================= */}

          <Form.Item
            label="Proveedor"
            required
          >
            <Input
              placeholder="Ej: Bayer"
              value={proveedor}
              onChange={(e) =>
                setProveedor(
                  e.target.value
                )
              }
            />
          </Form.Item>

          {codigoQRExterno && (
            <Form.Item label="QR externo leído">
              <Input value={codigoQRExterno} readOnly />
              <div style={{ marginTop: 6, color: '#66736a', fontSize: 12 }}>
                Se conserva separado del QR interno de MIRÚ.
              </div>
            </Form.Item>
          )}

          {/* ========================= */}
          {/* LOTES */}
          {/* ========================= */}

          {categoria !==
            'equipment' && (
            <>
              <Divider />

              <h3>
                🏷️ Lotes del producto
              </h3>

              <p>
                Podés registrar varios
                lotes del mismo
                producto.
              </p>

              {lotes.map(
                (lote, indice) => (
                  <Card
                    key={indice}
                    size="small"
                    title={
                      <span>
                        <Tag color="blue">
                          Lote{' '}
                          {indice + 1}
                        </Tag>{' '}
                        {lote.numero ||
                          'Nuevo lote'}
                      </span>
                    }
                    extra={
                      lotes.length >
                      1 ? (
                        <Button
                          danger
                          size="small"
                          icon={
                            <DeleteOutlined />
                          }
                          onClick={() =>
                            eliminarLote(
                              indice
                            )
                          }
                        >
                          Eliminar
                        </Button>
                      ) : null
                    }
                    style={{
                      marginBottom:
                        '15px',
                    }}
                  >
                    <Form.Item label="Número de lote">
                      <Input
                        placeholder="Ej: SEM-2026-001"
                        value={
                          lote.numero
                        }
                        onChange={(e) =>
                          actualizarLote(
                            indice,
                            'numero',
                            e.target.value
                          )
                        }
                      />
                    </Form.Item>

                    <Form.Item label="Cantidad">
                      <InputNumber
                        min={0}
                        value={
                          lote.cantidad
                        }
                        onChange={(value) =>
                          actualizarLote(
                            indice,
                            'cantidad',
                            value ?? 0
                          )
                        }
                        style={{
                          width:
                            '100%',
                        }}
                      />
                    </Form.Item>

                    <Form.Item label="Vencimiento">
                      <Input
                        type="date"
                        value={
                          lote.vencimiento
                        }
                        onChange={(e) =>
                          actualizarLote(
                            indice,
                            'vencimiento',
                            e.target.value
                          )
                        }
                      />
                    </Form.Item>

                    <Form.Item label="Ubicación">
                      <Input
                        placeholder="Ej: Estante A-03"
                        value={
                          lote.ubicacion
                        }
                        onChange={(e) =>
                          actualizarLote(
                            indice,
                            'ubicacion',
                            e.target.value
                          )
                        }
                      />
                    </Form.Item>

                    <Form.Item label="Proveedor del lote">
                      <Input
                        placeholder={
                          proveedor ||
                          'Proveedor'
                        }
                        value={
                          lote.proveedor
                        }
                        onChange={(e) =>
                          actualizarLote(
                            indice,
                            'proveedor',
                            e.target.value
                          )
                        }
                      />
                    </Form.Item>
                  </Card>
                )
              )}

              <Button
                type="dashed"
                block
                icon={
                  <PlusOutlined />
                }
                onClick={
                  agregarLote
                }
              >
                Agregar otro lote
              </Button>

              <Divider />

              <Form.Item label="Stock mínimo">
                <InputNumber
                  min={0}
                  value={
                    stockMinimo
                  }
                  onChange={(value) =>
                    setStockMinimo(
                      value ?? 0
                    )
                  }
                  style={{
                    width:
                      '100%',
                  }}
                />
              </Form.Item>

              <Form.Item label="Unidad">
                <Select
                  placeholder="Seleccione una unidad"
                  value={
                    unidad ||
                    undefined
                  }
                  onChange={setUnidad}
                >
                  <Select.Option value="unidades">
                    Unidades
                  </Select.Option>

                  <Select.Option value="ml">
                    Mililitros (mL)
                  </Select.Option>

                  <Select.Option value="litros">
                    Litros (L)
                  </Select.Option>

                  <Select.Option value="gramos">
                    Gramos (g)
                  </Select.Option>

                  <Select.Option value="kilogramos">
                    Kilogramos (kg)
                  </Select.Option>
                </Select>
              </Form.Item>
            </>
          )}

          {/* ========================= */}
          {/* OTROS INSUMOS */}
          {/* ========================= */}

          {categoria ===
            'equipment' && (
            <Form.Item label="Ubicación">
              <Input
                placeholder="Ej: Estante A-03"
                value={
                  lotes[0]
                    ?.ubicacion ||
                  ''
                }
                onChange={(e) =>
                  actualizarLote(
                    0,
                    'ubicacion',
                    e.target.value
                  )
                }
              />
            </Form.Item>
          )}

          {/* ========================= */}
          {/* DESCRIPCIÓN */}
          {/* ========================= */}

          <Form.Item label="Descripción">
            <Input.TextArea
              rows={3}
              placeholder="Descripción del producto..."
              value={
                descripcion
              }
              onChange={(e) =>
                setDescripcion(
                  e.target.value
                )
              }
            />
          </Form.Item>

        </Form>
      </Modal>

      <Modal
        title="Consulta del código escaneado"
        visible={consultaVisible}
        onCancel={() => setConsultaVisible(false)}
        footer={[
          <Button key="consultar" onClick={() => setConsultaVisible(false)}>Solo consultar</Button>,
          <Button key="usar" type="primary" onClick={() => aplicarConsultaQR(consultaQR)}>Usar datos para el alta</Button>,
        ]}
        centered
      >
        {consultaQR && (
          <div>
            <Tag color="green">{consultaQR.origen}</Tag>
            {consultaQR.duplicado && (
              <Alert
                style={{ marginTop: 12 }}
                type="warning"
                showIcon
                message="Este producto ya existe en MIRÚ"
                description="No lo guardes como un producto nuevo. Cerrá esta consulta y, si corresponde, después agregamos el stock/pallet al producto existente."
              />
            )}
            <Divider />
            <p><strong>Tipo:</strong> {consultaQR.tipo}</p>
            <p><strong>Contenido leído:</strong></p>
            <Input.TextArea value={consultaQR.raw} readOnly autoSize={{ minRows: 2, maxRows: 5 }} />
            {consultaQR.producto && <p><strong>Producto:</strong> {consultaQR.producto}</p>}
            {consultaQR.gtin && <p><strong>Código / GTIN:</strong> {consultaQR.gtin}</p>}
            {consultaQR.lote && <p><strong>Lote:</strong> {consultaQR.lote}</p>}
            {consultaQR.cantidad > 0 && <p><strong>Cantidad:</strong> {consultaQR.cantidad}</p>}
            {consultaQR.vencimiento && <p><strong>Vencimiento:</strong> {consultaQR.vencimiento}</p>}
            {consultaQR.proveedor && <p><strong>Proveedor:</strong> {consultaQR.proveedor}</p>}
            {consultaQR.solicitante && <p><strong>Solicitante:</strong> {consultaQR.solicitante}</p>}
            {consultaQR.destino && <p><strong>Destino:</strong> {consultaQR.destino}</p>}
            {!consultaQR.producto && !consultaQR.gtin && !consultaQR.lote && !consultaQR.cantidad && !consultaQR.vencimiento && (
              <Alert style={{ marginTop: 12 }} type="info" showIcon message="El código fue leído, pero no contiene datos reconocibles." description="MIRÚ conserva el contenido original y podés completar los datos manualmente." />
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Producto ya existente en MIRÚ"
        visible={duplicadoVisible}
        onCancel={() => setDuplicadoVisible(false)}
        footer={[
          <Button key="cerrar" onClick={() => setDuplicadoVisible(false)}>Cancelar</Button>,
          <Button key="ingreso" type="primary" loading={agregandoStock} onClick={agregarIngresoAlExistente}>Agregar ingreso y ubicar pallet</Button>,
        ]}
        centered
      >
        {duplicadoInfo?.producto && (
          <div>
            <Alert
              type="warning"
              showIcon
              message="MIRÚ encontró una coincidencia"
              description={
                <>
                  <div style={{ marginTop: 8 }}>
                    <strong>Producto:</strong> {duplicadoInfo.producto.nombre || 'Sin nombre'}
                  </div>
                  <div><strong>Categoría:</strong> {duplicadoInfo.categoria || '—'}</div>
                  <div><strong>Coincidencia:</strong> {duplicadoInfo.encontradoPor || 'código'}</div>
                  {duplicadoInfo.producto.codigoBarras && (
                    <div><strong>Código:</strong> {duplicadoInfo.producto.codigoBarras}</div>
                  )}
                  {duplicadoInfo.producto.cantidad != null && (
                    <div><strong>Stock actual:</strong> {duplicadoInfo.producto.cantidad}</div>
                  )}
                </>
              }
            />
            <Divider />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Nuevo ingreso</div>
            <Form.Item label="Lote">
              <Input value={ingresoLote} onChange={(e) => setIngresoLote(e.target.value)} placeholder="Lote del pallet" />
            </Form.Item>
            <Form.Item label="Cantidad">
              <InputNumber min={0} value={ingresoCantidad} onChange={(v) => setIngresoCantidad(v ?? 0)} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="N.º de pallet (opcional)">
              <Input value={ingresoPallet} onChange={(e) => setIngresoPallet(e.target.value)} placeholder="Ej: 10" />
            </Form.Item>
            <Alert
              type="info"
              showIcon
              message="El stock se suma al lote y se crea un pallet independiente."
              description="Después de guardar, MIRÚ te lleva al mapa del galpón para elegir la posición física."
            />
          </div>
        )}
      </Modal>

      <Scanner
        key={scannerKey}
        visible={scannerVisible}
        onCancel={cerrarScanner}
        onFound={procesarCodigoEscaneado}
      />
    </div>
  );
};

export default AddItem;