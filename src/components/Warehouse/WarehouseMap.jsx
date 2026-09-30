import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  Button,
  Card,
  Input,
  Modal,
  Drawer,
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
  EditOutlined,
  CheckOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  PlusOutlined,
  MinusOutlined,
  ReloadOutlined,
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

import PalletOperationModal from './PalletOperationModal';
import DailyCloseModal from './DailyCloseModal';
import { calcularEquivalente, extraerConversion } from '../../utils/conversionStock';


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

// Ajuste físico solicitado: la cuarta posición de estos racks no existe.
// Se mantiene como editable para poder restaurarla si el galpón cambia.
const DEFAULT_BLOCKED_AGRO = [
  'R18-P04',
  'R19-P04',
  'R20-P04',
  'R21-P04',
  'R22-P04',
  'R23-P04',
  'R24-P04',
  'R25-P04',
];

const racksFront2 = Array.from(
  { length: 4 },
  (_, i) => makeRack(i + 26, 'frente', 'racks-26-29')
);

const racksSide2 = Array.from(
  { length: 4 },
  (_, i) => makeRack(i + 30, 'costado', 'racks-30-33')
);


/* =========================================================
   GALPONES 3 Y 4 · ESTRUCTURA FUTURA
   30 racks por galpón · 4 x 4 posiciones por rack
========================================================= */

const makeGalponRack = (galpon, n, access) =>
  Array.from({ length: 16 }, (_, i) => ({
    id: `G${galpon}-R${String(n).padStart(2, '0')}-P${String(i + 1).padStart(2, '0')}`,
    rack: n,
    position: i + 1,
    galpon,
    access,
  }));

const galpon4Racks = Array.from(
  { length: 30 },
  (_, i) => makeGalponRack(4, i + 1, i < 20 ? 'izquierdo' : 'derecho')
);

const galpon3Racks = Array.from(
  { length: 30 },
  (_, i) => makeGalponRack(3, i + 1, i < 10 ? 'izquierdo' : 'derecho')
);

const GALPONES_34_HABILITADOS = true;


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
   CAPACIDADES FÍSICAS
   - Pallet de líquidos: máximo 720 litros.
   - Racks penetrantes (R18-R25): máximo 960 kg por posición.
   No modifica la distribución ni las posiciones del mapa.
========================================================= */
const MAX_LITERS_PER_PALLET = 720;
const MAX_KG_PENETRANTE = 960;

const normalizeUnit = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getQuantity = value => {
  const raw =
    value?.cantidad ??
    value?.pallet?.cantidad ??
    value?.quantity ??
    value?.pallet?.quantity ??
    0;

  // Acepta tanto 720 como textos del tipo "720 L", "960 kg"
  // y formatos argentinos como "720,5".
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }

  const normalized = String(raw)
    .trim()
    .replace(/\\s+/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const quantity = Number(normalized);
  return Number.isFinite(quantity) ? quantity : 0;
};

const getUnit = value =>
  normalizeUnit(
    value?.unidad ??
    value?.pallet?.unidad ??
    value?.unidadMedida ??
    value?.unidadStock ??
    value?.unit ??
    value?.pallet?.unit ??
    value?.measureType ??
    value?.pallet?.measureType ??
    ''
  );

const isLiquidUnit = unit =>
  /(^|\b)(l|lt|lts|litro|litros)(\b|$)/i.test(unit);

const isKgUnit = unit =>
  /(^|\b)(kg|kgs|kilo|kilos|kilogramo|kilogramos)(\b|$)/i.test(unit);

const inferUnitFromName = value => {
  const name = itemName(value);
  if (/\b(l|lt|lts|litro|litros)\b/i.test(name)) return 'litros';
  if (/\b(kg|kgs|kilo|kilos|kilogramo|kilogramos)\b/i.test(name)) return 'kg';
  return '';
};

const palletUnit = value => {
  const explicit = getUnit(value);
  return explicit || inferUnitFromName(value);
};

const isPenetranteSlot = slotId =>
  /^R(?:18|19|20|21|22|23|24|25)-P\d+$/i.test(String(slotId || ''));


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

const FullscreenShell = styled.div`
  position: ${p => p.fullscreen ? 'fixed' : 'relative'};
  inset: ${p => p.fullscreen ? '0' : 'auto'};
  z-index: ${p => p.fullscreen ? 2000 : 'auto'};
  width: 100%;
  height: ${p => p.fullscreen ? '100vh' : 'auto'};
  overflow: ${p => p.fullscreen ? 'auto' : 'visible'};
  background: ${p => p.fullscreen ? '#eef2ee' : 'transparent'};
  box-sizing: border-box;
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


const MapViewport = styled.div`
  width: 100%;
  overflow: auto;
  border-radius: 14px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 700px) {
    border-radius: 10px;
  }
`;

const MapScale = styled.div`
  width: 100%;
  transform-origin: top left;
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
   GALPONES 3 Y 4 · PLANO FUTURO
   Se mantiene separado de los mapas existentes y arranca
   deshabilitado hasta que se habilite desde el selector.
========================================================= */

const Galpones34Map = styled.div`
  position: relative;
  z-index: 5;
  min-height: 1050px;
  padding: 58px 22px 28px;
  box-sizing: border-box;
  background: #172019;

  @media (max-width: 700px) {
    min-height: auto;
    padding: 54px 7px 20px;
  }
`;

const Galpones34Title = styled.div`
  text-align: center;
  color: #f1f6f2;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 1.2px;
  margin-bottom: 4px;

  @media (max-width: 700px) {
    font-size: 13px;
  }
`;

const Galpones34Subtitle = styled.div`
  text-align: center;
  color: #8e9b91;
  font-size: 9px;
  font-weight: 700;
  margin-bottom: 16px;

  @media (max-width: 700px) {
    font-size: 7px;
    line-height: 1.3;
  }
`;

