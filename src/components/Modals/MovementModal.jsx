import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  InputNumber,
  Select,
  message,
  Tag,
} from 'antd';

import { useDispatch } from 'react-redux';

import {
  useRegistrarMovimientoMutation,
} from '../../services/movements';

import { itemsApi } from '../../services/items';

const { Option } = Select;

const MovementModal = ({
  item,
  categoria,
}) => {
  const dispatch = useDispatch();

  const [visible, setVisible] =
    useState(false);

  const [tipo, setTipo] =
    useState('entrada');

  const [cantidad, setCantidad] =
    useState(0);

  const [motivo, setMotivo] =
    useState('');

  const [loteSeleccionado, setLoteSeleccionado] =
    useState('');

  const [
    registrarMovimiento,
    { isLoading },
  ] = useRegistrarMovimientoMutation();

  /*
   * ========================================
   * LOTES
   * ========================================
   */

  const lotesOriginales =
    item.lotes &&
    item.lotes.length > 0
      ? item.lotes
      : [
          {
            numero:
              item.lote ||
              'SIN-LOTE',

            cantidad:
              Number(
                item.cantidad || 0
              ),

            vencimiento:
              item.vencimiento ||
              '',

            ubicacion:
              item.ubicacion ||
              '',

            proveedor:
              item.proveedor ||
              '',
          },
        ];

  /*
   * FEFO
   *
   * Los lotes con vencimiento se ordenan
   * desde el que vence primero.
   *
   * Los lotes sin vencimiento quedan
   * al final.
   */

  const lotes = [
    ...lotesOriginales,
  ].sort((a, b) => {
    if (
      !a.vencimiento &&
      !b.vencimiento
    ) {
      return 0;
    }

    if (!a.vencimiento) {
      return 1;
    }

    if (!b.vencimiento) {
      return -1;
    }

    return (
      new Date(
        a.vencimiento
      ) -
      new Date(
        b.vencimiento
      )
    );
  });

  /*
   * Lote recomendado:
   *
   * Para salida:
   * primero el lote con stock que vence
   * antes.
   *
   * Para entrada:
   * también mostramos el recomendado,
   * aunque se puede elegir cualquier lote.
   */

  const loteFEFO =
    lotes.find(
      (lote) =>
        Number(
          lote.cantidad || 0
        ) > 0 &&
        lote.vencimiento
    ) ||
    lotes.find(
      (lote) =>
        Number(
          lote.cantidad || 0
        ) > 0
    ) ||
    null;

  const loteActual =
    lotes.find(
      (lote) =>
        lote.numero ===
        loteSeleccionado
    ) || null;

  /*
   * ========================================
   * ABRIR
   * ========================================
   */

  const abrirModal = () => {
    setTipo('entrada');

    setCantidad(0);

    setMotivo('');

    /*
     * Seleccionamos automáticamente
     * el lote recomendado.
     */

    setLoteSeleccionado(
      loteFEFO?.numero ||
        lotes[0]?.numero ||
        ''
    );

    setVisible(true);
  };

  const cerrarModal = () => {
    if (!isLoading) {
      setVisible(false);
    }
  };

  /*
   * ========================================
   * CAMBIAR TIPO
   * ========================================
   */

  const cambiarTipo = (
    nuevoTipo
  ) => {
    setTipo(nuevoTipo);

    setCantidad(0);

    /*
     * Si cambiamos a salida,
     * seleccionamos automáticamente
     * el lote FEFO.
     */

    if (
      nuevoTipo === 'salida' &&
      loteFEFO
    ) {
      setLoteSeleccionado(
        loteFEFO.numero
      );
    }
  };

  /*
   * ========================================
   * REGISTRAR MOVIMIENTO
   * ========================================
   */

  const confirmarMovimiento =
    async () => {
      if (!loteSeleccionado) {
        message.warning(
          'Seleccioná un lote.'
        );

        return;
      }

      if (
        !cantidad ||
        cantidad <= 0
      ) {
        message.warning(
          'Ingresá una cantidad válida.'
        );

        return;
      }

      /*
       * Para salida comprobamos
       * el stock del lote.
       */

      if (
        tipo === 'salida' &&
        loteActual &&
        cantidad >
          Number(
            loteActual.cantidad ||
              0
          )
      ) {
        message.error(
          `Stock insuficiente en el lote ${loteActual.numero}. Disponible: ${loteActual.cantidad} ${
            item.unidad || ''
          }`
        );

        return;
      }

      try {
        await registrarMovimiento({
          productoId:
            item._id,

          categoria,

          tipo,

          cantidad,

          motivo,

          responsable:
            'Usuario',

          lote:
            loteSeleccionado,
        }).unwrap();

        /*
         * Actualizamos inventario.
         */

        dispatch(
          itemsApi.util.invalidateTags(
            categoria ===
              'consumables'
              ? ['Consumable']
              : categoria === 'equipment'
              ? ['Equipment']
              : ['Reagent']
          )
        );

        message.success(
          tipo === 'entrada'
            ? `Entrada registrada correctamente. Lote: ${loteSeleccionado}`
            : `Salida registrada correctamente. Lote: ${loteSeleccionado}`
        );

        setVisible(false);

        setCantidad(0);

        setMotivo('');

        setLoteSeleccionado('');
      } catch (error) {
        message.error(
          error?.data?.error ||
            'No se pudo registrar el movimiento.'
        );
      }
    };

  /*
   * ========================================
   * RENDER
   * ========================================
   */

  return (
    <>
      <Button
        onClick={abrirModal}
      >
        📦 Movimiento
      </Button>

      <Modal
        title={`Registrar movimiento - ${item.nombre}`}
        visible={visible}
        onCancel={cerrarModal}
        footer={[
          <Button
            key="cancelar"
            onClick={cerrarModal}
            disabled={isLoading}
          >
            Cancelar
          </Button>,

          <Button
            key="registrar"
            type="primary"
            loading={isLoading}
            onClick={
              confirmarMovimiento
            }
          >
            Registrar movimiento
          </Button>,
        ]}
      >
        <p>
          <strong>
            Producto:
          </strong>{' '}
          {item.nombre}
        </p>

        {/* ==================================
            RECOMENDACIÓN FEFO
        ================================== */}

        {loteFEFO && (
          <div
            style={{
              padding:
                '12px',
              marginBottom:
                '16px',
              border:
                '1px solid #faad14',
              background:
                '#fffbe6',
              borderRadius:
                '6px',
            }}
          >
            <strong>
              ⭐ Recomendación FEFO
            </strong>

            <p
              style={{
                marginTop:
                  '8px',
                marginBottom: 0,
              }}
            >
              {tipo === 'salida'
                ? 'Se recomienda utilizar el lote'
                : 'Lote recomendado'}{' '}
              <strong>
                {loteFEFO.numero}
              </strong>
            </p>

            <p
              style={{
                marginBottom: 0,
              }}
            >
              Vencimiento:{' '}
              <strong>
                {loteFEFO.vencimiento ||
                  'Sin fecha'}
              </strong>
            </p>

            <p
              style={{
                marginBottom: 0,
              }}
            >
              Stock:{' '}
              <strong>
                {loteFEFO.cantidad}{' '}
                {item.unidad ||
                  ''}
              </strong>
            </p>
          </div>
        )}

        {/* ==================================
            LOTE
        ================================== */}

        <label>
          <strong>
            Lote
          </strong>
        </label>

        <Select
          value={
            loteSeleccionado ||
            undefined
          }
          onChange={
            (valor) =>
              setLoteSeleccionado(
                valor
              )
          }
          style={{
            width: '100%',
            marginTop: '8px',
            marginBottom:
              '16px',
          }}
        >
          {lotes.map(
            (lote) => {
              const esFEFO =
                lote.numero ===
                loteFEFO?.numero;

              return (
                <Option
                  key={
                    lote.numero
                  }
                  value={
                    lote.numero
                  }
                >
                  {esFEFO
                    ? '⭐ '
                    : '🏷️ '}

                  {lote.numero}

                  {' — Stock: '}

                  {
                    lote.cantidad
                  }{' '}
                  {item.unidad ||
                    ''}

                  {lote.vencimiento
                    ? ` — Vence: ${lote.vencimiento}`
                    : ' — Sin vencimiento'}
                </Option>
              );
            }
          )}
        </Select>

        {/* ==================================
            INFORMACIÓN DEL LOTE
        ================================== */}

        {loteActual && (
          <div
            style={{
              padding:
                '12px',
              marginBottom:
                '16px',
              background:
                '#f5f5f5',
              borderRadius:
                '6px',
            }}
          >
            <p>
              <strong>
                Stock del lote:
              </strong>{' '}
              {
                loteActual.cantidad
              }{' '}
              {item.unidad ||
                ''}
            </p>

            <p>
              <strong>
                Vencimiento:
              </strong>{' '}
              {loteActual.vencimiento ||
                'Sin fecha'}
            </p>

            <p>
              <strong>
                Ubicación:
              </strong>{' '}
              {loteActual.ubicacion ||
                'Sin ubicación'}
            </p>

            {loteActual.numero ===
              loteFEFO?.numero && (
              <Tag color="orange">
                ⭐ Lote recomendado por FEFO
              </Tag>
            )}
          </div>
        )}

        {/* ==================================
            TIPO
        ================================== */}

        <label>
          <strong>
            Tipo de movimiento
          </strong>
        </label>

        <Select
          value={tipo}
          onChange={
            cambiarTipo
          }
          style={{
            width: '100%',
            marginTop: '8px',
            marginBottom:
              '16px',
          }}
        >
          <Option value="entrada">
            📥 Entrada
          </Option>

          <Option value="salida">
            📤 Salida
          </Option>
        </Select>

        {/* ==================================
            CANTIDAD
        ================================== */}

        <label>
          <strong>
            Cantidad
          </strong>
        </label>

        <InputNumber
          min={0.01}
          max={
            tipo === 'salida' &&
            loteActual
              ? Number(
                  loteActual.cantidad ||
                    0
                )
              : undefined
          }
          step={0.01}
          value={cantidad}
          onChange={
            setCantidad
          }
          style={{
            width: '100%',
            marginTop: '8px',
            marginBottom:
              '16px',
          }}
        />

        {/* ==================================
            MOTIVO
        ================================== */}

        <label>
          <strong>
            Motivo
          </strong>
        </label>

        <Input.TextArea
          rows={4}
          placeholder={
            tipo === 'entrada'
              ? 'Ej.: Compra, recepción de mercadería...'
              : 'Ej.: Entrega, retiro de depósito...'
          }
          value={motivo}
          onChange={(e) =>
            setMotivo(
              e.target.value
            )
          }
          style={{
            marginTop: '8px',
          }}
        />
      </Modal>
    </>
  );
};

export default MovementModal;

