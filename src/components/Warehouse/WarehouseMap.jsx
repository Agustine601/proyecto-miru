import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  Button,
  Card,
  Input,
  Modal,
  Tag,
  message,
  Tooltip,
} from 'antd';
import {
  ApartmentOutlined,
  DragOutlined,
  SearchOutlined,
  SaveOutlined,
  DeleteOutlined,
} from '@ant-design/icons';

import {
  useGetConsumablesQuery,
  useGetReagentsQuery,
  useGetEquipmentQuery,
  useUpdatePalletLocationMutation,
} from '../../services/items';

import {
  useGetWarehouseMapQuery,
  useSaveWarehouseMapMutation,
} from '../../services/warehouse';


/* =========================================================
   RACKS · AGROQUÍMICOS
========================================================= */

const makeRack = (n, access, group) =>
  Array.from({ length: 12 }, (_, i) => ({
    id: `R${String(n).padStart(2, '0')}-P${String(i + 1).padStart(2, '0')}`,
    rack: n,
    position: i + 1,
    access,
    group,
  }));

const racksFront = Array.from(
  { length: 16 },
  (_, i) => makeRack(i + 1, 'frente', 'racks-01-16')
);

const racksSide = Array.from(
  { length: 8 },
  (_, i) => makeRack(i + 18, 'costado', 'racks-18-25')
);

const racksFront2 = Array.from(
  { length: 4 },
  (_, i) => makeRack(i + 26, 'frente', 'racks-26-29')
);

const racksSide2 = Array.from(
  { length: 4 },
  (_, i) => makeRack(i + 30, 'costado', 'racks-30-33')
);


/* =========================================================
   CONTROL MAX · AGROQUÍMICOS
   10 filas x 3 posiciones
   Hasta 2 pallets por posición
========================================================= */

const controlMax = Array.from({ length: 30 }, (_, i) => ({
  id: `CM-F${String(Math.floor(i / 3) + 1).padStart(2, '0')}-P${String(
    (i % 3) + 1
  ).padStart(2, '0')}`,
  row: Math.floor(i / 3) + 1,
  position: (i % 3) + 1,
  access: 'entrada',
}));


/* =========================================================
   SEMILLAS
   25 FILAS POR LADO
   3 POSICIONES DE PROFUNDIDAD POR FILA
   3 PALLETS POR POSICIÓN
========================================================= */

const semillasSlots = Array.from(
  { length: 150 },
  (_, index) => {
    const lado =
      index < 75
        ? 'A'
        : 'B';

    const localIndex =
      index % 75;

    const row =
      Math.floor(localIndex / 3) + 1;

    const position =
      (localIndex % 3) + 1;

    return {
      id: `SEM-${lado}-F${String(row).padStart(
        2,
        '0'
      )}-P${String(position).padStart(
        2,
        '0'
      )}`,

      lado,
      row,
      position,
      maxStack: 3,
    };
  }
);


/* =========================================================
   HELPERS
========================================================= */

function itemName(item) {
  return item?.nombre || item?.name || 'Sin nombre';
}

function itemLot(item) {
  return item?.lote || item?.lotes?.[0]?.numero || '';
}

function stackOf(value) {
  return Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];
}


/* =========================================================
   STYLES · GENERAL
========================================================= */

const Wrapper = styled.div`
  width: 100%;
  padding: 20px 22px 50px;
  max-width: 1600px;
  box-sizing: border-box;
  margin: 0 auto;

  @media (max-width: 700px) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 10px 8px 30px;
    overflow-x: hidden;
  }
`;

const Header = styled(Card)`
  margin-bottom: 16px;

  .ant-card-body {
    padding: 18px 20px;
  }

  @media (max-width: 700px) {
    width: 100%;
    max-width: 100%;
    margin-bottom: 10px;

    .ant-card-body {
      padding: 14px 12px;
    }
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 14px;

  @media (max-width: 700px) {
    width: 100%;
    gap: 8px;
    align-items: stretch;
  }
`;

const WarehouseSelector = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: 4px;

  @media (max-width: 700px) {
    width: 100%;

    .ant-btn {
      flex: 1 1 100%;
      width: 100%;
    }
  }
`;

const Legend = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;

  @media (max-width: 700px) {
    gap: 5px;

    .ant-tag {
      margin-right: 0;
      margin-bottom: 4px;
      white-space: normal;
      line-height: 20px;
      height: auto;
    }
  }
`;


/* =========================================================
   BUILDING
========================================================= */

const Building = styled.div`
  position: relative;
  border: 3px solid #28352d;
  border-radius: 14px;

  background:
    linear-gradient(
      90deg,
      rgba(255,255,255,0.018) 1px,
      transparent 1px
    ),
    linear-gradient(
      rgba(255,255,255,0.018) 1px,
      transparent 1px
    ),
    #172019;

  background-size: 32px 32px;

  min-height: 820px;

  overflow: hidden;

  box-shadow:
    0 10px 35px rgba(0, 0, 0, 0.18),
    inset 0 0 0 1px rgba(255,255,255,0.025);

  @media (max-width: 700px) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: auto;

    overflow: hidden;

    border-radius: 10px;
  }
`;

const Wall = styled.div`
  position: absolute;
  background: #d8ddd9;
  z-index: 10;
`;

const TopWall = styled(Wall)`
  left: 0;
  right: 0;
  height: 5px;
  top: 0;
`;

const BottomWall = styled(Wall)`
  left: 0;
  right: 0;
  height: 5px;
  bottom: 0;
`;


/* =========================================================
   AGROQUÍMICOS · ESTRUCTURA VISUAL
========================================================= */

const AgroMap = styled.div`
  position: relative;
  z-index: 5;

  min-height: 820px;

  padding: 62px 24px 32px;

  box-sizing: border-box;

  display: grid;

  grid-template-columns:
    225px
    minmax(0, 1fr)
    250px;

  grid-template-rows:
    auto
    minmax(0, 1fr);

  gap: 18px;

  @media (max-width: 1200px) {
    grid-template-columns:
      190px
      minmax(0, 1fr)
      215px;

    padding-left: 15px;
    padding-right: 15px;

    gap: 12px;
  }

  /* =========================================
     CELULAR
  ========================================= */
  @media (max-width: 700px) {
    width: 100%;
    max-width: 100%;
    min-width: 0;

    min-height: auto;

    padding: 58px 8px 28px;

    grid-template-columns: 1fr;

    grid-template-rows: auto;

    gap: 12px;
  }
`;

const AgroMapTitle = styled.div`
  grid-column: 1 / -1;

  text-align: center;

  color: #f1f6f2;

  font-size: 17px;
  font-weight: 900;

  letter-spacing: 1.5px;

  text-shadow:
    0 2px 4px rgba(0,0,0,0.7);

  @media (max-width: 700px) {
    font-size: 14px;
    line-height: 1.25;
    padding: 0 35px;
  }
`;

const AgroMapSubtitle = styled.div`
  grid-column: 1 / -1;

  margin-top: -10px;

  text-align: center;

  color: #8e9b91;

  font-size: 10px;
  font-weight: 700;

  letter-spacing: 0.5px;

  @media (max-width: 700px) {
    font-size: 8px;
    line-height: 1.3;
    margin-top: -6px;
  }
`;

const AgroControlPanel = styled.div`
  min-width: 0;

  grid-column: 1;
  grid-row: 2;

  border: 2px solid #f29a28;

  border-radius: 12px;

  background:
    linear-gradient(
      180deg,
      rgba(242,154,40,0.10),
      rgba(242,154,40,0.025)
    );

  box-shadow:
    inset 0 0 20px rgba(242,154,40,0.025),
    0 4px 15px rgba(0,0,0,0.12);

  padding: 28px 10px 12px;

  box-sizing: border-box;

  position: relative;

  @media (max-width: 700px) {
    grid-column: 1;
    grid-row: auto;

    width: 100%;
    max-width: 100%;

    padding: 30px 8px 10px;
  }
`;

const AgroControlTitle = styled.div`
  position: absolute;

  top: 8px;
  left: 0;
  right: 0;

  text-align: center;

  color: #ffb44f;

  font-size: 12px;
  font-weight: 900;

  letter-spacing: 0.7px;

  @media (max-width: 700px) {
    font-size: 10px;
  }
`;

