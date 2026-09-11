import React from 'react';
import { Tag } from 'antd';

const ExpirationStatus = ({ vencimiento }) => {
  // Si no tiene fecha
  if (!vencimiento) {
    return (
      <Tag>
        ⚪ Sin fecha de vencimiento
      </Tag>
    );
  }

  // Convertir la fecha YYYY-MM-DD
  const fechaVencimiento = new Date(
    `${vencimiento}T23:59:59`
  );

  // Fecha actual
  const hoy = new Date();

  // Diferencia en días
  const diferencia =
    fechaVencimiento.getTime() -
    hoy.getTime();

  const diasRestantes = Math.ceil(
    diferencia / (1000 * 60 * 60 * 24)
  );

  // Producto vencido
  if (diasRestantes < 0) {
    return (
      <Tag color="red">
        🔴 VENCIDO
      </Tag>
    );
  }

  // Vence dentro de 30 días
  if (diasRestantes <= 30) {
    return (
      <Tag color="orange">
        🟠 PRÓXIMO A VENCER ({diasRestantes} días)
      </Tag>
    );
  }

  // Producto vigente
  return (
    <Tag color="green">
      🟢 VIGENTE
    </Tag>
  );
};

export default ExpirationStatus;