const Galpones34Floor = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px minmax(0, 1fr);
  grid-template-rows: minmax(350px, 1fr) 10px minmax(350px, 1fr);
  gap: 0;
  min-height: 800px;
  border: 3px solid #343d37;
  border-radius: 12px;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    #121a15;
  background-size: 28px 28px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 70px auto;
    min-height: auto;
  }
`;

const Galpon34Half = styled.div`
  position: relative;
  min-width: 0;
  grid-column: ${p => p.right ? 3 : 1};
  grid-row: ${p => p.bottom ? 3 : 1};
  padding: 32px 10px 24px;
  box-sizing: border-box;
  background: ${p => p.top ? 'rgba(39,213,198,0.018)' : 'rgba(242,154,40,0.018)'};

  @media (max-width: 760px) {
    grid-column: 1;
    grid-row: ${p => p.bottom ? 3 : 1};
    padding: 30px 7px 22px;
  }
`;

const Galpon34HalfTitle = styled.div`
  position: absolute;
  top: 8px;
  left: 12px;
  color: ${p => p.top ? '#3ce1d2' : '#ffb44f'};
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .6px;

  @media (max-width: 700px) {
    font-size: 9px;
    left: 8px;
  }
`;

const Galpon34RackZone = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(50px, 1fr);
  gap: 7px;
  height: 100%;

  @media (max-width: 700px) {
    gap: 5px;
    grid-auto-rows: 54px;
  }
`;

const Galpon34RackZoneSingle = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: minmax(50px, 1fr);
  gap: 7px;
  height: 100%;

  @media (max-width: 700px) {
    grid-auto-rows: 54px;
    gap: 5px;
  }
`;

const Galpon34Rack = styled.div`
  min-width: 0;
  min-height: 0;
  border: 2px solid ${p => p.orange ? '#b87522' : '#27d5c6'};
  border-radius: 5px;
  padding: 4px;
  box-sizing: border-box;
  background: linear-gradient(180deg, rgba(39,213,198,.06), rgba(0,0,0,.22));
  position: relative;
`;

const Galpon34RackLabel = styled.div`
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  color: #dfece6;
  font-size: 7px;
  font-weight: 900;
  white-space: nowrap;

  @media (max-width: 700px) {
    top: -12px;
    font-size: 5px;
  }
`;

const Galpon34Slots = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 2px;
  width: 100%;
  height: 100%;
`;

const Galpon34Slot = styled.div`
  border: 1px solid rgba(178,255,246,.22);
  border-radius: 1px;
  background: rgba(255,255,255,.025);
`;

const Galpon34Wall = styled.div`
  grid-column: 1 / -1;
  grid-row: 2;
  background: #d8ddd9;
  z-index: 4;

  @media (max-width: 760px) {
    display: none;
  }
`;

const Galpon34Passage = styled.div`
  grid-column: 2;
  grid-row: 1 / 4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
  border-left: 3px dashed #d8b45b;
  border-right: 3px dashed #d8b45b;
  background: repeating-linear-gradient(
    90deg,
    rgba(216,180,91,.035),
    rgba(216,180,91,.035) 8px,
    transparent 8px,
    transparent 16px
  );
  color: #e7c96d;
  text-align: center;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .7px;

  @media (max-width: 760px) {
    grid-column: 1;
    grid-row: 2;
    min-height: 70px;
    border-left: 0;
    border-right: 0;
    border-top: 3px dashed #d8b45b;
    border-bottom: 3px dashed #d8b45b;
    font-size: 10px;
  }
`;

const Galpon34Door = styled.div`
  position: absolute;
  z-index: 12;
  border: 2px solid #ff3f3f;
  border-radius: 4px;
  padding: 4px 6px;
  color: #ff9696;
  background: rgba(255,63,63,.13);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .3px;
  white-space: nowrap;

  @media (max-width: 700px) {
    font-size: 6px;
    padding: 3px 4px;
  }
`;

const Galpon34DisabledNotice = styled.div`
  margin-top: 12px;
  text-align: center;
  color: #8d978f;
  font-size: 9px;
  font-weight: 800;
`;

const MapEditButton = styled(Button)`
  position: absolute;
  top: 12px;
  right: 14px;
  z-index: 60;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(0,0,0,0.28);

  @media (max-width: 700px) {
    top: 10px;
    right: 10px;
    height: 32px;
    padding: 0 10px;
    font-size: 12px;
  }
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
    ${p => p.selected ? '#ffd54a' : p.occupancy >= 100 ? '#e66b5d' : p.occupancy >= 75 ? '#f0ad4e' : (p.side ? '#00c9bd' : '#27d5c6')};

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

  box-shadow: ${p => p.selected ? '0 0 0 3px rgba(255,213,74,.28), 0 8px 20px rgba(0,0,0,.24)' : 'none'};

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
  touch-action: none;

  &:hover {
    transform: scale(1.04);
  }

  ${p =>
    p.dropTarget
      ? `
        outline: 3px solid #ffd54a;
        box-shadow: 0 0 0 4px rgba(255,213,74,.18), inset 0 0 18px rgba(255,213,74,.16);
        transform: scale(1.05);
        z-index: 6;
      `
      : p.highlight
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

const RackStatus = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 4;
  padding: 2px 5px;
  border-radius: 999px;
  background: ${p => p.status === 'free' ? 'rgba(90,190,102,.16)' : p.status === 'partial' ? 'rgba(240,173,78,.18)' : p.status === 'full' ? 'rgba(230,107,93,.18)' : 'rgba(120,120,120,.2)'};
  color: ${p => p.status === 'free' ? '#77d783' : p.status === 'partial' ? '#ffd17a' : p.status === 'full' ? '#ff9587' : '#bfc7c1'};
  border: 1px solid ${p => p.status === 'free' ? 'rgba(119,215,131,.35)' : p.status === 'partial' ? 'rgba(255,209,122,.35)' : p.status === 'full' ? 'rgba(255,149,135,.35)' : 'rgba(191,199,193,.3)'};
  font-size: 6px;
  font-weight: 900;
  letter-spacing: .3px;
`;

