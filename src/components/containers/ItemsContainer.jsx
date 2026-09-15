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
      </Content>
    </Wrapper>
  );
};

export default ItemsContainer;