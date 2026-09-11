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
  useRegistrarConsumoMutation,
} from '../../services/movements';

import { itemsApi } from '../../services/items';

const { Option } = Select;

const ConsumeModal = ({
  item,
  categoria,
}) => {
  const dispatch = useDispatch();

  const [visible, setVisible] =
    useState(false);

  const [cantidad, setCantidad] =
    useState(0);

  const [motivo, setMotivo] =
    useState('');

  const [loteSeleccionado, setLoteSeleccionado] =
    useState('');

  const [
    registrarConsumo,
    { isLoading },
  ] = useRegistrarConsumoMutation();

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
   * Ordenamos los lotes por fecha
   * de vencimiento.
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
   * El primer lote con stock disponible
   * y fecha de vencimiento es el recomendado.
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
   * ABRIR MODAL
   * ========================================
   */

  const abrirModal = () => {
    setCantidad(0);
    setMotivo('');

    /*
     * FEFO automático:
     * seleccionamos el lote que vence primero.
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
   * REGISTRAR CONSUMO
   * ========================================
   */

  const confirmarConsumo =
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

      if (
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
        await registrarConsumo({
          productoId:
            item._id,

          categoria,

          cantidad,

          motivo,

          responsable:
            'Usuario',

          lote:
            loteSeleccionado,
        }).unwrap();

        /*
         * Actualizar inventario.
         */

        dispatch(
          itemsApi.util.invalidateTags(
            categoria ===
              'consumables'
              ? ['Consumable']
              : ['Reagent']
          )
        );

        message.success(
          `Consumo registrado correctamente. Lote: ${loteSeleccionado}`
        );

        setVisible(false);

        setCantidad(0);
        setMotivo('');
        setLoteSeleccionado('');
      } catch (error) {
        message.error(
          error?.data?.error ||
            'No se pudo registrar el consumo.'
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
        type="primary"
        onClick={abrirModal}
        disabled={
          !item.cantidad ||
          Number(item.cantidad) <=
            0
        }
      >
        🧪 Consumir
      </Button>

      <Modal
        title={`Registrar consumo - ${item.nombre}`}
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
            key="consumir"
            type="primary"
            loading={isLoading}
            onClick={
              confirmarConsumo
            }
          >
            Registrar consumo
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
              Usar primero el lote{' '}
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
                {
                  loteFEFO.cantidad
                }{' '}
                {item.unidad ||
                  ''}
              </strong>
            </p>
          </div>
        )}

        {/* ==================================
            SELECCIÓN DE LOTE
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
            CANTIDAD
        ================================== */}

        <label>
          <strong>
            Cantidad a consumir
          </strong>
        </label>

        <InputNumber
          min={0.01}
          max={
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
            Motivo del consumo
          </strong>
        </label>

        <Input.TextArea
          rows={4}
          placeholder="Ej.: Aplicación en ensayo, preparación de muestra..."
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

export default ConsumeModal;