const RackOccupancy = styled.div`
  position: absolute;
  right: 5px;
  top: 4px;
  color: #a8b8ae;
  font-size: 7px;
  font-weight: 900;
  background: rgba(0,0,0,.35);
  border-radius: 4px;
  padding: 2px 4px;
  z-index: 4;
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

  const [
    operationPallet,
    setOperationPallet,
  ] = useState(null);

  const [
    dailyCloseVisible,
    setDailyCloseVisible,
  ] = useState(false);

  // Modo edición: permite adaptar el mapa físico sin tocar el código.
  const [
    editMode,
    setEditMode,
  ] = useState(false);

  const [selectedRack, setSelectedRack] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);


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

  const savedAgro = saved?.agroquimicos || {
    occupied: saved?.occupied || {},
  };

  const savedMaps = {
    agroquimicos: {
      ...savedAgro,
      blocked: Array.isArray(savedAgro.blocked)
        ? savedAgro.blocked
        : DEFAULT_BLOCKED_AGRO,
    },

    semillas: {
      ...(saved?.semillas || { occupied: {} }),
      blocked: Array.isArray(saved?.semillas?.blocked)
        ? saved.semillas.blocked
        : [],
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

      if (pending?.product?._id || pending?.product?.id) {
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


  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen]);


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


  /*
   * Vincula los pallets guardados en el mapa con el pallet real
   * de MongoDB. Esto permite que el botón "Cambiar stock" funcione
   * incluso con posiciones creadas antes de esta versión.
   */
  const resolverPalletOperacion = (pallet) => {
    if (!pallet) return null;

    if (pallet.palletId && pallet.id && pallet.categoria) {
      return pallet;
    }

    const numeroPallet =
      pallet.numeroPallet ||
      pallet?.pallet?.numeroPallet ||
      '';

    const lote =
      pallet.lote ||
      '';

    const candidato = products.find((product) => {
      const lotes = Array.isArray(product.lotes)
        ? product.lotes
        : [];

      return lotes.some((l) =>
        (l.pallets || []).some((p) =>
          numeroPallet
            ? String(p.numeroPallet || '').trim() === String(numeroPallet).trim()
            : false
        )
      );
    });

    if (!candidato) return pallet;

    let palletReal = null;

    for (const loteReal of candidato.lotes || []) {
      palletReal = (loteReal.pallets || []).find((p) => {
        const coincideNumero =
          numeroPallet &&
          String(p.numeroPallet || '').trim() === String(numeroPallet).trim();

        const coincideLote =
          lote &&
          String(loteReal.numero || '').trim() === String(lote).trim();

        return coincideNumero && (!lote || coincideLote);
      });

      if (palletReal) {
        return {
          ...pallet,
          id: String(candidato._id || candidato.id || ''),
          categoria: candidato.categoria,
          palletId: String(palletReal._id || ''),
          cantidad: Number(palletReal.cantidad || pallet.cantidad || 0),
          unidad: candidato.unidad || pallet.unidad || '',
          lote: loteReal.numero || lote,
          ubicacion: palletReal.ubicacion || pallet.ubicacion || pallet.slot || '',
          numeroPallet: palletReal.numeroPallet || numeroPallet,
          nombre: candidato.nombre,
          descripcion: candidato.descripcion || '',
          presentacion: candidato.presentacion || '',
        };
      }
    }

    return pallet;
  };

  const abrirOperacionPallet = (pallet) => {
    const preparado = resolverPalletOperacion(pallet);

    if (!preparado?.palletId) {
      message.warning(
        'No encontré el pallet real en el producto. Podés seguir viendo el detalle, pero primero hay que vincular ese pallet.'
      );
      return;
    }

    setOperationPallet(preparado);
  };

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

  const blocked =
    Array.isArray(state.blocked)
      ? state.blocked
      : [];

  const isBlocked =
    slotId => blocked.includes(slotId);

  const toggleBlocked =
    slotId => {
      if (stackOf(occupied[slotId]).length) {
        message.warning(
          `No podés bloquear ${slotId} mientras tenga un pallet. Primero retiralo o movelo.`
        );
        return;
      }

      const nextBlocked =
        isBlocked(slotId)
          ? blocked.filter(id => id !== slotId)
          : [...blocked, slotId];

      setMap({
        ...state,
        blocked: nextBlocked,
      });
    };


  /* =========================================================
     ESTADÍSTICAS
  ========================================================= */

  const allSlots =
    warehouse === 'semillas'
      ? semillasSlots.filter(slot => !isBlocked(slot.id)).length
      : allRacks.reduce((total, rack) =>
          total + rack.filter(slot => !isBlocked(slot.id)).length, 0
        ) + controlMax.filter(slot => !isBlocked(slot.id)).length;

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

  const occupancyPercent = allSlots > 0
    ? Math.round((occupiedPositions / allSlots) * 100)
    : 0;

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

      unidad:
        product?.unidad || '',

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

        equivalente: calcularEquivalente(info.cantidad, info),
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
     VALIDAR CAPACIDAD FÍSICA
  ========================================================= */

  const validarCapacidadPallet = (slotId, product) => {
    const quantity = getQuantity(product);
    const unit = palletUnit(product);

    // El límite de 720 aplica únicamente cuando la mercadería está
    // expresada en litros. No se mezclan litros con kilos.
    if (isLiquidUnit(unit) && quantity > MAX_LITERS_PER_PALLET) {
      message.error(
        `LÍMITE SUPERADO: este pallet tiene ${quantity} L y el máximo es ${MAX_LITERS_PER_PALLET} L.`
      );
      return false;
    }

    // Los racks penetrantes R18-R25 se controlan en kilos.
    if (isPenetranteSlot(slotId)) {
      if (!isKgUnit(unit)) {
        if (quantity > 0 && isLiquidUnit(unit)) {
          return true;
        }
        message.warning(
          `No se puede aplicar el límite de ${MAX_KG_PENETRANTE} kg porque la unidad del pallet no está indicada como kg. Unidad detectada: "${unit || 'sin unidad'}".`
        );
        return false;
      }

      if (quantity > MAX_KG_PENETRANTE) {
        message.error(
          `LÍMITE SUPERADO: este pallet tiene ${quantity} kg y el máximo del rack penetrante es ${MAX_KG_PENETRANTE} kg.`
        );
        return false;
      }
    }

    return true;
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

      if (!validarCapacidadPallet(slotId, product)) return;

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

      if (!validarCapacidadPallet(to, pallet)) return;

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
        search.trim().toLowerCase();

      return [
        product?.nombre,
        product?.lote,
        product?.ubicacion,
        product?.numeroPallet,
        product?.codigoBarras,
        product?.codigo,
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
    ) => {
      const visibleSlots =
        editMode
          ? rack
          : rack.filter(slot => !isBlocked(slot.id));
      const occupiedCount = visibleSlots.filter(slot => stackOf(occupied[slot.id]).length > 0).length;
      const occupancy = visibleSlots.length ? Math.round((occupiedCount / visibleSlots.length) * 100) : 0;
      const rackId = `R${String(rack[0].rack).padStart(2, '0')}`;
      const isSelected = selectedRack === rackId;
      const status = visibleSlots.length === 0
        ? 'blocked'
        : occupancy >= 100
          ? 'full'
          : occupancy > 0
            ? 'partial'
            : 'free';

      return (
        <Tooltip
          key={rack[0].rack}
          title={
            `Rack ${String(
              rack[0].rack
            ).padStart(2, '0')} · ${visibleSlots.length} posiciones activas · acceso ${
              side ? 'lateral' : 'frontal'
            }`
          }
        >
          <RackMini
            side={side}
            occupancy={occupancy}
            status={status}
            selected={isSelected}
            onClick={() =>
              !editMode &&
              (setSelectedRack(rackId), setDetail({
                id: `R${String(rack[0].rack).padStart(2, '0')}`,
                rack: rack[0].rack,
                product: rack.flatMap(slot =>
                  stackOf(occupied[slot.id]).map(pallet => ({
                    ...pallet,
                    slot: slot.id,
                  }))
                ),
              }) )
            }
          >
            <RackName>
              R{String(rack[0].rack).padStart(2, '0')}
            </RackName>
            <RackStatus status={status}>
              {status === 'free' ? 'LIBRE' : status === 'partial' ? 'PARCIAL' : status === 'full' ? 'COMPLETO' : 'BLOQUEADO'}
            </RackStatus>
            <RackOccupancy>
              {occupancy}% · {occupiedCount}/{visibleSlots.length}
            </RackOccupancy>

            <MiniSlots>
              {visibleSlots.map(slot => {
                const stack = stackOf(occupied[slot.id]);
                const blockedSlot = isBlocked(slot.id);

                if (blockedSlot) {
                  return (
                    <MiniSlot
                      key={slot.id}
                      occupied={false}
                      onClick={e => {
                        e.stopPropagation();
                        toggleBlocked(slot.id);
                      }}
                      title={`${slot.id} · BLOQUEADA / sin posición física`}
                      style={{
                        borderColor: '#e05a5a',
                        background: 'repeating-linear-gradient(135deg, rgba(224,90,90,.18), rgba(224,90,90,.18) 5px, rgba(255,255,255,.025) 5px, rgba(255,255,255,.025) 10px)',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{
                        fontSize: 6,
                        color: '#ff9b9b',
                        fontWeight: 900,
                        textAlign: 'center',
                      }}>
                        BLOQ.
                      </span>
                    </MiniSlot>
                  );
                }

                return (
                  <Tooltip
                    key={slot.id}
                    title={`${slot.id}${stack[0] ? ` · ${stack[0].nombre}` : ' · Libre'}${editMode ? ' · clic para bloquear' : ''}`}
                  >
                    <MiniSlot
                      occupied={!!stack.length}
                      highlight={isMatch(stack[0])}
                      dropTarget={dragOverSlot === slot.id}
                      draggable={!!stack.length}
                      onPointerDown={e => {
                        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                          if (stack.length) {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragged(slot.id);
                            setSelectedProduct(null);
                            setDragOverSlot(slot.id);
                          }
                        }
                      }}
                      onPointerEnter={e => {
                        if ((e.pointerType === 'touch' || e.pointerType === 'pen') && dragged && dragged !== slot.id) {
                          setDragOverSlot(slot.id);
                        }
                      }}
                      onPointerUp={e => {
                        if ((e.pointerType === 'touch' || e.pointerType === 'pen') && dragged && dragged !== slot.id) {
                          e.preventDefault();
                          e.stopPropagation();
                          addOrMove(slot.id, 1);
                          setDragOverSlot(null);
                        }
                      }}
                      onDragStart={e => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = 'move';
                        setDragged(slot.id);
                        setSelectedProduct(null);
                      }}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverSlot(slot.id);
                      }}
                      onDragLeave={() => setDragOverSlot(null)}
                      onDrop={e => {
                        e.stopPropagation();
                        addOrMove(slot.id, 1);
                        setDragOverSlot(null);
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        if (editMode) {
                          toggleBlocked(slot.id);
                          return;
                        }
                        addOrMove(slot.id, 1);
                      }}
                    >
                      {stack[0] && (
                        <SlotInfo>
                          {(() => {
                            const label = slotLabel(stack[0]);
                            return (
                              <>
                                <SlotPallet>{label.pallet}</SlotPallet>
                                <SlotLot>{label.lote}</SlotLot>
                                {label.qty && <SlotQty>{label.qty}</SlotQty>}
                              </>
                            );
                          })()}
                        </SlotInfo>
                      )}
                    </MiniSlot>
                  </Tooltip>
                );
              })}
            </MiniSlots>

            <RackAccess>
              {side ? 'ACCESO LATERAL' : 'ACCESO FRONTAL'}
            </RackAccess>
          </RackMini>
        </Tooltip>
      );
    };

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

                      const blockedSlot =
                        isBlocked(slot.id);

                      return (
                        <Tooltip
                          key={
                            slot.id
                          }

                          title={`${slot.id}${
                            blockedSlot
                              ? ' · BLOQUEADA'
                              : product
                                ? ` · ${product.nombre}`
                                : ' · Libre'
                          } · ${stack.length}/2`}
                        >
                          <ControlSlot
                            occupied={
                              !!product
                            }
                            style={blockedSlot ? {
                              borderColor: '#e05a5a',
                              background: 'repeating-linear-gradient(135deg, rgba(224,90,90,.18), rgba(224,90,90,.18) 5px, rgba(255,255,255,.025) 5px, rgba(255,255,255,.025) 10px)',
                            } : undefined}

                            highlight={isMatch(
                              product
                            )}

                            draggable={
                              !!product
                            }

                            onDragStart={e => {
                              if (blockedSlot) return;
                              e.dataTransfer.effectAllowed = 'move';
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

                            onDrop={() => {
                              addOrMove(slot.id, 2);
                            }}

                            onClick={() => {
                              if (editMode) {
                                toggleBlocked(slot.id);
                                return;
                              }
                              addOrMove(slot.id, 2);
                            }}
                          >

                            <StackBadge>
                              {
                                stack.length
                              }
                              /2
                            </StackBadge>

                            {blockedSlot ? (
                              <span style={{ color: '#ff9b9b', fontSize: 7, fontWeight: 900 }}>BLOQ.</span>
                            ) : product && (
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
     GALPONES 3 Y 4 · PREVISUALIZACIÓN
  ========================================================= */

  const renderGalpon34Rack = (rack, orange = false) => (
    <Galpon34Rack
      key={rack[0].id}
      orange={orange}
      title={`G${rack[0].galpon}-R${String(rack[0].rack).padStart(2, '0')} · 4 alto × 4 posiciones`}
    >
      <Galpon34RackLabel>
        G{rack[0].galpon}-R{String(rack[0].rack).padStart(2, '0')}
      </Galpon34RackLabel>

      <Galpon34Slots>
        {rack.map(slot => (
          <Galpon34Slot key={slot.id} title={slot.id} />
        ))}
      </Galpon34Slots>
    </Galpon34Rack>
  );

  const renderGalpones34 = () => {
    const galpon4Left = galpon4Racks.slice(0, 20);
    const galpon4Right = galpon4Racks.slice(20, 30);
    const galpon3Left = galpon3Racks.slice(0, 10);
    const galpon3Right = galpon3Racks.slice(10, 30);

    return (
      <Building>
        <TopWall />
        <BottomWall />

        <Galpones34Map>
          <Galpon34Door style={{ top: 8, left: '4%' }}>
            PORTÓN CORREDIZO · G4
          </Galpon34Door>

          <Galpon34Door style={{ top: 8, right: '4%' }}>
            🚪 EMERGENCIA
          </Galpon34Door>

          <Galpon34Door style={{ bottom: 8, left: '4%' }}>
            🚪 EMERGENCIA
          </Galpon34Door>

          <Galpon34Door style={{ bottom: 8, right: '4%' }}>
            PORTÓN CORREDIZO · G3
          </Galpon34Door>

          <Galpon34Door style={{ top: '49%', left: 8 }}>
            🚪 EMERGENCIA
          </Galpon34Door>

          <Galpon34Door style={{ top: '49%', right: 8 }}>
            🚪 EMERGENCIA
          </Galpon34Door>

          <Galpones34Title>
            🏭 GALPONES 3 Y 4 · MAPA FÍSICO
          </Galpones34Title>

          <Galpones34Subtitle>
            UNA MISMA ESTRUCTURA · PARED DIVISORIA · PASILLO CENTRAL · RACKS PENETRANTES
          </Galpones34Subtitle>

          <Galpones34Floor>
            <Galpon34Half top>
              <Galpon34HalfTitle>
                GALPÓN 4 · 20 RACKS LADO IZQUIERDO
              </Galpon34HalfTitle>

              <Galpon34RackZone>
                {galpon4Left.map(rack =>
                  renderGalpon34Rack(rack)
                )}
              </Galpon34RackZone>
            </Galpon34Half>

            <Galpon34Half top right>
              <Galpon34HalfTitle>
                GALPÓN 4 · 10 RACKS LADO DERECHO
              </Galpon34HalfTitle>

              <Galpon34RackZoneSingle>
                {galpon4Right.map(rack =>
                  renderGalpon34Rack(rack, true)
                )}
              </Galpon34RackZoneSingle>
            </Galpon34Half>

            <Galpon34Wall />

            <Galpon34Passage>
              ↕ PASILLO DE CONEXIÓN
            </Galpon34Passage>

            <Galpon34Half bottom>
              <Galpon34HalfTitle>
                GALPÓN 3 · 10 RACKS LADO IZQUIERDO
              </Galpon34HalfTitle>

              <Galpon34RackZoneSingle>
                {galpon3Left.map(rack =>
                  renderGalpon34Rack(rack)
                )}
              </Galpon34RackZoneSingle>
            </Galpon34Half>

            <Galpon34Half bottom right>
              <Galpon34HalfTitle>
                GALPÓN 3 · 20 RACKS LADO DERECHO
              </Galpon34HalfTitle>

              <Galpon34RackZone>
                {galpon3Right.map(rack =>
                  renderGalpon34Rack(rack, true)
                )}
              </Galpon34RackZone>
            </Galpon34Half>
          </Galpones34Floor>

          <Galpon34DisabledNotice>
            ℹ️ Plano físico habilitado para visualizar. La administración de stock de Galpones 3 y 4 queda preparada para una etapa posterior.
          </Galpon34DisabledNotice>
        </Galpones34Map>
      </Building>
    );
  };


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

      const blockedSlot =
        isBlocked(slot.id);

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
            style={blockedSlot ? {
              borderColor: '#e05a5a',
              background: 'repeating-linear-gradient(135deg, rgba(224,90,90,.18), rgba(224,90,90,.18) 5px, rgba(255,255,255,.025) 5px, rgba(255,255,255,.025) 10px)',
            } : undefined}

            highlight={isMatch(
              product
            )}

            draggable={
              stack.length > 0
            }

            onDragStart={e => {
              if (blockedSlot) return;
              e.stopPropagation();
              e.dataTransfer.effectAllowed = 'move';

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
              addOrMove(slot.id, 3);
            }}

            onClick={e => {
              e.stopPropagation();
              if (editMode) {
                toggleBlocked(slot.id);
                return;
              }
              addOrMove(slot.id, 3);
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

            {blockedSlot ? (
              <SeedsSlotContent>
                <span style={{ color: '#ff9b9b', fontWeight: 900 }}>BLOQ.</span>
              </SeedsSlotContent>
            ) : product ? (
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

                {(editMode ? fila : fila.filter(slot => !isBlocked(slot.id))).map(
                  renderSemillasSlot
                )}

              </SeedsRow>
            )
          );

      return (
        <Building>

          <MapEditButton
            type={editMode ? 'default' : 'primary'}
            icon={editMode ? <CheckOutlined /> : <EditOutlined />}
            onClick={() => {
              setEditMode(value => !value);
              setDragged(null);
              setSelectedProduct(null);
              setDetail(null);
            }}
          >
            {editMode ? 'Terminar edición' : '✏️ Editar mapa'}
          </MapEditButton>

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
    <FullscreenShell fullscreen={fullscreen}>
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

            <Button
              disabled={!GALPONES_34_HABILITADOS}
              type={
                warehouse ===
                'galpones34'
                  ? 'primary'
                  : 'default'
              }
              onClick={() =>
                cambiarGalpon(
                  'galpones34'
                )
              }
            >
              🏭 Galpones 3 y 4
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
            type={editMode ? 'default' : 'primary'}
            icon={editMode ? <CheckOutlined /> : <EditOutlined />}
            onClick={() => {
              setEditMode(value => !value);
              setDragged(null);
              setSelectedProduct(null);
              setDetail(null);
            }}
          >
            {editMode ? 'Terminar edición' : 'Editar mapa'}
          </Button>

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

          <Button
            type="default"
            onClick={() => setDailyCloseVisible(true)}
          >
            🌙 Cierre del día
          </Button>

          <Button
            type="default"
            icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setFullscreen(value => !value)}
          >
            {fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
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

        {(selectedProduct || selectedRack || detail || dragged) && (
          <QuickActionBar role="toolbar" aria-label="Acciones rápidas del mapa">
            <QuickActionLabel>
              {dragged ? 'Movimiento activo' : selectedRack ? `${selectedRack} seleccionado` : 'Producto seleccionado'}
            </QuickActionLabel>

            {detail?.product?.length ? (
              <Button
                type="primary"
                size="large"
                onClick={() => abrirOperacionPallet(detail.product[0])}
              >
                ⚡ Cambiar stock
              </Button>
            ) : null}

            {dragged ? (
              <Button
                size="large"
                onClick={() => {
                  setDragged(null);
                  setDragOverSlot(null);
                }}
              >
                ↩ Cancelar movimiento
              </Button>
            ) : null}

            <Button
              size="large"
              onClick={() => {
                setSelectedProduct(null);
                setSelectedRack(null);
                setDetail(null);
                setDragged(null);
                setDragOverSlot(null);
              }}
            >
              ✕ Limpiar
            </Button>

            <Button
              size="large"
              onClick={() => setFullscreen(value => !value)}
            >
              {fullscreen ? '⛶ Salir' : '⛶ Pantalla completa'}
            </Button>
          </QuickActionBar>
        )}

        {editMode && (
          <div style={{
            marginTop: 10,
            padding: '9px 12px',
            border: '1px dashed #d46a6a',
            borderRadius: 8,
            background: '#fff7f7',
            color: '#8f3434',
            fontSize: 12,
            fontWeight: 700,
          }}>
            ✏️ <b>Modo edición:</b> hacé clic sobre una posición para quitarla del mapa físico.
            Las posiciones bloqueadas aparecen en rojo y podés volver a hacer clic para recuperarlas.
            Si una posición tiene un pallet, primero hay que retirarlo o moverlo. Después tocá <b>Guardar mapa</b>.
          </div>
        )}

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

        <MapTools>
          <MapToolsLabel>MAPA</MapToolsLabel>
          <MapZoomButton
            aria-label="Alejar mapa"
            onClick={() => setMapZoom(value => Math.max(0.7, Number((value - 0.1).toFixed(1))))}
            disabled={mapZoom <= 0.7}
          >
            <MinusOutlined />
          </MapZoomButton>
          <MapZoomValue>{Math.round(mapZoom * 100)}%</MapZoomValue>
          <MapZoomButton
            aria-label="Acercar mapa"
            onClick={() => setMapZoom(value => Math.min(1.5, Number((value + 0.1).toFixed(1))))}
            disabled={mapZoom >= 1.5}
          >
            <PlusOutlined />
          </MapZoomButton>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => setMapZoom(1)}
            disabled={mapZoom === 1}
          >
            Restablecer
          </Button>
        </MapTools>

        <OccupancyBar>
          <OccupancyHeader>
            <span>OCUPACIÓN DEL GALPÓN</span>
            <strong>{occupancyPercent}%</strong>
          </OccupancyHeader>
          <OccupancyTrack>
            <OccupancyFill style={{ width: `${occupancyPercent}%` }} />
          </OccupancyTrack>
          <OccupancyMeta>
            <span>🟢 {occupiedPositions} ocupadas</span>
            <span>⚪ {freePositions} libres</span>
            <span>📦 {occupiedPallets} pallets</span>
          </OccupancyMeta>
        </OccupancyBar>

      </Header>


      <MapViewport>
        <MapScale style={{ zoom: mapZoom }}>

      {/* =====================================================
          MAPA AGROQUÍMICOS
      ===================================================== */}

      {warehouse ===
        'agroquimicos' && (

        <Building>

          <MapEditButton
            type={editMode ? 'default' : 'primary'}
            icon={editMode ? <CheckOutlined /> : <EditOutlined />}
            onClick={() => {
              setEditMode(value => !value);
              setDragged(null);
              setSelectedProduct(null);
              setDetail(null);
            }}
          >
            {editMode ? 'Terminar edición' : '✏️ Editar mapa'}
          </MapEditButton>

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
          GALPONES 3 Y 4 · MAPA FÍSICO
      ===================================================== */}
      {warehouse === 'galpones34' && renderGalpones34()}

        </MapScale>
      </MapViewport>


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
          <b>Arrastrá y soltá:</b> llevá un producto a una posición libre o mové un pallet existente a otra posición.
          Las posiciones compatibles se iluminan mientras arrastrás. En tablet también podés mantener presionado y deslizar el dedo. También podés hacer clic para seleccionar.
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
                  draggable
                  onPointerDown={e => {
                    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (tieneUbicacion && occupied[ubicacion]) {
                        setDragged(ubicacion);
                        setSelectedProduct(null);
                      } else {
                        setDragged(`PRODUCT:${product._id || product.id}`);
                        setSelectedProduct(product);
                        setSelectedRack(null);
                      }
                    }
                  }}
                  title={
                    tieneUbicacion
                      ? `Arrastrá para mover desde ${ubicacion}`
                      : 'Arrastrá este producto a una posición libre'
                  }
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move';

                    if (tieneUbicacion) {
                      if (!occupied[ubicacion]) {
                        message.warning(
                          `No encontré ${ubicacion} dentro del mapa actual. Podés abrir el detalle del producto para revisar su ubicación.`
                        );
                        e.preventDefault();
                        return;
                      }

                      setDragged(ubicacion);
                      setSelectedProduct(null);
                      return;
                    }

                    setDragged(`PRODUCT:${product._id || product.id}`);
                    setSelectedProduct(product);
                    setSelectedRack(null);
                  }}
                  onDragEnd={() => { setDragged(null); setDragOverSlot(null); }}
                  onClick={() => { setSelectedProduct(product); setSelectedRack(null); }}
                >
                  <ProductDragHandle aria-hidden="true">⋮⋮</ProductDragHandle>

                  <ProductName>
                    <b>{itemName(product)}</b>
                    <small>
                      {product.codigoBarras || product.codigo || ''}
                    </small>
                  </ProductName>

                  <ProductCell>
                    {itemLot(product) || '—'}
                  </ProductCell>

                  <ProductCell>
                    {product.cantidad ?? '—'} {product.unidad || ''}
                  </ProductCell>

                  <ProductLocation>
                    <Tag color={tieneUbicacion ? 'green' : 'gold'}>
                      {tieneUbicacion ? ubicacion : 'Sin ubicación'}
                    </Tag>
                  </ProductLocation>
                </ProductCard>
              );
            }
          )}

        </Unassigned>

      </Card>


      {/* =====================================================
          MODAL
      ===================================================== */}

      <Drawer
        open={!!detail}
        placement="right"
        width={390}
        destroyOnClose={false}
        styles={{
          body: { padding: 18 },
          header: { padding: '14px 18px' },
        }}
        className="miru-map-detail-drawer"

        title={
          detail?.rack
            ? `RACK ${String(detail.rack).padStart(2, '0')} · Detalle operativo`
            : `POSICIÓN ${detail?.id || ''}`
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

                      <Button
                        type="primary"
                        size="small"
                        style={{ marginTop: 8 }}
                        onClick={() =>
                          abrirOperacionPallet(pallet)
                        }
                      >
                        ⚡ Cambiar stock
                      </Button>

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

                    <Button
                      type="primary"
                      size="small"
                      style={{ marginTop: 8 }}
                      onClick={() =>
                        abrirOperacionPallet(pallet)
                      }
                    >
                      ⚡ Cambiar stock
                    </Button>

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


      <PalletOperationModal
        visible={!!operationPallet}
        pallet={operationPallet}
        onClose={() => setOperationPallet(null)}
        onSuccess={(actualizado) => {
          setMap((prev) => {
            const base = prev || state;
            const next = { ...base.occupied };

            Object.entries(next).forEach(([slotId, value]) => {
              const stack = stackOf(value);
              const updatedStack = stack.map((p) =>
                String(p.palletId || '') ===
                String(actualizado.palletId)
                  ? {
                      ...p,
                      cantidad: actualizado.cantidad,
                      estado: actualizado.estado,
                    }
                  : p
              );

              next[slotId] = updatedStack;
            });

            return {
              ...base,
              occupied: next,
            };
          });
        }}
      />

      <DailyCloseModal
        visible={dailyCloseVisible}
        onClose={() => setDailyCloseVisible(false)}
      />

      </Drawer>

    </Wrapper>
    </FullscreenShell>
  );
}


/* =========================================================
   MAPA · CONTROLES VISUALES
========================================================= */

const MapTools = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 7px 9px;
  width: fit-content;
  border: 1px solid #dbe5dc;
  border-radius: 10px;
  background: #f7faf7;

  @media (max-width: 700px) {
    width: 100%;
    justify-content: center;
  }
`;