const AgroMainArea = styled.div`
  min-width: 0;

  grid-column: 2;
  grid-row: 2;

  display: grid;

  grid-template-rows:
    minmax(0, 1fr)
    46px
    minmax(0, 0.75fr);

  gap: 14px;

  @media (max-width: 700px) {
    grid-column: 1;
    grid-row: auto;

    width: 100%;
    max-width: 100%;

    grid-template-rows:
      auto
      50px
      auto;

    gap: 12px;
  }
`;

const AgroSideArea = styled.div`
  min-width: 0;

  grid-column: 3;
  grid-row: 2;

  display: grid;

  grid-template-rows:
    1fr
    44px
    1fr;

  gap: 14px;

  padding-left: 16px;

  border-left: 2px dashed #526057;

  box-sizing: border-box;

  @media (max-width: 700px) {
    grid-column: 1;
    grid-row: auto;

    width: 100%;
    max-width: 100%;

    padding-left: 0;
    padding-top: 12px;

    border-left: none;

    border-top: 2px dashed #526057;

    grid-template-rows:
      auto
      44px
      auto;

    gap: 12px;
  }
`;

const AgroSection = styled.div`
  min-width: 0;

  position: relative;

  border: 2px solid ${p =>
    p.orange
      ? '#b87522'
      : '#247e76'};

  border-radius: 12px;

  background: ${p =>
    p.orange
      ? 'rgba(242,154,40,0.035)'
      : 'rgba(39,213,198,0.025)'};

  padding: 31px 12px 12px;

  box-sizing: border-box;

  box-shadow:
    inset 0 0 18px rgba(0,0,0,0.12);

  @media (max-width: 700px) {
    width: 100%;
    max-width: 100%;

    padding: 31px 7px 10px;

    border-radius: 9px;
  }
`;

const AgroSectionTitle = styled.div`
  position: absolute;

  top: 7px;
  left: 12px;

  color: ${p =>
    p.orange
      ? '#ffb44f'
      : '#3ce1d2'};

  font-size: 11px;
  font-weight: 900;

  letter-spacing: 0.5px;

  @media (max-width: 700px) {
    left: 8px;
    font-size: 9px;
    letter-spacing: 0.2px;
  }
`;

const AgroSectionInfo = styled.div`
  position: absolute;

  top: 7px;
  right: 12px;

  color: #78867d;

  font-size: 9px;
  font-weight: 700;

  @media (max-width: 700px) {
    right: 8px;
    font-size: 7px;
  }
`;

const AgroRackGrid = styled.div`
  height: 100%;
  min-width: 0;

  display: grid;

  grid-template-columns:
    repeat(8, minmax(0, 1fr));

  grid-template-rows:
    repeat(2, minmax(0, 1fr));

  gap: 10px;

  align-items: center;

  @media (max-width: 700px) {
    height: auto;

    grid-template-columns:
      repeat(4, minmax(0, 1fr));

    grid-template-rows:
      repeat(4, minmax(65px, auto));

    gap: 8px;

    padding: 8px 2px;
  }
`;

const AgroRackGridSingle = styled.div`
  height: 100%;
  min-width: 0;

  display: grid;

  grid-template-columns:
    repeat(8, minmax(0, 1fr));

  gap: 10px;

  align-items: center;

  @media (max-width: 700px) {
    height: auto;

    grid-template-columns:
      repeat(4, minmax(0, 1fr));

    grid-template-rows:
      repeat(2, minmax(65px, auto));

    gap: 8px;

    padding: 8px 2px;
  }
`;

const AgroRackGridFour = styled.div`
  height: 100%;
  min-width: 0;

  display: grid;

  grid-template-columns:
    repeat(4, minmax(0, 1fr));

  gap: 10px;

  align-items: center;

  @media (max-width: 700px) {
    height: auto;

    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    grid-template-rows:
      repeat(2, minmax(70px, auto));

    gap: 8px;

    padding: 8px 2px;
  }
`;

const AgroAisle = styled.div`
  border: 2px dashed #c5a04f;

  border-radius: 10px;

  background:
    repeating-linear-gradient(
      45deg,
      rgba(216,180,91,0.045),
      rgba(216,180,91,0.045) 8px,
      transparent 8px,
      transparent 16px
    );

  display: flex;

  align-items: center;
  justify-content: center;

  text-align: center;

  color: #e4c66c;

  font-size: 11px;
  font-weight: 900;

  letter-spacing: 1px;

  box-sizing: border-box;

  @media (max-width: 700px) {
    width: 100%;
    min-height: 50px;

    font-size: 9px;
    letter-spacing: 0.5px;
  }
`;

const AgroAisleSub = styled.span`
  display: block;

  margin-top: 3px;

  color: #9c8a55;

  font-size: 8px;

  letter-spacing: 0;

  @media (max-width: 700px) {
    font-size: 7px;
  }
`;

const AgroSideAisle = styled.div`
  border: 2px dashed #aa8c43;

  border-radius: 9px;

  display: flex;

  align-items: center;
  justify-content: center;

  text-align: center;

  color: #d7bc68;

  font-size: 9px;
  font-weight: 900;

  letter-spacing: 0.5px;

  @media (max-width: 700px) {
    min-height: 44px;
    font-size: 8px;
  }
`;

const AgroDirection = styled.div`
  text-align: center;

  color: #77857b;

  font-size: 9px;
  font-weight: 800;

  display: flex;

  align-items: center;
  justify-content: center;

  letter-spacing: 0.5px;

  @media (max-width: 700px) {
    font-size: 8px;
  }
`;


/* =========================================================
   RACKS
========================================================= */

const RackMini = styled.div`
  width: 100%;
  min-width: 0;

  height: ${p =>
    p.h || '135px'};

  border:
    2px solid
    ${p =>
      p.side
        ? '#00c9bd'
        : '#27d5c6'};

  background:
    linear-gradient(
      180deg,
      rgba(39,213,198,0.075),
      rgba(0,0,0,0.18)
    );

  border-radius: 6px;

  cursor: pointer;

  position: relative;

  padding: 5px;

  box-sizing: border-box;

  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;

  &:hover {
    transform: translateY(-2px);

    background:
      linear-gradient(
        180deg,
        rgba(39,213,198,0.16),
        rgba(0,0,0,0.18)
      );

    box-shadow:
      0 5px 14px rgba(0,0,0,0.25),
      0 0 0 2px rgba(39,213,198,0.15);
  }

  @media (max-width: 700px) {
    height: 62px;
    padding: 3px;
    border-width: 1px;
    border-radius: 5px;
  }
`;

const MiniSlots = styled.div`
  display: grid;

  grid-template-columns:
    repeat(4, 1fr);

  grid-template-rows:
    repeat(3, 1fr);

  height: 100%;

  gap: 3px;

  @media (max-width: 700px) {
    gap: 2px;
  }
`;

const MiniSlot = styled.div`
  border:
    1px solid
    rgba(178,255,246,0.42);

  border-radius: 2px;

  background:
    ${p =>
      p.occupied
        ? 'linear-gradient(135deg,#69d278,#3da851)'
        : 'rgba(255,255,255,0.035)'};

  min-width: 0;
  min-height: 0;

  position: relative;

  transition:
    background 0.15s ease,
    transform 0.15s ease;

  &:hover {
    transform: scale(1.04);
  }

  ${p =>
    p.highlight
      ? `
        outline: 2px solid #ffd54a;
        z-index: 3;
      `
      : ''}

  @media (max-width: 700px) {
    border-width: 1px;
  }
`;

const RackName = styled.div`
  position: absolute;

  left: 50%;

  transform: translateX(-50%);

  top: -21px;

  color: #e2faf6;

  font-size: 10px;
  font-weight: 900;

  white-space: nowrap;

  text-shadow:
    0 1px 3px #000;

  letter-spacing: 0.5px;

  @media (max-width: 700px) {
    top: -15px;
    font-size: 7px;
  }
`;

const RackAccess = styled.div`
  position: absolute;

  left: 50%;

  transform: translateX(-50%);

  bottom: -18px;

  color: #78867d;

  font-size: 7px;
  font-weight: 800;

  white-space: nowrap;

  @media (max-width: 700px) {
    bottom: -13px;
    font-size: 5px;
  }
`;


