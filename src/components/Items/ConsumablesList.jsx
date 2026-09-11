import React from 'react';
import { useSelector } from 'react-redux';
import { Spin } from 'antd';
import styled from 'styled-components';
import FEFOStatus from './FEFOStatus.jsx';
import StyledCard from './StyledCard';
import DeleteModal from '../Modals/DeleteModal';
import UpdateItem from '../Modals/UpdateItem';
import ConsumeModal from '../Modals/ConsumeModal';
import MovementModal from '../Modals/MovementModal';
import SearchInvalid from './SearchInvalid';
import ExpirationStatus from './ExpirationStatus';

import { useGetConsumablesQuery } from '../../services/items';

const ListWrapper = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const ConsumablesList = () => {
  const searchInput = useSelector(
    (state) => state.filter.filter
  );

  const {
    data,
    isLoading,
    isError,
  } = useGetConsumablesQuery();

  if (isLoading) {
    return <Spin />;
  }

  if (isError) {
    return (
      <p>
        Error al cargar las semillas.
      </p>
    );
  }

  const textoBusqueda = searchInput
    .toLowerCase()
    .trim();

  const consumables = (data || []).filter(
    (item) => {
      if (!textoBusqueda) return true;

      const campos = [
        item.nombre,
        item.lote,
        item.proveedor,
        item.vencimiento,
        item.cantidad,
        item.stockMinimo,
        item.unidad,
        item.ubicacion,
        item.descripcion,
      ];

      return campos.some((campo) =>
        String(campo || '')
          .toLowerCase()
          .includes(textoBusqueda)
      );
    }
  );

  if (consumables.length === 0) {
    return <SearchInvalid />;
  }

  return (
    <ListWrapper>
      {consumables.map((item) => {
        const stockActual = Number(
          item.cantidad ?? 0
        );

        const stockMinimo = Number(
          item.stockMinimo ?? 10
        );

        const stockBajo =
          stockActual <= stockMinimo;

        return (
          <StyledCard key={item._id}>
            <h2>{item.nombre}</h2>

            <p>
              <strong>Lote:</strong>{' '}
              {item.lote || 'Sin lote'}
            </p>

            <p>
              <strong>Proveedor:</strong>{' '}
              {item.proveedor ||
                'Sin proveedor'}
            </p>

            <p>
              <strong>Vencimiento:</strong>{' '}
              {item.vencimiento ||
                'Sin fecha'}
            </p>

            <ExpirationStatus
              vencimiento={item.vencimiento}
            />

            <p>
              <strong>Stock:</strong>{' '}
              {stockActual}{' '}
              {item.unidad || ''}
            </p>

            <FEFOStatus item={item} />

            <p>
              <strong>Stock mínimo:</strong>{' '}
              {stockMinimo}{' '}
              {item.unidad || ''}
            </p>

            <p>
              <strong>Ubicación:</strong>{' '}
              {item.ubicacion ||
                'Sin ubicación'}
            </p>

            <p>
              <strong>Descripción:</strong>{' '}
              {item.descripcion ||
                'Sin descripción'}
            </p>

            {stockBajo && (
              <p>
                🔴 <strong>STOCK BAJO</strong>{' '}
                — Mínimo: {stockMinimo}{' '}
                {item.unidad || ''}
              </p>
            )}

            <Actions>
              <ConsumeModal
                item={item}
                categoria="consumables"
              />

              <MovementModal
                item={item}
                categoria="consumables"
              />

              <UpdateItem
                id={item._id}
                categoria="consumables"
              />

              <DeleteModal
                id={item._id}
                name={item.nombre}
                categoria="consumables"
              />
            </Actions>
          </StyledCard>
        );
      })}
    </ListWrapper>
  );
};

export default ConsumablesList;