const MapToolsLabel = styled.span`
  color: #5d6d61;
  font-size: 10px;
  font-weight: 900;
  margin-right: 3px;
  letter-spacing: .4px;
`;

const MapZoomButton = styled(Button)`
  width: 34px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
`;

const MapZoomValue = styled.span`
  min-width: 48px;
  text-align: center;
  color: #23452b;
  font-size: 12px;
  font-weight: 900;
`;

const OccupancyBar = styled.div`
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #dbe5dc;
  border-radius: 10px;
  background: #fbfdfb;
`;

const OccupancyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #4f6255;
  font-size: 10px;
  font-weight: 900;

  strong {
    color: #23452b;
    font-size: 12px;
  }
`;

const OccupancyTrack = styled.div`
  height: 8px;
  margin-top: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7eee8;
`;

const OccupancyFill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #75c67c, #3d9d52);
  transition: width .25s ease;
`;

const OccupancyMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 7px;
  color: #718078;
  font-size: 9px;
  font-weight: 800;
`;

/* =========================================================
   STYLES FINALES
========================================================= */

const QuickActionBar = styled.div`
  position: sticky;
  bottom: 10px;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0 12px;
  padding: 9px 10px;
  border: 1px solid #cfded0;
  border-radius: 12px;
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 8px 24px rgba(35, 69, 43, .14);
  backdrop-filter: blur(8px);

  .ant-btn {
    min-height: 40px;
    border-radius: 9px;
    font-weight: 700;
  }

  @media (max-width: 700px) {
    position: fixed;
    left: 8px;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom));
    margin: 0;
    padding: 8px;
    overflow-x: auto;
    flex-wrap: nowrap;

    .ant-btn {
      flex: 0 0 auto;
      min-height: 46px;
      font-size: 13px;
    }
  }
