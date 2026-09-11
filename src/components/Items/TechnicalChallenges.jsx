import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  padding: 3rem;
  text-align: center;
`;

const TechnicalChallenges = () => {
  return (
    <Wrapper>
      <h2>Funciones del sistema</h2>

      <p>🔎 Búsqueda y filtrado de productos</p>
      <p>📦 Gestión del inventario</p>
      <p>✏️ Edición de productos</p>
      <p>🗑️ Eliminación de productos</p>
      <p>⚠️ Control de stock</p>
    </Wrapper>
  );
};

export default TechnicalChallenges;