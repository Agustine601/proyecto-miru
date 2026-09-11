import React from 'react';
import { Tag } from 'antd';

const FEFOStatus = ({ item }) => {
  /*
   * ========================================
   * OBTENER LOTES
   * ========================================
   */

  const lotes =
    item?.lotes &&
    item.lotes.length > 0
      ? item.lotes
      : [
          {
            numero:
              item?.lote ||
              'SIN-LOTE',

            cantidad:
              Number(
                item?.cantidad || 0
              ),

            vencimiento:
              item?.vencimiento ||
              '',
          },
        ];

  /*
   * ========================================
   * BUSCAR LOTE FEFO
   * ========================================
   *
   * Solo tenemos en cuenta lotes que:
   *
   * 1. Tengan stock.
   * 2. Tengan fecha de vencimiento.
   *
   * El que vence primero es el recomendado.
   */

  const loteFEFO =
    [...lotes]
      .filter(
        (lote) =>
          Number(
            lote.cantidad || 0
          ) > 0 &&
          lote.vencimiento
      )
      .sort(
        (a, b) =>
          new Date(
            a.vencimiento
          ) -
          new Date(
            b.vencimiento
          )
      )[0];

  /*
   * Si no existe ningún lote
   * con vencimiento y stock,
   * no mostramos FEFO.
   */

  if (!loteFEFO) {
    return null;
  }

  /*
   * ========================================
   * CALCULAR DÍAS RESTANTES
   * ========================================
   */

  const fechaVencimiento =
    new Date(
      `${loteFEFO.vencimiento}T23:59:59`
    );

  const hoy = new Date();

  const diferencia =
    fechaVencimiento.getTime() -
    hoy.getTime();

  const diasRestantes =
    Math.ceil(
      diferencia /
        (1000 * 60 * 60 * 24)
    );

  /*
   * ========================================
   * ESTADO VISUAL
   * ========================================
   */

  if (diasRestantes < 0) {
    return (
      <Tag color="red">
        🔴 FEFO: {loteFEFO.numero} · VENCIDO
      </Tag>
    );
  }

  if (diasRestantes <= 30) {
    return (
      <Tag color="orange">
        ⭐ FEFO: {loteFEFO.numero} · Vence en{' '}
        {diasRestantes}{' '}
        {diasRestantes === 1
          ? 'día'
          : 'días'}
      </Tag>
    );
  }

  return (
    <Tag color="gold">
      ⭐ FEFO: {loteFEFO.numero} · Vence{' '}
      {loteFEFO.vencimiento}
    </Tag>
  );
};

export default FEFOStatus;