`;

const QuickActionLabel = styled.div`
  color: #315239;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .25px;
  margin-right: 2px;
  white-space: nowrap;

  @media (max-width: 700px) {
    position: sticky;
    left: 0;
    padding: 0 4px;
    background: rgba(255, 255, 255, .96);
  }
`;

const Unassigned = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 12px;

  &::before {
    content: 'ARRASTRÁ ↕ · PRODUCTO · LOTE · STOCK · UBICACIÓN';
    display: grid;
    grid-template-columns: 28px minmax(180px, 2fr) minmax(90px, .8fr) minmax(100px, .9fr) minmax(150px, 1.1fr);
    gap: 10px;
    padding: 0 10px 2px;
    color: #77847a;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .35px;
  }

  @media (max-width: 900px) {
    &::before {
      grid-template-columns: 24px minmax(160px, 1.7fr) minmax(80px, .8fr) minmax(110px, 1fr);
    }
  }

  @media (max-width: 700px) {
    &::before {
      content: 'ARRASTRÁ · PRODUCTO · STOCK';
      grid-template-columns: 24px minmax(0, 1fr) auto;
      padding: 0 8px 2px;
    }
  }
`;

const ProductDragHandle = styled.div`
  color: #718078;
  font-size: 15px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -3px;
  user-select: none;
  cursor: grab;
`;

