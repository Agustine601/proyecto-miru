import React, { useEffect, useRef, useState } from 'react';
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
  message,
} from 'antd';

import {
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

import { useAddItemMutation } from '../../services/items.js';
import { useRegistrarMovimientoMutation } from '../../services/movements.js';
import Scanner from '../Items/Scanner.jsx';
import { extraerCodigoQR, extraerGS1 } from '../../qr-utils.js';

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

  const [registrarMovimiento] =
    useRegistrarMovimientoMutation();

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

  const procesarCodigoEscaneado = async (codigo) => {
    const raw = String(codigo || '').trim();
    if (!raw) return;

    // El código ya fue consumido: cerramos y destruimos la instancia
    // actual del escáner antes de procesar los datos.
    setScannerVisible(false);
    setScannerKey((key) => key + 1);
    setScanning(true);

    try {
      const gs1 = extraerGS1(raw);
      const esUrl = /^https?:\/\//i.test(raw);
      const codigoExtraido = extraerCodigoQR(raw);

      // Código de barras GS1: completa automáticamente GTIN, lote y vencimiento
      // cuando esos datos vienen codificados en la etiqueta.
      if (gs1.gtin) {
        setCodigoBarras(raw);
      } else {
        setCodigoBarras(raw);
      }

      if (esUrl) {
        setCodigoQR(codigoExtraido || raw);
      } else {
        // Un código de barras no reemplaza el QR propio de MIRÚ.
        // Guardamos el código leído y dejamos el QR MIRÚ generado aparte.
        setCodigoBarras(raw);
      }

      let datos = {
        lote: gs1.lote || '',
        cantidad: gs1.cantidad || 0,
        vencimiento: gs1.vencimiento || '',
        proveedor: '',
      };

      // QR de Logística Rojas: si el QR contiene una URL pública,
      // intentamos recuperar producto, lote y cantidad automáticamente.
      if (esUrl && codigoExtraido) {
        try {
          const url = `https://logistica-rojas.com.ar/services/api/work-order/dispatch/public/composition/${encodeURIComponent(codigoExtraido)}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const detalle = data?.requesterDetails?.[0];
            if (detalle) {
              setNombre((detalle.product || '').trim());
              setCodigoBarras((detalle.code || raw).trim());
              setCodigoQR(codigoExtraido);
              setProveedor(detalle.provider || 'Logística Rojas');
              setUnidad(detalle.measureType || 'unidades');
              if (detalle.requesterName) setSolicitante(detalle.requesterName);
              if (detalle.requesterPlace) setDestino(detalle.requesterPlace);
              datos = {
                lote: detalle.lot || '',
                cantidad: Number(detalle.quantity) || 0,
                vencimiento: detalle.expirationDate || '',
                proveedor: detalle.provider || 'Logística Rojas',
              };
              message.success('QR leído: datos de la orden cargados automáticamente.');
            }
          }
        } catch (error) {
          console.warn('No se pudo consultar el QR externo; se conserva el código leído.', error);
        }
      }

      if (datos.lote || datos.cantidad || datos.vencimiento) {
        aplicarLoteEscaneado(datos);
      }

      if (!esUrl) {
        message.success(gs1.lote || gs1.gtin
          ? 'Código de barras leído. Lote/vencimiento cargados si estaban codificados.'
          : 'Código de barras leído. Completá los datos que no estén codificados.');
      }
    } finally {
      setScanning(false);
    }
  };

  const limpiarFormulario = () => {
    setNombre('');
    setCategoria('');
    setApodo('');
    setSolicitante('');
    setDestino('');
    setCodigoBarras('');
    setCodigoQR('');
    setProveedor('');
    setUnidad('');
    setStockMinimo(10);
    setDescripcion('');

    setLotes([
      { ...loteInicial },
    ]);
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

    try {
      const respuesta = await addItem(
        nuevoProducto
      ).unwrap();

      // Toda alta con stock queda registrada como ENTRADA.
      // No vuelve a modificar el stock: el producto ya fue creado
      // con su cantidad inicial; solamente deja trazabilidad.
      const productoCreado = respuesta?.producto;
      if (productoCreado?._id) {
        const movimientosIniciales = lotesValidos
          .map((lote) => ({
            productoId: productoCreado._id,
            categoria,
            tipo: 'entrada',
            cantidad: Number(lote.cantidad || 0),
            motivo: 'Alta de producto',
            responsable: 'Usuario',
            lote: lote.numero.trim(),
          }))
          .filter((m) => m.cantidad > 0);

        await Promise.all(
          movimientosIniciales.map((movimiento) =>
            registrarMovimiento(movimiento).unwrap()
          )
        );
      }

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