/* =========================================================
   CONTROL MAX
========================================================= */

const ControlGrid = styled.div`
  height: 100%;

  display: grid;

  grid-template-rows:
    repeat(10, 1fr);

  gap: 5px;

  @media (max-width: 700px) {
    gap: 4px;
    min-height: 300px;
  }
`;

const ControlRow = styled.div`
  display: grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap: 5px;

  @media (max-width: 700px) {
    gap: 4px;
  }
`;

const ControlSlot = styled.div`
  border: 2px solid #f29a28;

  background:
    ${p =>
      p.occupied
        ? 'linear-gradient(135deg,#efb15b,#d88622)'
        : 'rgba(242,154,40,0.07)'};

  border-radius: 4px;

  cursor: pointer;

  position: relative;

  min-height: 0;

  transition:
    transform 0.12s ease,
    filter 0.12s ease;

  &:hover {
    filter: brightness(1.15);
    transform: scale(1.03);
  }

  ${p =>
    p.highlight
      ? `
        outline: 3px solid #fff176;
        z-index: 3;
      `
      : ''}

  @media (max-width: 700px) {
    border-width: 1px;
    border-radius: 3px;
  }
`;

const StackBadge = styled.span`
  position: absolute;

  top: 2px;
  right: 3px;

  font-size: 8px;
  font-weight: 900;

  color: #fff;

  text-shadow:
    0 1px 2px #000;

  @media (max-width: 700px) {
    font-size: 6px;
  }
`;

const SlotInfo = styled.div`
  position: absolute;

  inset: 2px;

  display: flex;

  flex-direction: column;

  justify-content: center;
  align-items: center;

  text-align: center;

  gap: 1px;

  color: #fff;

  font-size: 7px;
  line-height: 1.05;
  font-weight: 800;

  text-shadow:
    0 1px 2px #000;

  pointer-events: none;

  overflow: hidden;

  @media (max-width: 700px) {
    font-size: 5px;
  }
`;

const SlotPallet = styled.div`
  max-width: 100%;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;
`;

const SlotLot = styled.div`
  max-width: 100%;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  opacity: 0.95;
`;

const SlotQty = styled.div`
  font-size: 6px;

  opacity: 0.9;

  @media (max-width: 700px) {
    font-size: 5px;
  }
`;


/* =========================================================
   ENTRADAS / EMERGENCIAS
========================================================= */

const Emergency = styled.div`
  position: absolute;

  z-index: 20;

  border: 3px solid #ff4b4b;

  background:
    rgba(255,75,75,0.14);

  color: #ff9b9b;

  font-size: 9px;
  font-weight: 900;

  padding: 5px 7px;

  border-radius: 4px;

  letter-spacing: 0.4px;

  box-shadow:
    0 2px 6px rgba(0,0,0,0.3);

  @media (max-width: 700px) {
    border-width: 2px;
    font-size: 7px;
    padding: 4px 5px;
  }
`;

const Entry = styled.div`
  position: absolute;

  z-index: 20;

  border: 3px solid #ff3f3f;

  background:
    rgba(255,63,63,0.14);

  color: #ff9696;

  font-size: 9px;
  font-weight: 900;

  padding: 5px 7px;

  border-radius: 4px;

  letter-spacing: 0.4px;

  box-shadow:
    0 2px 6px rgba(0,0,0,0.3);

  @media (max-width: 700px) {
    border-width: 2px;
    font-size: 7px;
    padding: 4px 5px;
  }
`;


/* =========================================================
   SEMILLAS · MAPA FÍSICO
========================================================= */

const SeedsBuildingContent = styled.div`
  position: relative;

  z-index: 5;

  min-height: 980px;

  padding: 58px 24px 35px;

  box-sizing: border-box;

  @media (max-width: 900px) {
    padding: 55px 15px 25px;
  }

  @media (max-width: 700px) {
    min-height: auto;
    width: 100%;
    max-width: 100%;
    padding: 55px 7px 25px;
  }
`;

const SeedsLayout = styled.div`
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    150px
    minmax(0, 1fr);

  gap: 14px;

  align-items: stretch;

  min-height: 900px;

  @media (max-width: 1050px) {
    grid-template-columns:
      minmax(0, 1fr)
      110px
      minmax(0, 1fr);

    gap: 8px;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
`;

const SeedsSide = styled.div`
  min-width: 0;

  border: 2px solid #8eaa61;

  border-radius: 10px;

  background:
    linear-gradient(
      180deg,
      rgba(142,170,97,0.08),
      rgba(142,170,97,0.025)
    );

  padding: 10px;

  box-sizing: border-box;

  @media (max-width: 700px) {
    width: 100%;
    padding: 8px 6px;
  }
`;

const SeedsSideTitle = styled.div`
  color: #b9d88b;

  font-size: 12px;

  font-weight: 900;

  text-align: center;

  margin-bottom: 9px;

  letter-spacing: 0.4px;

  line-height: 1.25;

  @media (max-width: 700px) {
    font-size: 10px;
    margin-bottom: 6px;
  }
`;

const SeedsSideInfo = styled.div`
  color: #78866f;

  font-size: 8px;

  font-weight: 800;

  text-align: center;

  margin-bottom: 9px;

  @media (max-width: 700px) {
    font-size: 7px;
    line-height: 1.3;
    margin-bottom: 6px;
  }
`;

const SeedsGrid = styled.div`
  display: grid;

  grid-template-columns: 1fr;

  gap: 4px;

  @media (max-width: 700px) {
    gap: 3px;
  }
`;

const SeedsRow = styled.div`
  display: grid;

  grid-template-columns:
    28px
    repeat(3, minmax(0, 1fr));

  gap: 4px;

  min-width: 0;

  align-items: stretch;

  @media (max-width: 700px) {
    grid-template-columns:
      22px
      repeat(3, minmax(0, 1fr));

    gap: 3px;
  }
`;

const SeedsRowNumber = styled.div`
  display: flex;

  align-items: center;
  justify-content: center;

  color: #8ea474;

  font-size: 8px;

  font-weight: 900;

  writing-mode: horizontal-tb;

  @media (max-width: 700px) {
    font-size: 6px;
  }
`;

const SeedsSlot = styled.div`
  min-width: 0;

  min-height: 34px;

  border:
    2px solid
    ${p =>
      p.occupied
        ? '#71c76e'
        : '#71805f'};

  border-radius: 5px;

  background:
    ${p =>
      p.occupied
        ? 'linear-gradient(135deg,#5ebd6b,#3f9650)'
        : 'rgba(255,255,255,0.035)'};

  position: relative;

  cursor: pointer;

  padding: 3px;

  box-sizing: border-box;

  overflow: hidden;

  transition:
    filter 0.12s ease,
    transform 0.12s ease;

  &:hover {
    filter: brightness(1.15);

    transform: scale(1.02);

    border-color: #c7e889;
  }

  ${p =>
    p.highlight
      ? `
        outline: 2px solid #fff176;
        z-index: 3;
      `
      : ''}

  @media (max-width: 700px) {
    min-height: 38px;
    padding: 2px;
    border-width: 1px;
  }
`;

const SeedsSlotId = styled.div`
  color: #d8e8c3;

  font-size: 7px;

  font-weight: 900;

  text-align: center;

  line-height: 1;

  margin-bottom: 2px;

  @media (max-width: 700px) {
    font-size: 5px;
  }
`;

const SeedsSlotContent = styled.div`
  display: flex;

  flex-direction: column;

  justify-content: center;
  align-items: center;

  text-align: center;

  min-width: 0;

  min-height: 18px;

  gap: 1px;

  color: #fff;

  font-size: 7px;

  line-height: 1.05;

  font-weight: 800;

  text-shadow:
    0 1px 2px #000;

  overflow: hidden;

  @media (max-width: 700px) {
    font-size: 5px;
    min-height: 15px;
  }
`;

const SeedsStackBadge = styled.div`
  position: absolute;

  top: 2px;
  right: 3px;

  color: #fff;

  font-size: 7px;

  font-weight: 900;

  text-shadow:
    0 1px 2px #000;

  @media (max-width: 700px) {
    font-size: 5px;
    top: 1px;
    right: 2px;
  }
`;