const ProductName = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #26352b;
    font-size: 12px;
    line-height: 1.2;
  }

  small {
    color: #8a968d;
    font-size: 9px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ProductCell = styled.div`
  min-width: 0;
  color: #59675e;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProductLocation = styled.div`
  min-width: 0;

  .ant-tag {
    margin: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
    line-height: 20px;
    height: 22px;
  }
`;

const ProductCard = styled.div`
  display: grid;
  grid-template-columns: 28px minmax(180px, 2fr) minmax(90px, .8fr) minmax(100px, .9fr) minmax(150px, 1.1fr);
  align-items: center;
  gap: 10px;

  border: 1px solid #d8e3d5;
  border-radius: 7px;
  background: #fff;
  padding: 7px 10px;
  min-height: 48px;
  box-sizing: border-box;
  cursor: grab;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  font-size: 12px;
  transition: border-color .15s ease, background .15s ease, transform .12s ease, box-shadow .12s ease;

  &:hover {
    border-color: #7ca07e;
    background: #fbfdfb;
    box-shadow: 0 2px 8px rgba(34, 66, 39, .08);
  }

  &:active {
    cursor: grabbing;
    transform: scale(.995);
  }

  @media (max-width: 900px) {
    grid-template-columns: 24px minmax(160px, 1.7fr) minmax(80px, .8fr) minmax(110px, 1fr);

    > div:nth-child(4) {
      display: none;
    }
  }

  @media (max-width: 700px) {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    width: 100%;
    padding: 7px 8px;
    min-height: 46px;
    font-size: 11px;

    > div:nth-child(3),
    > div:nth-child(4) {
      display: none;
    }
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