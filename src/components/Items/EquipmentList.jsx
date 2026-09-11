import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import styled from 'styled-components';
import StyledCard from './StyledCard.jsx';
import UpdateItem from '../Modals/UpdateItem.jsx';
import { useSelector } from 'react-redux';
import SearchInvalid from './SearchInvalid.jsx';
import { useGetEquipmentQuery } from '../../services/items.js';
import DeleteModal from '../Modals/DeleteModal.jsx';

const StyledSpin = styled(Spin)`
  margin: 2rem;
`;

const EquipmentList = () => {
  const {
    data,
    error,
    isLoading,
    isSuccess,
    isError,
  } = useGetEquipmentQuery();

  const searchInput = useSelector((state) => state.filter.filter);

  const [foundItems, setFoundItems] = useState([]);

  useEffect(() => {
    if (data) {
      setFoundItems(data);
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;

    if (searchInput !== '') {
      const results = data.filter((item) =>
        item.nombre
          ?.toLowerCase()
          .includes(searchInput.toLowerCase())
      );

      setFoundItems(results);
    } else {
      setFoundItems(data);
    }
  }, [searchInput, data]);

  return (
    <div
      className="site-card-border-less-wrapper"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {isLoading && <StyledSpin />}

      {isError && (
        <p>
          Error al cargar el equipamiento:{' '}
          {error?.message || 'Error desconocido'}
        </p>
      )}

      {isSuccess &&
        foundItems.map((item) => (
          <StyledCard
            key={item._id}
            hoverable
            bordered={false}
          >
            <h3>{item.nombre}</h3>

            <p>
              <b>Proveedor:</b>{' '}
              {item.proveedor || 'Sin especificar'}
            </p>

            <p>
              <b>Ubicación:</b>{' '}
              {item.ubicacion || 'Sin especificar'}
            </p>

            <p>
              <b>Descripción:</b>{' '}
              {item.descripcion || 'Sin descripción'}
            </p>

            <p>
              <b>Último mantenimiento:</b>{' '}
              {item.ultimoMantenimiento || 'Sin registrar'}
            </p>

            <div style={{ display: 'flex' }}>
              <UpdateItem
                id={item._id}
                categoria="equipment"
              />

              <DeleteModal
                name={item.nombre}
                id={item._id}
                categoria="equipment"
              />
            </div>
          </StyledCard>
        ))}

      {isSuccess && foundItems.length === 0 && (
        <SearchInvalid />
      )}
    </div>
  );
};

export default EquipmentList;
