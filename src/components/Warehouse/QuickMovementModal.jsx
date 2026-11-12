import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Divider, Input, InputNumber, Modal, Select, Tag, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useRegistrarLoteMovimientosMutation } from '../../services/movements';

const nuevaLinea = () => ({ key: `${Date.now()}-${Math.random()}`, productoId: undefined, categoria: undefined, tipo: 'consumo', cantidad: 1, lote: '', palletId: '' });

export default function QuickMovementModal({ visible, onClose, products = [], onSuccess }) {
  const [referencia, setReferencia] = useState('');
  const [lineas, setLineas] = useState([nuevaLinea()]);
  const [registrar, { isLoading }] = useRegistrarLoteMovimientosMutation();

  useEffect(() => {
    if (visible) {
      setReferencia('');
      setLineas([nuevaLinea()]);
    }
  }, [visible]);

  const productosDisponibles = useMemo(() => products.filter(p => p?._id && ['consumables', 'reagents'].includes(p.categoria)), [products]);
  const actualizar = (key, cambios) => setLineas(actuales => actuales.map(linea => linea.key === key ? { ...linea, ...cambios } : linea));
  const agregar = () => setLineas(actuales => [...actuales, nuevaLinea()]);
  const quitar = key => setLineas(actuales => actuales.length > 1 ? actuales.filter(x => x.key !== key) : [nuevaLinea()]);

  const resumen = lineas.map(linea => {
    const producto = productosDisponibles.find(p => String(p._id) === String(linea.productoId));
    return { ...linea, producto };
  });

  const confirmar = async () => {
    const validas = resumen.filter(x => x.producto && Number(x.cantidad) > 0);
    if (!validas.length || validas.length !== lineas.length) {
      message.warning('Completá el producto y la cantidad de cada operación.');
      return;
    }
    const payload = validas.map(({ producto, productoId, categoria, tipo, cantidad, lote, palletId }) => ({
      productoId: productoId || producto._id,
      categoria: categoria || producto.categoria,
      tipo,
      cantidad: Number(cantidad),
      lote: lote || undefined,
      palletId: palletId || undefined,
    }));
    try {
      const resultado = await registrar({ operaciones: payload, motivo: referencia.trim() || 'Movimiento rápido', responsable }).unwrap();
      message.success(`${resultado.operaciones} movimiento(s) registrado(s). Se distribuyeron los retiros entre los pallets disponibles.`);
      if (onSuccess) await onSuccess(resultado);
      onClose();
    } catch (error) {
      message.error(error?.data?.error || 'No se pudo registrar el movimiento rápido. No confirmes nuevamente sin revisar el stock.');
    }
  };

  return (
    <Modal visible={visible} onCancel={onClose} title="⚡ Movimiento rápido · Pedido / turno" width={780} destroyOnClose
      footer={[
        <Button key="cancelar" onClick={onClose}>Cancelar</Button>,
        <Button key="confirmar" type="primary" loading={isLoading} onClick={confirmar}>Revisar y confirmar operaciones</Button>,
      ]}>
      <Alert type="info" showIcon message="Descuento automático entre pallets" description="En retiros y consumos, MIRÚ reparte la cantidad entre los pallets activos del producto, conservando lote, pallet y ubicación. En ingresos podés sumar a un pallet existente o dejar el saldo pendiente de ubicar desde el mapa." />
      <div style={{ marginTop: 16 }}>
        <b>Referencia del pedido / turno</b>
        <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej.: Pedido 125 · consumo turno mañana" style={{ marginTop: 7 }} />
      </div>
      <Divider orientation="left">Operaciones</Divider>
      {lineas.map((linea, index) => {
        const producto = productosDisponibles.find(p => String(p._id) === String(linea.productoId));
        const lotes = producto?.lotes || [];
        return (
          <div key={linea.key} style={{ padding: 12, marginBottom: 10, border: '1px solid #e1e9e3', borderRadius: 12, background: '#fbfdfb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <b>Operación {index + 1}</b>
              <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => quitar(linea.key)}>Quitar</Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,2fr) minmax(130px,1fr) minmax(110px,.8fr)', gap: 8 }}>
              <Select showSearch optionFilterProp="children" placeholder="Buscar producto" value={linea.productoId}
                onChange={value => { const p = productosDisponibles.find(x => String(x._id) === String(value)); actualizar(linea.key, { productoId: value, categoria: p?.categoria, lote: '' }); }}>
                {productosDisponibles.map(p => <Select.Option key={p._id} value={p._id}>{p.nombre || p.name || 'Producto sin nombre'} · {p.unidad || 'unid.'}</Select.Option>)}
              </Select>
              <Select value={linea.tipo} onChange={tipo => actualizar(linea.key, { tipo })}>
                <Select.Option value="consumo">🧪 Consumo</Select.Option>
                <Select.Option value="salida">📤 Retiro / pedido</Select.Option>
                <Select.Option value="entrada">📥 Ingreso</Select.Option>
              </Select>
              <InputNumber min={0.0001} value={linea.cantidad} onChange={cantidad => actualizar(linea.key, { cantidad })} style={{ width: '100%' }} addonAfter={producto?.unidad || 'cant.'} />
            </div>
            {producto && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 9 }}>
              <Tag color="blue">Stock general: {Number(producto.cantidad || 0)} {producto.unidad || ''}</Tag>
              {lotes.length > 0 && <Select allowClear showSearch optionFilterProp="children" placeholder="Todos los lotes (distribución automática)" value={linea.lote || undefined} onChange={lote => actualizar(linea.key, { lote: lote || '' })} style={{ minWidth: 260 }}>
                {lotes.map((l, i) => <Select.Option key={`${l.numero}-${i}`} value={l.numero}>{l.numero} · {Number(l.cantidad || 0)} {producto.unidad || ''}</Select.Option>)}
              </Select>}
              {linea.tipo !== 'entrada' && <span style={{ color: '#66756b', fontSize: 12 }}>Se distribuye entre pallets con saldo.</span>}
              {linea.tipo === 'entrada' && <Select allowClear showSearch optionFilterProp="children" placeholder="Sumar a pallet existente (opcional)" value={linea.palletId || undefined} onChange={palletId => { const lotePallet = lotes.find(l => (l.pallets || []).some(p => String(p._id) === String(palletId))); actualizar(linea.key, { palletId: palletId || '', lote: lotePallet?.numero || linea.lote }); }} style={{ minWidth: 260 }}>
                {lotes.flatMap(l => (l.pallets || []).filter(p => p.estado !== 'retirado').map(p => <Select.Option key={String(p._id)} value={String(p._id)}>{l.numero} · {p.numeroPallet || 'Pallet'} · {p.ubicacion || 'Sin ubicación'}</Select.Option>))}
              </Select>}
            </div>}
          </div>
        );
      })}
      <Button type="dashed" block icon={<PlusOutlined />} onClick={agregar}>Agregar otra operación</Button>
      <Divider />
      <div style={{ padding: 12, borderRadius: 10, background: '#f3f7f4' }}>
        <b>Vista previa</b>
        {resumen.map((x, i) => <div key={x.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, paddingTop: 7, fontSize: 13 }}>
          <span>{x.producto?.nombre || 'Seleccioná un producto'} · {x.tipo}</span>
          <b>{x.cantidad || 0} {x.producto?.unidad || ''}</b>
        </div>)}
        <div style={{ marginTop: 8, color: '#68766d', fontSize: 12 }}>La confirmación guarda una línea de historial por cada pallet/lote que resulte afectado.</div>
      </div>
    </Modal>
  );
}
