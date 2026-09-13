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

const Wrapper = styled.div`
  width: 80vw;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ItemsContainer = () => {
  const display = useSelector(
    (state) => state.display.display
  );

  return (
    <Wrapper>
      <Affix offsetTop={0}>
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f5f6fb',
            width: '80vw',
            justifyContent: 'center',
          }}
        >
          <AddItem />
          <SearchBar />
        </div>
      </Affix>

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

      {display === 'scanner' && <ScannerPage />}
      {display === 'work-orders' && <WorkSheet />}
      {display === 'bayer-catalog' && (
        <BayerCatalog />
      )}

      {display === 'warehouse-map' && <WarehouseMap />}

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
    </Wrapper>
  );
};

export default ItemsContainer;

