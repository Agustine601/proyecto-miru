import React from 'react';
import styled from 'styled-components';
import { Affix } from 'antd';

import 'antd/dist/antd.css';

import { SearchBar } from '../Items/SearchBar.jsx';
import AddItem from '../Modals/AddItem.jsx';
import ConsumablesList from '../Items/ConsumablesList.jsx';
import MovementsHistory from '../Items/MovementsHistory.jsx';
import ReagentsList from '../Items/ReagentsList.jsx';
import EquipmentList from '../Items/EquipmentList.jsx';
import Alerts from '../Items/Alerts.jsx';
import Dashboard from '../Items/Dashboard.jsx';
import Traceability from '../Items/Traceability.jsx';
import Settings from './Settings.jsx';
import { useSelector } from 'react-redux';

import DefaultPage from '../Items/DefaultPage.jsx';
import TechnicalChallenges from '../Items/TechnicalChallenges.jsx';
import ScannerPage from '../Items/ScannerPage.jsx';
import WorkSheet from '../Items/WorkSheet.jsx';
import BayerCatalog from '../Items/BayerCatalog.jsx';
import WarehouseMap from '../Warehouse/WarehouseMap.jsx';

/* =========================================
   WRAPPER PRINCIPAL
   ========================================= */

const Wrapper = styled.div`
  width: calc(100vw - 270px);
  min-width: 0;

  min-height: 100vh;

  display: flex;
  flex-direction: column;
  align-items: center;

  overflow-x: hidden;

  @media (max-width: 700px) {
    width: 100%;
    max-width: 100%;
    min-width: 0;

    padding-bottom: 20px;
  }
`;

/* =========================================
   BARRA SUPERIOR
   ========================================= */

const TopBar = styled.div`
  display: flex;

  width: 100%;
  max-width: 100%;

  min-width: 0;

  align-items: center;
  justify-content: center;

  gap: 12px;

  padding: 10px 16px;

  background: #f5f6fb;

  border-bottom: 1px solid #e3e8e1;

  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;

    gap: 8px;

    padding: 8px 10px;

    position: relative;
    z-index: 10;
  }
`;

/* =========================================
   CONTENIDO
   ========================================= */

const Content = styled.div`
  width: 100%;
  max-width: 100%;

  min-width: 0;

  display: flex;
  flex-direction: column;
  align-items: center;

  padding: 16px;

  overflow-x: hidden;

  @media (max-width: 700px) {
    padding: 10px 8px 20px;
  }
`;

/* =========================================
   ITEMS CONTAINER
   ========================================= */

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('MIRÚ - error en pantalla:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        width: '100%',
        maxWidth: 900,
        margin: '24px auto',
        padding: 24,
        background: '#fff',
        border: '1px solid #f0caca',
        borderRadius: 12,
        boxSizing: 'border-box',
      }}>
        <h2 style={{ marginTop: 0 }}>⚠️ No se pudo abrir esta sección</h2>
        <p>La aplicación sigue funcionando, pero esta pantalla encontró un error.</p>
        <details>
          <summary>Ver detalle técnico</summary>
          <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
            {String(this.state.error?.message || this.state.error || 'Error desconocido')}
          </pre>
        </details>
        <button
          type="button"
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            marginTop: 12,
            padding: '10px 16px',
            border: 0,
            borderRadius: 8,
            background: '#285a32',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }
}

const ItemsContainer = () => {
  const display = useSelector(
    (state) => state.display.display
  );

  return (
    <Wrapper>
      <Affix offsetTop={0}>
        <TopBar>
          <AddItem />
          <SearchBar />
        </TopBar>
      </Affix>

      <Content>
        <ScreenErrorBoundary key={display}>
          {display === 'default' && (
          <DefaultPage />
        )}

        {display === 'consumables' && (
          <ConsumablesList />
        )}

        {display === 'reagents' && (
          <ReagentsList />
        )}

        {display === 'equipment' && (
          <EquipmentList />
        )}

        {display === 'favorites' && (
          <TechnicalChallenges />
        )}

        {display === 'scanner' && (
          <ScannerPage />
        )}

        {display === 'work-orders' && (
          <WorkSheet />
        )}

        {display === 'bayer-catalog' && (
          <BayerCatalog />
        )}

        {display === 'warehouse-map' && (
          <WarehouseMap />
        )}

        {display === 'movements' && (
          <MovementsHistory />
        )}

        {display === 'alerts' && (
          <Alerts />
        )}

        {display === 'default' && (
          <Dashboard />
        )}

        {display === 'traceability' && (
          <Traceability />
        )}

        {display === 'configuracion' && (
          <Settings />
        )}
        </ScreenErrorBoundary>
      </Content>
    </Wrapper>
  );
};

export default ItemsContainer;