const SeedsAisle = styled.div`
  border:
    3px dashed
    #d8b45b;

  border-radius: 12px;

  background:
    repeating-linear-gradient(
      90deg,
      rgba(216,180,91,0.035),
      rgba(216,180,91,0.035) 8px,
      transparent 8px,
      transparent 16px
    );

  min-height: 100%;

  display: flex;

  align-items: center;

  justify-content: center;

  text-align: center;

  padding: 12px;

  box-sizing: border-box;

  @media (max-width: 760px) {
    min-height: 100px;
    width: 100%;
  }
`;

const SeedsAisleInner = styled.div`
  color: #e7c96d;

  font-weight: 900;

  font-size: 14px;

  line-height: 1.4;

  @media (max-width: 700px) {
    font-size: 11px;
  }
`;

const SeedsAisleIcon = styled.div`
  font-size: 38px;

  margin-bottom: 10px;

  @media (max-width: 700px) {
    font-size: 28px;
    margin-bottom: 5px;
  }
`;

const SeedsWallLabel = styled.div`
  position: absolute;

  color: #aaa;

  font-size: 10px;

  font-weight: 800;

  @media (max-width: 700px) {
    font-size: 7px;
  }
`;

const SeedsMapTitle = styled.div`
  position: absolute;

  top: 14px;
  left: 50%;

  transform: translateX(-50%);

  color: #fff;

  font-size: 17px;

  font-weight: 900;

  letter-spacing: 1px;

  text-align: center;

  white-space: nowrap;

  @media (max-width: 700px) {
    font-size: 13px;
    top: 14px;
  }
`;

const SeedsMapSubtitle = styled.div`
  position: absolute;

  top: 38px;
  left: 50%;

  transform: translateX(-50%);

  color: #aeb9ad;

  font-size: 10px;

  font-weight: 700;

  text-align: center;

  white-space: nowrap;

  @media (max-width: 700px) {
    font-size: 7px;
    top: 35px;
  }
`;

const SeedsEntry = styled.div`
  position: absolute;

  z-index: 7;

  top: 5px;
  left: 4%;

  border: 3px solid #ff3f3f;

  background:
    rgba(255,63,63,0.14);

  color: #ff9696;

  font-size: 10px;

  font-weight: 900;

  padding: 5px 7px;

  border-radius: 3px;

  @media (max-width: 700px) {
    border-width: 2px;
    font-size: 7px;
    padding: 3px 5px;
  }
`;

const SeedsEmergency = styled.div`
  position: absolute;

  z-index: 7;

  bottom: 5px;

  border: 3px solid #ff4b4b;

  background:
    rgba(255,75,75,0.14);

  color: #ff9b9b;

  font-size: 10px;

  font-weight: 900;

  padding: 5px 7px;

  border-radius: 3px;

  @media (max-width: 700px) {
    border-width: 2px;
    font-size: 7px;
    padding: 3px 5px;
  }
`;


/* =========================================================
   COMPONENT
========================================================= */

