import React, { useState } from 'react';
import { Modal, Button, InputNumber, Select, Input, Divider, message } from 'antd';
import {
  useRegistrarMovimientoMutation,
  useRegistrarConsumoMutation,
} from '../../services/movements';
import { calcularEquivalente, extraerConversion } from '../../utils/conversionStock';

const { Option } = Select;

const PalletOperationModal = ({
  visible,
  pallet,
  onClose,
  onSuccess,
}) => {
  const [tipo, setTipo] = useState('salida');
  const [cantidad, setCantidad] = useState(0);
  const [motivo, setMotivo] = useState('');

  const [registrarMovimiento, { isLoading: guardandoMovimiento }] =
    useRegistrarMovimientoMutation();
  const [registrarConsumo, { isLoading: guardandoConsumo }] =
    useRegistrarConsumoMutation();

  const cantidadActual = Number(pallet?.cantidad || 0);
  const unidad = pallet?.unidad || '';
  const nombre = pallet?.nombre || 'Pallet';
  const conversion = extraerConversion(pallet);
  const equivalenteActual = calcularEquivalente(cantidadActual, pallet);
  const esConsumo = tipo === 'consumo';

  const resetear = () => {
    setTipo('salida');
    setCantidad(0);
    setMotivo('');
  };

  const cerrar = () => {
    resetear();
    onClose();
  };

  const confirmar = async () => {
    const cantidadNumerica = Number(cantidad || 0);

    if (!pallet?.id || !pallet?.categoria || !pallet?.palletId) {
      message.error(
        'Este pallet no tiene vinculados producto y palletId. No se puede modificar su saldo desde el mapa todavía.'
      );
      return;
    }

    if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
      message.warning('Ingresá una cantidad válida.');
      return;
    }

    if (
      ['salida', 'consumo'].includes(tipo) &&
      cantidadNumerica > cantidadActual
    ) {
      message.error(
        `No podés retirar ${cantidadNumerica} ${unidad}. El pallet tiene ${cantidadActual} ${unidad}.`
      );
      return;
    }

    try {
      const datos = {
        productoId: pallet.id,
        categoria: pallet.categoria,
        cantidad: cantidadNumerica,
        motivo: motivo || 'Movimiento desde mapa',
        responsable: 'Usuario',
        lote: pallet.lote || 'SIN-LOTE',
        palletId: pallet.palletId,
        ubicacion: pallet.ubicacion || pallet.slot || '',
        cantidadEquivalente: conversion ? cantidadNumerica * conversion.factor : null,
        unidadEquivalente: conversion?.unidad || '',
        factorConversion: conversion?.factor || null,
      };

      const resultado = esConsumo
        ? await registrarConsumo(datos).unwrap()
        : await registrarMovimiento({
            ...datos,
            tipo,
          }).unwrap();

      const nuevaCantidad =
        resultado?.pallet?.cantidad ??
        resultado?.stockPallet ??
        (tipo === 'entrada'
          ? cantidadActual + cantidadNumerica
          : cantidadActual - cantidadNumerica);

      onSuccess({
        palletId: pallet.palletId,
        cantidad: Number(nuevaCantidad),
        estado:
          Number(nuevaCantidad) <= 0 ? 'retirado' : 'activo',
      });

      message.success(
        tipo === 'entrada'
          ? `Ingreso de ${cantidadNumerica} ${unidad} registrado.`
          : `Retiro de ${cantidadNumerica} ${unidad} registrado.`
      );

      cerrar();
    } catch (error) {
      message.error(
        error?.data?.error || 'No se pudo registrar el movimiento.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      title={`📦 ${nombre}`}
      onCancel={cerrar}
      width={520}
      footer={[
        <Button key="cancelar" onClick={cerrar}>
          Cancelar
        </Button>,
        <Button
          key="guardar"
          type="primary"
          loading={guardandoMovimiento || guardandoConsumo}
          onClick={confirmar}
        >
          Confirmar movimiento
        </Button>,
      ]}
    >
      <div
        style={{
          padding: 14,
          background: '#f5f5f5',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <div><b>Pallet:</b> {pallet?.numeroPallet || '—'}</div>
        <div><b>Lote:</b> {pallet?.lote || '—'}</div>
        <div><b>Ubicación:</b> {pallet?.slot || pallet?.ubicacion || '—'}</div>
        <div style={{ marginTop: 8, fontSize: 20 }}>
          <b>Saldo actual: {cantidadActual} {unidad}</b>
        </div>
        {conversion && (
          <div style={{ marginTop: 8, fontSize: 16 }}>
            📐 {conversion.factor} {conversion.unidad} por unidad · <b>{equivalenteActual?.cantidad.toLocaleString('es-AR')} {conversion.unidad} totales</b>
          </div>
        )}
      </div>

      <label><b>Operación</b></label>
      <Select
        value={tipo}
        onChange={(value) => {
          setTipo(value);
          setCantidad(0);
        }}
        style={{ width: '100%', marginTop: 8 }}
      >
        <Option value="salida">📤 Retirar</Option>
        <Option value="consumo">🧪 Consumo interno</Option>
        <Option value="entrada">📥 Ingresar</Option>
      </Select>

      <Divider />

      <label><b>Cantidad</b></label>
      <InputNumber
        min={0}
        max={tipo === 'entrada' ? undefined : cantidadActual}
        value={cantidad}
        onChange={setCantidad}
        style={{ width: '100%', marginTop: 8 }}
        addonAfter={unidad || undefined}
      />

      <label style={{ display: 'block', marginTop: 16 }}>
        <b>Motivo / referencia</b>
      </label>
      <Input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ej.: pedido, cliente, consumo interno..."
        style={{ marginTop: 8 }}
      />

      {cantidad > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: '#f0f5ff',
          }}
        >
          Después del movimiento: <b>{tipo === 'entrada' ? cantidadActual + Number(cantidad) : Math.max(0, cantidadActual - Number(cantidad))} {unidad}</b>
          {conversion && (
            <> · <b>{(tipo === 'entrada' ? cantidadActual + Number(cantidad) : Math.max(0, cantidadActual - Number(cantidad))) * conversion.factor} {conversion.unidad}</b></>
          )}
        </div>
      )}

      {tipo !== 'entrada' && cantidad > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: '#fffbe6',
          }}
        >
          Saldo después del movimiento:{' '}
          <b>
            {Math.max(0, cantidadActual - Number(cantidad))} {unidad}
          </b>
        </div>
      )}
    </Modal>
  );
};

export default PalletOperationModal;
