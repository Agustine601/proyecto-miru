import React from 'react';
import { Button, Input, Select, Tooltip } from 'antd';
import { ScanOutlined, SearchOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { setFilter, setInventoryFilter } from './filterSlice';
import { setDisplay } from '../containers/displaySlice';
import styled from 'styled-components';

const { Search } = Input;
const { Option } = Select;

const SearchArea = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: nowrap;

  .inventory-search {
    flex: 1 1 520px;
    min-width: 280px;
    max-width: 620px;
  }

  .inventory-filter {
    flex: 0 0 170px;
    width: 170px;
  }

  .scan-button {
    flex: 0 0 auto;
  }

  @media (max-width: 900px) {
    flex-wrap: wrap;

    .inventory-search {
      flex: 1 1 420px;
      max-width: none;
    }
  }

  @media (max-width: 700px) {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
    flex-wrap: nowrap;

    .inventory-search,
    .inventory-filter,
    .scan-button {
      width: 100%;
      max-width: none;
      min-width: 0;
      flex: none;
    }
  }
`;

export const SearchBar = () => {
  const searchInput = useSelector((state) => state.filter.filter);
  const inventoryFilter = useSelector(
    (state) => state.filter.inventoryFilter || 'todos'
  );
  const dispatch = useDispatch();

  const filter = (e) => {
    dispatch(setFilter(e.target.value));
  };

  const handleScan = () => {
    dispatch(setDisplay('scanner'));
  };

  return (
    <SearchArea>
      <Search
        className="inventory-search"
        placeholder="Buscar producto, lote, proveedor, ubicación o código..."
        allowClear
        enterButton={<SearchOutlined />}
        onChange={filter}
        value={searchInput}
      />

      <Select
        className="inventory-filter"
        value={inventoryFilter}
        onChange={(value) => dispatch(setInventoryFilter(value))}
        aria-label="Filtro rápido del inventario"
      >
        <Option value="todos">Todos</Option>
        <Option value="stock-bajo">Stock bajo</Option>
        <Option value="vence-30">Vence en 30 días</Option>
        <Option value="sin-ubicacion">Sin ubicación</Option>
      </Select>

      <Tooltip title="Escanear QR">
        <Button
          className="scan-button"
          icon={<ScanOutlined />}
          onClick={handleScan}
          type="primary"
        >
          Escanear
        </Button>
      </Tooltip>
    </SearchArea>
  );
};