export default function WarehouseMap() {
  const {
    data: saved = {},
    isLoading,
  } = useGetWarehouseMapQuery();

  const [
    saveMap,
    {
      isLoading: saving,
    },
  ] = useSaveWarehouseMapMutation();

  const [
    updatePalletLocation,
  ] = useUpdatePalletLocationMutation();

  const [
    warehouse,
    setWarehouse,
  ] = useState('agroquimicos');

  const [
    map,
    setMap,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    dragged,
    setDragged,
  ] = useState(null);

  const [
    detail,
    setDetail,
  ] = useState(null);


  /* =========================================================
     ALL RACKS
  ========================================================= */

  const allRacks = [
    ...racksFront,
    ...racksSide,
    ...racksFront2,
    ...racksSide2,
  ];


  /* =========================================================
     MAPAS GUARDADOS
  ========================================================= */

  const savedMaps = {
    agroquimicos:
      saved?.agroquimicos || {
        occupied:
          saved?.occupied || {},
      },

    semillas:
      saved?.semillas || {
        occupied: {},
      },
  };


  /* =========================================================
     RECUPERAR INGRESO PENDIENTE
  ========================================================= */

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem(
          'miru_pending_warehouse_placement'
        );

      if (!raw) return;

      const pending =
        JSON.parse(raw);

      if (pending?.product?.id) {
        setSelectedProduct({
          ...pending.product,
          _pendingPlacement: true,
        });

        message.info(
          `Ingreso listo para ubicar: ${pending.product.nombre}. Elegí una posición libre.`
        );
      }
    } catch (error) {
      console.warn(
        'No se pudo recuperar el ingreso pendiente:',
        error
      );
    }
  }, []);


  /* =========================================================
     PRODUCTOS
  ========================================================= */

  const {
    data: consumables = [],
  } = useGetConsumablesQuery();

  const {
    data: reagents = [],
  } = useGetReagentsQuery();

  const {
    data: equipment = [],
  } = useGetEquipmentQuery();

  const products = useMemo(
    () => [
      ...consumables.map(x => ({
        ...x,
        categoria: 'consumables',
      })),

      ...reagents.map(x => ({
        ...x,
        categoria: 'reagents',
      })),

      ...equipment.map(x => ({
        ...x,
        categoria: 'equipment',
      })),
    ],
    [
      consumables,
      reagents,
      equipment,
    ]
  );


  /* =========================================================
     ESTADO MAPA
  ========================================================= */

  const state =
    map ||
    savedMaps[warehouse] || {
      occupied: {},
    };

  const occupied =
    state.occupied || {};


  /* =========================================================
     ESTADÍSTICAS
  ========================================================= */

  const allSlots =
    warehouse === 'semillas'
      ? semillasSlots.length
      : allRacks.length +
        controlMax.length;

  const occupiedEntries =
    Object.entries(
      occupied
    );

  const occupiedPallets =
    occupiedEntries.reduce(
      (total, [, value]) =>
        total +
        stackOf(value).length,
      0
    );

  const occupiedPositions =
    occupiedEntries.filter(
      ([, value]) =>
        stackOf(value).length > 0
    ).length;

  const freePositions =
    Math.max(
      0,
      allSlots -
        occupiedPositions
    );

  const controlPallets =
    controlMax.reduce(
      (total, slot) =>
        total +
        stackOf(
          occupied[slot.id]
        ).length,
      0
    );


  /* =========================================================
     PRODUCTOS FILTRADOS
  ========================================================= */

  const filteredProducts =
    products.filter(product => {
      const q =
        search
          .trim()
          .toLowerCase();

      if (!q) return true;

      return [
        itemName(product),
        itemLot(product),
        product.ubicacion,
        product.codigoBarras,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(q)
      );
    });


  /* =========================================================
     PAYLOAD
  ========================================================= */

  const productPayload =
    product => ({
      id: String(
        product?._id ||
        product?.id ||
        ''
      ),

      nombre:
        itemName(product),

      lote:
        product?.lote ||
        itemLot(product),

      categoria:
        product?.categoria ||
        '',

      ubicacion:
        product?.ubicacion ||
        '',

      cantidad:
        Number(
          product?.cantidad || 0
        ),

      numeroPallet:
        product?.numeroPallet ||
        '',

      palletId:
        product?.palletId ||
        '',
    });


  const palletInfo =
    pallet => ({
      numeroPallet:
        pallet?.numeroPallet ||
        pallet?.pallet?.numeroPallet ||
        '',

      lote:
        pallet?.lote ||
        '',

      cantidad:
        Number(
          pallet?.cantidad ||
          pallet?.pallet?.cantidad ||
          0
        ),

      unidad:
        pallet?.unidad ||
        '',

      nombre:
        itemName(pallet),
    });


  const slotLabel =
    pallet => {
      const info =
        palletInfo(pallet);

      return {
        pallet:
          info.numeroPallet ||
          'PALLET',

        lote:
          info.lote ||
          'Sin lote',

        qty:
          info.cantidad
            ? `${info.cantidad} ${info.unidad}`.trim()
            : '',
      };
    };


  /* =========================================================
     SINCRONIZAR UBICACIÓN
  ========================================================= */

  const sincronizarUbicacionPallet =
    async (
      product,
      ubicacion
    ) => {
      if (
        !product?.palletId ||
        !product?.id ||
        !product?.categoria
      ) {
        return true;
      }

      try {
        await updatePalletLocation({
          categoria:
            product.categoria,

          id:
            product.id,

          palletId:
            product.palletId,

          ubicacion,
        }).unwrap();

        return true;
      } catch (error) {
        console.error(
          'No se pudo actualizar la ubicación del pallet:',
          error
        );

        message.error(
          error?.data?.error ||
            'No se pudo actualizar la ubicación del pallet en MIRÚ.'
        );

        return false;
      }
    };


  /* =========================================================
     COLOCAR PALLET
  ========================================================= */

  const put =
    async (
      slotId,
      product,
      maxStack = 1
    ) => {
      if (!product) return;

      const current =
        stackOf(
          occupied[slotId]
        );

      if (
        current.length >=
        maxStack
      ) {
        message.warning(
          `La posición admite ${maxStack} pallet${
            maxStack > 1
              ? 's'
              : ''
          }.`
        );

        return;
      }

      const payload =
        productPayload(
          product
        );

      const ok =
        await sincronizarUbicacionPallet(
          payload,
          slotId
        );

      if (!ok) return;

      setMap({
        ...state,

        occupied: {
          ...occupied,

          [slotId]: [
            ...current,
            payload,
          ],
        },
      });

      if (
        product?._pendingPlacement
      ) {
        sessionStorage.removeItem(
          'miru_pending_warehouse_placement'
        );
      }

      setSelectedProduct(null);
      setDragged(null);

      message.success(
        `Pallet ubicado en ${slotId}.`
      );
    };


  /* =========================================================
     MOVER PALLET
  ========================================================= */

  const move =
    async (
      from,
      to,
      maxStack = 1
    ) => {
      const source =
        stackOf(
          occupied[from]
        );

      const dest =
        stackOf(
          occupied[to]
        );

      if (!source.length)
        return;

      if (dest.length) {
        message.warning(
          'La posición destino ya está ocupada.'
        );

        return;
      }

      if (
        source.length >
        maxStack
      ) {
        message.warning(
          'La posición destino no tiene capacidad suficiente.'
        );

        return;
      }

      const pallet =
        source[
          source.length - 1
        ];

      const ok =
        await sincronizarUbicacionPallet(
          pallet,
          to
        );

      if (!ok) return;

      const next = {
        ...occupied,
      };

      if (
        source.length === 1
      ) {
        delete next[from];
      } else {
        next[from] =
          source.slice(0, -1);
      }

      next[to] = [pallet];

      setMap({
        ...state,
        occupied: next,
      });

      setDragged(null);

      message.success(
        `Pallet movido a ${to}.`
      );
    };


  /* =========================================================
     CLICK / DRAG
  ========================================================= */

  const addOrMove =
    (
      slotId,
      maxStack = 1
    ) => {
      if (
        dragged &&
        String(
          dragged
        ).startsWith(
          'PRODUCT:'
        )
      ) {
        const product =
          selectedProduct;

        setDragged(null);

        return put(
          slotId,
          product,
          maxStack
        );
      }

      if (dragged) {
        return move(
          dragged,
          slotId,
          maxStack
        );
      }

      if (selectedProduct) {
        return put(
          slotId,
          selectedProduct,
          maxStack
        );
      }

      setDetail({
        id: slotId,

        product:
          stackOf(
            occupied[slotId]
          ),
      });
    };


  /* =========================================================
     LIBERAR PALLET
  ========================================================= */

  const clear =
    async id => {
      const stack =
        stackOf(
          occupied[id]
        );

      if (!stack.length)
        return;

      const pallet =
        stack[
          stack.length - 1
        ];

      const ok =
        await sincronizarUbicacionPallet(
          pallet,
          ''
        );

      if (!ok) return;

      const next = {
        ...occupied,
      };

      if (
        stack.length === 1
      ) {
        delete next[id];
      } else {
        next[id] =
          stack.slice(0, -1);
      }

      setMap({
        ...state,
        occupied: next,
      });

      message.success(
        `Pallet retirado de ${id}.`
      );
    };


  /* =========================================================
     GUARDAR MAPA
  ========================================================= */

  const save =
    async () => {
      try {
        const currentMaps = {
          ...savedMaps,

          [warehouse]:
            state,
        };

        await saveMap(
          currentMaps
        ).unwrap();

        message.success(
          warehouse ===
          'semillas'
            ? 'Mapa de Semillas guardado.'
            : 'Mapa de Agroquímicos guardado.'
        );
      } catch (error) {
        console.error(
          'Error guardando mapa:',
          error
        );

        message.error(
          'No se pudo guardar el mapa.'
        );
      }
    };


  /* =========================================================
     BUSCADOR
  ========================================================= */

  const isMatch =
    product => {
      if (!search)
        return false;

      const q =
        search.toLowerCase();

      return [
        product?.nombre,
        product?.lote,
      ].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(q)
      );
    };


  /* =========================================================
     CAMBIAR GALPÓN
  ========================================================= */

  const cambiarGalpon =
    tipo => {
      setWarehouse(tipo);
      setMap(null);
      setSelectedProduct(null);
      setDragged(null);
      setDetail(null);
    };


  /* =========================================================
     RACK MINI
  ========================================================= */

  const renderRackMini =
    (
      rack,
      side = false
    ) => (
      <Tooltip
        key={rack[0].rack}
        title={
          `Rack ${String(
            rack[0].rack
          ).padStart(2, '0')} · 12 pallets · acceso ${
            side
              ? 'lateral'
              : 'frontal'
          }`
        }
      >
        <RackMini
          side={side}

          onClick={() =>
            setDetail({
              id:
                `R${String(
                  rack[0].rack
                ).padStart(
                  2,
                  '0'
                )}`,

              rack:
                rack[0].rack,

              product:
                rack.flatMap(
                  slot =>
                    stackOf(
                      occupied[
                        slot.id
                      ]
                    ).map(
                      pallet => ({
                        ...pallet,
                        slot:
                          slot.id,
                      })
                    )
                ),
            })
          }
        >
          <RackName>
            R
            {String(
              rack[0].rack
            ).padStart(
              2,
              '0'
            )}
          </RackName>

          <MiniSlots>
            {rack.map(
              slot => {
                const stack =
                  stackOf(
                    occupied[
                      slot.id
                    ]
                  );

                return (
                  <Tooltip
                    key={
                      slot.id
                    }
                    title={`${slot.id}${
                      stack[0]
                        ? ` · ${stack[0].nombre}`
                        : ' · Libre'
                    }`}
                  >
                    <MiniSlot
                      occupied={
                        !!stack.length
                      }

                      highlight={isMatch(
                        stack[0]
                      )}

                      draggable={
                        !!stack.length
                      }

                      onDragStart={
                        e => {
                          e.stopPropagation();

                          setDragged(
                            slot.id
                          );

                          setSelectedProduct(
                            null
                          );
                        }
                      }

                      onDragOver={
                        e =>
                          e.preventDefault()
                      }

                      onDrop={e => {
                        e.stopPropagation();

                        addOrMove(
                          slot.id,
                          1
                        );
                      }}

                      onClick={e => {
                        e.stopPropagation();

                        addOrMove(
                          slot.id,
                          1
                        );
                      }}
                    >
                      {stack[0] && (
                        <SlotInfo>
                          {(() => {
                            const label =
                              slotLabel(
                                stack[0]
                              );

                            return (
                              <>
                                <SlotPallet>
                                  {
                                    label.pallet
                                  }
                                </SlotPallet>

                                <SlotLot>
                                  {
                                    label.lote
                                  }
                                </SlotLot>

                                {label.qty && (
                                  <SlotQty>
                                    {
                                      label.qty
                                    }
                                  </SlotQty>
                                )}
                              </>
                            );
                          })()}
                        </SlotInfo>
                      )}
                    </MiniSlot>
                  </Tooltip>
                );
              }
            )}
          </MiniSlots>

          <RackAccess>
            {side
              ? 'ACCESO LATERAL'
              : 'ACCESO FRONTAL'}
          </RackAccess>
        </RackMini>
      </Tooltip>
    );


  /* =========================================================
     CONTROL MAX
  ========================================================= */

  const renderControl =
    () => (
      <AgroControlPanel>

        <AgroControlTitle>
          CONTROL MAX · APILADO
        </AgroControlTitle>

        <ControlGrid>

          {Array.from(
            { length: 10 },
            (_, rowIndex) => (
              <ControlRow
                key={rowIndex}
              >
                {controlMax
                  .slice(
                    rowIndex * 3,
                    rowIndex * 3 + 3
                  )
                  .map(
                    slot => {
                      const stack =
                        stackOf(
                          occupied[
                            slot.id
                          ]
                        );

                      const product =
                        stack[
                          stack.length - 1
                        ];

                      return (
                        <Tooltip
                          key={
                            slot.id
                          }

                          title={`${slot.id}${
                            product
                              ? ` · ${product.nombre}`
                              : ' · Libre'
                          } · ${stack.length}/2`}
                        >
                          <ControlSlot
                            occupied={
                              !!product
                            }

                            highlight={isMatch(
                              product
                            )}

                            draggable={
                              !!product
                            }

                            onDragStart={() => {
                              setDragged(
                                slot.id
                              );

                              setSelectedProduct(
                                null
                              );
                            }}

                            onDragOver={
                              e =>
                                e.preventDefault()
                            }

                            onDrop={() =>
                              addOrMove(
                                slot.id,
                                2
                              )
                            }

                            onClick={() =>
                              addOrMove(
                                slot.id,
                                2
                              )
                            }
                          >

                            <StackBadge>
                              {
                                stack.length
                              }
                              /2
                            </StackBadge>

                            {product && (
                              <SlotInfo>
                                {(() => {
                                  const label =
                                    slotLabel(
                                      product
                                    );

                                  return (
                                    <>
                                      <SlotPallet>
                                        {
                                          label.pallet
                                        }
                                      </SlotPallet>

                                      <SlotLot>
                                        {
                                          label.lote
                                        }
                                      </SlotLot>

                                      {label.qty && (
                                        <SlotQty>
                                          {
                                            label.qty
                                          }
                                        </SlotQty>
                                      )}
                                    </>
                                  );
                                })()}
                              </SlotInfo>
                            )}

                          </ControlSlot>
                        </Tooltip>
                      );
                    }
                  )}
              </ControlRow>
            )
          )}

        </ControlGrid>

      </AgroControlPanel>
    );


  /* =========================================================
     SEMILLAS SLOT
  ========================================================= */

  const renderSemillasSlot =
    slot => {
      const stack =
        stackOf(
          occupied[slot.id]
        );

      const product =
        stack[
          stack.length - 1
        ];

      const label =
        product
          ? slotLabel(product)
          : null;

      return (
        <Tooltip
          key={slot.id}

          title={`${slot.id} · ${
            product
              ? `${product.nombre} · ${stack.length}/3`
              : 'Libre · 0/3'
          }`}
        >
          <SeedsSlot
            occupied={
              stack.length > 0
            }

            highlight={isMatch(
              product
            )}

            draggable={
              stack.length > 0
            }

            onDragStart={e => {
              e.stopPropagation();

              setDragged(
                slot.id
              );

              setSelectedProduct(
                null
              );
            }}

            onDragOver={e =>
              e.preventDefault()
            }

            onDrop={e => {
              e.stopPropagation();

              addOrMove(
                slot.id,
                3
              );
            }}

            onClick={e => {
              e.stopPropagation();

              addOrMove(
                slot.id,
                3
              );
            }}
          >

            <SeedsSlotId>
              P{String(
                slot.position
              ).padStart(
                2,
                '0'
              )}
            </SeedsSlotId>

            <SeedsStackBadge>
              {stack.length}/3
            </SeedsStackBadge>

            {product ? (
              <SeedsSlotContent>

                <SlotPallet>
                  {label.pallet}
                </SlotPallet>

                <SlotLot>
                  {label.lote}
                </SlotLot>

              </SeedsSlotContent>
            ) : (
              <SeedsSlotContent>
                <span
                  style={{
                    opacity: 0.45,
                  }}
                >
                  LIBRE
                </span>
              </SeedsSlotContent>
            )}

          </SeedsSlot>
        </Tooltip>
      );
    };


  /* =========================================================
     MAPA SEMILLAS
  ========================================================= */

  const renderSemillas =
    () => {
      const filasA =
        Array.from(
          { length: 25 },
          (_, index) =>
            semillasSlots.filter(
              slot =>
                slot.lado === 'A' &&
                slot.row ===
                  index + 1
            )
        );

      const filasB =
        Array.from(
          { length: 25 },
          (_, index) =>
            semillasSlots.filter(
              slot =>
                slot.lado === 'B' &&
                slot.row ===
                  index + 1
            )
        );

      const renderLado =
        filas =>
          filas.map(
            (fila, index) => (
              <SeedsRow
                key={
                  `fila-${index + 1}`
                }
              >

                <SeedsRowNumber>
                  F{String(
                    index + 1
                  ).padStart(
                    2,
                    '0'
                  )}
                </SeedsRowNumber>

                {fila.map(
                  renderSemillasSlot
                )}

              </SeedsRow>
            )
          );

      return (
        <Building>

          <TopWall />
          <BottomWall />

          <SeedsMapTitle>
            🌱 GALPÓN DE SEMILLAS
          </SeedsMapTitle>

          <SeedsMapSubtitle>
            150 posiciones de piso · 3 pallets por posición · máximo 450 pallets
          </SeedsMapSubtitle>

          <SeedsEntry>
            ENTRADA
          </SeedsEntry>

          <SeedsEmergency
            style={{
              left: '5%',
            }}
          >
            EMERGENCIA
          </SeedsEmergency>

          <SeedsEmergency
            style={{
              right: '5%',
            }}
          >
            EMERGENCIA
          </SeedsEmergency>

          <SeedsBuildingContent>

            <SeedsLayout>

              {/* =========================================
                  LADO A
              ========================================= */}

              <SeedsSide>

                <SeedsSideTitle>
                  PALLETS · LADO A
                </SeedsSideTitle>

                <SeedsSideInfo>
                  25 FILAS · 3 POSICIONES/FILA · 75 POSICIONES · 225 PALLETS
                </SeedsSideInfo>

                <SeedsGrid>
                  {renderLado(
                    filasA
                  )}
                </SeedsGrid>

              </SeedsSide>


              {/* =========================================
                  PASILLO CENTRAL
              ========================================= */}

              <SeedsAisle>

                <SeedsAisleInner>

                  <SeedsAisleIcon>
                    🐴
                  </SeedsAisleIcon>

                  PASILLO
                  <br />
                  CENTRAL

                  <div
                    style={{
                      fontSize: 10,
                      marginTop: 8,
                      opacity: 0.75,
                    }}
                  >
                    ESPACIO
                    <br />
                    PARA MULA
                  </div>

                  <div
                    style={{
                      fontSize: 9,
                      marginTop: 18,
                      opacity: 0.6,
                    }}
                  >
                    CIRCULACIÓN
                    <br />
                    F01 → F25
                  </div>

                </SeedsAisleInner>

              </SeedsAisle>


              {/* =========================================
                  LADO B
              ========================================= */}

              <SeedsSide>

                <SeedsSideTitle>
                  PALLETS · LADO B
                </SeedsSideTitle>

                <SeedsSideInfo>
                  25 FILAS · 3 POSICIONES/FILA · 75 POSICIONES · 225 PALLETS
                </SeedsSideInfo>

                <SeedsGrid>
                  {renderLado(
                    filasB
                  )}
                </SeedsGrid>

              </SeedsSide>

            </SeedsLayout>


            <SeedsWallLabel
              style={{
                left: '30px',
                bottom: '8px',
              }}
            >
              PARED
            </SeedsWallLabel>

            <SeedsWallLabel
              style={{
                right: '30px',
                bottom: '8px',
              }}
            >
              PARED
            </SeedsWallLabel>

          </SeedsBuildingContent>

        </Building>
      );
    };


  /* =========================================================
     LOADING
  ========================================================= */

  if (isLoading) {
    return (
      <Wrapper>
        Cargando mapa...
      </Wrapper>
    );
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <Wrapper>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <Header>

        <h1
          style={{
            margin: 0,
            color: '#23452b',
          }}
        >
          <ApartmentOutlined />{' '}
          Mapa físico del galpón
        </h1>

        <p
          style={{
            margin: '6px 0 0',
            color: '#66736a',
          }}
        >
          Seleccioná el galpón que querés visualizar
          y administrar.
        </p>

        <Toolbar>

          <WarehouseSelector>

            <Button
              type={
                warehouse ===
                'agroquimicos'
                  ? 'primary'
                  : 'default'
              }

              onClick={() =>
                cambiarGalpon(
                  'agroquimicos'
                )
              }
            >
              🧪 Agroquímicos
            </Button>

            <Button
              type={
                warehouse ===
                'semillas'
                  ? 'primary'
                  : 'default'
              }

              onClick={() =>
                cambiarGalpon(
                  'semillas'
                )
              }
            >
              🌱 Semillas
            </Button>

          </WarehouseSelector>

          <Input
            prefix={
              <SearchOutlined />
            }

            placeholder="Buscar producto, lote o ubicación"

            value={search}

            onChange={e =>
              setSearch(
                e.target.value
              )
            }

            style={{
              maxWidth: 380,
              width: '100%',
            }}

            allowClear
          />

          <Button
            type="primary"

            icon={
              <SaveOutlined />
            }

            loading={saving}

            onClick={save}
          >
            Guardar mapa
          </Button>

          {selectedProduct && (
            <Tag
              closable

              onClose={() =>
                setSelectedProduct(
                  null
                )
              }
            >
              Seleccionado:{' '}
              {itemName(
                selectedProduct
              )}
            </Tag>
          )}

        </Toolbar>


        {/* ===================================================
            STATS
        =================================================== */}

        <StatsGrid>

          <StatCard>

            <StatValue>
              {occupiedPallets}
            </StatValue>

            <StatLabel>
              Pallets ubicados
            </StatLabel>

          </StatCard>


          <StatCard>

            <StatValue>
              {occupiedPositions}
            </StatValue>

            <StatLabel>
              Posiciones ocupadas
            </StatLabel>

          </StatCard>


          <StatCard>

            <StatValue>
              {freePositions}
            </StatValue>

            <StatLabel>
              Posiciones libres
            </StatLabel>

          </StatCard>


          {warehouse ===
          'agroquimicos' ? (

            <StatCard>

              <StatValue>
                {controlPallets}/60
              </StatValue>

              <StatLabel>
                CONTROL MAX ocupado
              </StatLabel>

            </StatCard>

          ) : (

            <StatCard>

              <StatValue>
                {occupiedPallets}/450
              </StatValue>

              <StatLabel>
                Capacidad Semillas
              </StatLabel>

            </StatCard>

          )}

        </StatsGrid>


        {/* ===================================================
            LEYENDA
        =================================================== */}

        <Legend>

          {warehouse ===
          'agroquimicos' ? (

            <>

              <Tag color="cyan">
                Racks 01–16
              </Tag>

              <Tag color="cyan">
                Racks 18–25 / 30–33 · acceso lateral
              </Tag>

              <Tag color="orange">
                CONTROL MAX · 10 × 3 × 2 = 60 pallets
              </Tag>

              <Tag color="green">
                Pallet ocupado
              </Tag>

              <Tag>
                Posición libre
              </Tag>

              <Tag color="red">
                Entrada / salidas de emergencia
              </Tag>

            </>

          ) : (

            <>

              <Tag color="green">
                🌱 Semillas
              </Tag>

              <Tag color="green">
                150 posiciones
              </Tag>

              <Tag color="gold">
                3 pallets por posición
              </Tag>

              <Tag color="orange">
                Capacidad máxima · 450 pallets
              </Tag>

              <Tag>
                Pasillo central para mula
              </Tag>

              <Tag color="red">
                Entrada / salidas de emergencia
              </Tag>

            </>

          )}

        </Legend>

      </Header>


      {/* =====================================================
          MAPA AGROQUÍMICOS
      ===================================================== */}

      {warehouse ===
        'agroquimicos' && (

        <Building>

          <TopWall />
          <BottomWall />

          <Entry
            style={{
              left: '18px',
              top: '10px',
            }}
          >
            ENTRADA PRINCIPAL
          </Entry>

          <Emergency
            style={{
              right: '10px',
              top: '48%',
            }}
          >
            SALIDA
          </Emergency>

          <Emergency
            style={{
              left: '10%',
              bottom: '8px',
            }}
          >
            EMERGENCIA
          </Emergency>

          <Emergency
            style={{
              left: '47%',
              bottom: '8px',
            }}
          >
            EMERGENCIA
          </Emergency>

          <Emergency
            style={{
              right: '7%',
              bottom: '8px',
            }}
          >
            EMERGENCIA
          </Emergency>


          <AgroMap>

            <AgroMapTitle>
              🧪 GALPÓN DE AGROQUÍMICOS
            </AgroMapTitle>

            <AgroMapSubtitle>
              MAPA FÍSICO · UBICACIONES DE PALLETS · CIRCULACIÓN INTERNA
            </AgroMapSubtitle>


            {/* =================================================
                CONTROL MAX
            ================================================= */}

            {renderControl()}


            {/* =================================================
                SECTOR CENTRAL
            ================================================= */}

            <AgroMainArea>

              <AgroSection>

                <AgroSectionTitle>
                  RACKS 01–16 · ACCESO FRONTAL
                </AgroSectionTitle>

                <AgroSectionInfo>
                  16 racks · 12 posiciones c/u
                </AgroSectionInfo>

                <AgroRackGrid>

                  {racksFront.map(
                    rack =>
                      renderRackMini(
                        rack,
                        false
                      )
                  )}

                </AgroRackGrid>

              </AgroSection>


              <AgroAisle>

                <div>
                  ↔ PASILLO PRINCIPAL · CIRCULACIÓN DE MULA

                  <AgroAisleSub>
                    ACCESO ENTRE SECTORES
                  </AgroAisleSub>
                </div>

              </AgroAisle>


              <AgroSection>

                <AgroSectionTitle>
                  RACKS 18–25 · ACCESO LATERAL
                </AgroSectionTitle>

                <AgroSectionInfo>
                  8 racks · acceso con mula
                </AgroSectionInfo>

                <AgroRackGridSingle>

                  {racksSide.map(
                    rack =>
                      renderRackMini(
                        rack,
                        true
                      )
                  )}

                </AgroRackGridSingle>

              </AgroSection>

            </AgroMainArea>


            {/* =================================================
                SECTOR DERECHO
            ================================================= */}

            <AgroSideArea>

              <AgroSection>

                <AgroSectionTitle>
                  RACKS 26–29
                </AgroSectionTitle>

                <AgroSectionInfo>
                  4 racks
                </AgroSectionInfo>

                <AgroRackGridFour>

                  {racksFront2.map(
                    rack =>
                      renderRackMini(
                        rack,
                        false
                      )
                  )}

                </AgroRackGridFour>

              </AgroSection>


              <AgroDirection>
                ← PASILLO LATERAL →
              </AgroDirection>


              <AgroSection>

                <AgroSectionTitle>
                  RACKS 30–33 · ACCESO LATERAL
                </AgroSectionTitle>

                <AgroSectionInfo>
                  4 racks · mula
                </AgroSectionInfo>

                <AgroRackGridFour>

                  {racksSide2.map(
                    rack =>
                      renderRackMini(
                        rack,
                        true
                      )
                  )}

                </AgroRackGridFour>

              </AgroSection>

            </AgroSideArea>

          </AgroMap>

        </Building>
      )}


      {/* =====================================================
          MAPA SEMILLAS
      ===================================================== */}

      {warehouse ===
        'semillas' &&
        renderSemillas()}


      {/* =====================================================
          PRODUCTOS
      ===================================================== */}

      <Card
        style={{
          marginTop: 16,
          width: '100%',
          maxWidth: '100%',
        }}

        title={
          <>
            <DragOutlined /> Productos disponibles para ubicar
          </>
        }

        extra={
          <span>
            {
              filteredProducts.length
            } productos
          </span>
        }
      >

        <p
          style={{
            fontSize: 12,
            color: '#66736a',
          }}
        >
          Arrastrá un producto sobre una
          posición libre. También podés hacer
          clic en un producto y después en la
          posición. Para mover un pallet,
          arrastrá la celda verde a otra posición.
          En Semillas se permiten hasta 3 pallets
          por posición.
        </p>

        <Unassigned>

          {filteredProducts.map(
            product => {
              const ubicacion =
                product.ubicacion ||
                '';

              const tieneUbicacion =
                !!ubicacion;

              return (
                <ProductCard
                  key={`${product.categoria}-${product._id || product.id}`}

                  draggable={
                    !tieneUbicacion
                  }

                  onDragStart={() => {
                    if (
                      tieneUbicacion
                    ) {
                      message.info(
                        `Este producto ya figura en ${ubicacion}. Mové el pallet desde el mapa.`
                      );

                      return;
                    }

                    setDragged(
                      `PRODUCT:${product._id || product.id}`
                    );

                    setSelectedProduct(
                      product
                    );
                  }}

                  onClick={() =>
                    setSelectedProduct(
                      product
                    )
                  }
                >

                  <b>
                    {itemName(
                      product
                    )}
                  </b>

                  <div>
                    Lote:{' '}
                    {itemLot(
                      product
                    ) || '—'}
                  </div>

                  <div>
                    Stock:{' '}
                    {product.cantidad ??
                      '—'}{' '}
                    {product.unidad ||
                      ''}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                    }}
                  >
                    <Tag
                      color={
                        tieneUbicacion
                          ? 'green'
                          : 'gold'
                      }
                    >
                      {tieneUbicacion
                        ? `Ubicado · ${ubicacion}`
                        : 'Sin ubicación'}
                    </Tag>
                  </div>

                </ProductCard>
              );
            }
          )}

        </Unassigned>

      </Card>


      {/* =====================================================
          MODAL
      ===================================================== */}

      <Modal
        open={!!detail}

        title={
          detail?.rack
            ? `RACK ${String(
                detail.rack
              ).padStart(
                2,
                '0'
              )} · 12 posiciones`
            : detail?.id
        }

        onCancel={() =>
          setDetail(null)
        }

        footer={
          detail?.product?.length
            ? [

                <Button
                  key="del"
                  danger
                  icon={
                    <DeleteOutlined />
                  }

                  onClick={
                    async () => {

                      if (
                        detail.rack
                      ) {

                        for (
                          const pallet of
                          detail.product ||
                          []
                        ) {

                          const ok =
                            await sincronizarUbicacionPallet(
                              pallet,
                              ''
                            );

                          if (!ok)
                            return;
                        }

                        const next = {
                          ...occupied,
                        };

                        detail.product.forEach(
                          pallet =>
                            delete next[
                              pallet.slot
                            ]
                        );

                        setMap({
                          ...state,
                          occupied: next,
                        });

                        message.success(
                          `Se liberaron las posiciones del rack ${String(
                            detail.rack
                          ).padStart(
                            2,
                            '0'
                          )}.`
                        );

                      } else {

                        await clear(
                          detail.id
                        );

                      }

                      setDetail(
                        null
                      );
                    }
                  }
                >
                  Liberar posiciones
                </Button>,

                <Button
                  key="close"
                  onClick={() =>
                    setDetail(
                      null
                    )
                  }
                >
                  Cerrar
                </Button>,

              ]

            : [

                <Button
                  key="close"
                  onClick={() =>
                    setDetail(
                      null
                    )
                  }
                >
                  Cerrar
                </Button>,

              ]
        }
      >

        {/* ===================================================
            DETALLE RACK
        =================================================== */}

        {detail?.rack ? (

          <>

            <p>
              <b>
                Capacidad:
              </b>{' '}
              12 pallets ·{' '}

              <b>
                Acceso:
              </b>{' '}

              {detail.rack >=
              18
                ? 'lateral con mula'
                : 'frente'}
            </p>

            {detail.product
              ?.length ? (

              detail.product.map(
                (
                  pallet,
                  index
                ) => {

                  const label =
                    slotLabel(
                      pallet
                    );

                  return (
                    <div
                      key={`${pallet.slot}-${index}`}

                      style={{
                        padding:
                          '7px 0',

                        borderBottom:
                          '1px solid #eee',
                      }}
                    >

                      <b>
                        {
                          pallet.nombre
                        }
                      </b>

                      <div>
                        <b>
                          Pallet:
                        </b>{' '}
                        {
                          label.pallet
                        }
                      </div>

                      <div>
                        <b>
                          Ubicación:
                        </b>{' '}
                        {
                          pallet.slot
                        }
                      </div>

                      <div>
                        <b>
                          Lote:
                        </b>{' '}
                        {
                          label.lote
                        }
                      </div>

                      <div>
                        <b>
                          Cantidad:
                        </b>{' '}
                        {
                          label.qty ||
                          '—'
                        }
                      </div>

                    </div>
                  );
                }

              )

            ) : (

              <p>
                No hay pallets ubicados
                en este rack.
              </p>

            )}

          </>

        ) : detail?.product
            ?.length ? (

          /* =================================================
             DETALLE POSICIÓN
          ================================================= */

          <>

            <p>

              <b>
                Pallets apilados:
              </b>{' '}

              {
                detail.product
                  .length
              }

              /

              {warehouse ===
              'semillas'
                ? 3
                : 2}

            </p>

            {detail.product.map(
              (
                pallet,
                index
              ) => {

                const label =
                  slotLabel(
                    pallet
                  );

                return (
                  <div
                    key={index}

                    style={{
                      padding:
                        '7px 0',

                      borderBottom:
                        '1px solid #eee',
                    }}
                  >

                    <b>
                      {index + 1}.{' '}
                      {
                        pallet.nombre
                      }
                    </b>

                    <div>
                      <b>
                        Pallet:
                      </b>{' '}
                      {
                        label.pallet
                      }
                    </div>

                    <div>
                      <b>
                        Ubicación:
                      </b>{' '}
                      {
                        pallet.ubicacion ||
                        detail.id
                      }
                    </div>

                    <div>
                      <b>
                        Lote:
                      </b>{' '}
                      {
                        label.lote
                      }
                    </div>

                    <div>
                      <b>
                        Cantidad:
                      </b>{' '}
                      {
                        label.qty ||
                        '—'
                      }
                    </div>

                    <div>
                      <b>
                        Categoría:
                      </b>{' '}
                      {
                        pallet.categoria
                      }
                    </div>

                  </div>
                );
              }
            )}

          </>

        ) : (

          /* =================================================
             POSICIÓN LIBRE
          ================================================= */

          <p>
            Posición libre. Seleccioná un
            producto y luego esta posición
            para ubicarlo.
          </p>

        )}

      </Modal>

    </Wrapper>
  );
}


/* =========================================================
   STYLES FINALES
========================================================= */

const Unassigned = styled.div`
  display: grid;

  grid-template-columns:
    repeat(
      auto-fill,
      minmax(210px, 1fr)
    );

  gap: 8px;

  margin-top: 12px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 7px;
  }
`;

const ProductCard = styled.div`
  border:
    1px solid #d8e3d5;

  background: #fff;

  border-radius: 9px;

  padding: 9px;

  cursor: grab;

  font-size: 12px;

  &:hover {
    border-color: #7ca07e;
  }

  @media (max-width: 700px) {
    width: 100%;
    padding: 10px;
    font-size: 12px;
  }
`;

const StatsGrid = styled.div`
  display: grid;

  grid-template-columns:
    repeat(4, minmax(0, 1fr));

  gap: 10px;

  margin-top: 14px;

  @media (max-width: 900px) {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }
`;

const StatCard = styled.div`
  border:
    1px solid #dbe5dc;

  border-radius: 9px;

  padding: 10px 12px;

  background: #fafcfb;

  min-width: 0;

  @media (max-width: 520px) {
    padding: 8px;
  }
`;

const StatValue = styled.div`
  font-size: 20px;

  font-weight: 900;

  color: #23452b;

  line-height: 1.1;

  @media (max-width: 520px) {
    font-size: 17px;
  }
`;

const StatLabel = styled.div`
  font-size: 11px;

  color: #66736a;

  margin-top: 4px;

  @media (max-width: 520px) {
    font-size: 9px;
    line-height: 1.2;
  }
`;