import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Menu,
  Badge,
  Button,
} from 'antd';

import {
  AlertOutlined,
  ExperimentOutlined,
  SettingOutlined,
  UserOutlined,
  ToolOutlined,
  DatabaseOutlined,
  PaperClipOutlined,
  BellOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  ScanOutlined,
  FileTextOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';

import styled from 'styled-components';

import { setDisplay } from './displaySlice';
import { setLogin } from '../../loginSlice';
import { useGetConsumablesQuery, useGetReagentsQuery } from '../../services/items';

const { SubMenu } = Menu;

const StyledMenu = styled(Menu)`
  width: 270px;
  min-width: 270px;
  height: 100vh;

  position: sticky;
  top: 0;

  overflow-y: auto;
  overflow-x: hidden;

  border-right: none !important;

  background: linear-gradient(
    180deg,
    #1f4728 0%,
    #285a32 55%,
    #1c4025 100%
  ) !important;

  box-shadow: 4px 0 18px rgba(0, 0, 0, 0.12);

  .ant-menu-item,
  .ant-menu-submenu-title {
    margin: 4px 10px !important;
    width: calc(100% - 20px) !important;
    border-radius: 8px !important;
    color: #eaf4e9 !important;
    font-weight: 500;
  }

  .ant-menu-item:hover,
  .ant-menu-submenu-title:hover {
    background: rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
  }

  .ant-menu-item-selected {
    background: #397348 !important;
    color: #ffffff !important;
    font-weight: 700;
  }

  .ant-menu-submenu-arrow {
    color: #dcebdd !important;
  }

  .ant-menu-item .anticon,
  .ant-menu-submenu-title .anticon {
    color: #cfe5ce !important;
  }

  .ant-menu-item-selected .anticon {
    color: #ffffff !important;
  }

  .ant-menu-sub {
    background: rgba(0, 0, 0, 0.12) !important;
    border-radius: 8px;
  }
`;

const Brand = styled.div`
  padding: 24px 15px 20px;
  text-align: center;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 10px;
  cursor: pointer;
`;

const BrandTitle = styled.div`
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 2px;
  line-height: 1.1;
  color: #ffffff;
  white-space: nowrap;
`;

const BrandSubtitle = styled.div`
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  line-height: 1.2;
  color: #cfe5ce;
  text-transform: uppercase;
  white-space: nowrap;
`;

const UserInfo = styled.div`
  margin: 15px 15px 8px 15px;
  padding: 12px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.08);
  color: #eaf4e9;
  font-size: 13px;
`;

const SignOutButton = styled(Button)`
  width: calc(100% - 30px);
  margin: 5px 15px 20px 15px;

  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  background: rgba(255, 255, 255, 0.06) !important;
  color: #ffffff !important;

  border-radius: 8px !important;

  &:hover {
    background: rgba(255, 80, 80, 0.18) !important;
    border-color: rgba(255, 120, 120, 0.4) !important;
    color: #ffffff !important;
  }
`;

const NavContainer = () => {
  const dispatch = useDispatch();

  const display = useSelector(
    (state) => state.display.display
  );

  const user = useSelector(
    (state) => state.user.user
  );

  const { data: consumables = [] } =
    useGetConsumablesQuery();

  const { data: reagents = [] } =
    useGetReagentsQuery();

  const today = new Date();

  const productosConAlerta = [
    ...consumables,
    ...reagents,
  ];

  const alertCount = productosConAlerta.filter(
    (item) => {
      const stock = Number(item.cantidad || 0);
      const minimo = Number(item.stockMinimo || 10);

      const stockBajo = stock <= minimo;

      let proximoVencimiento = false;

      if (item.vencimiento) {
        const vencimiento = new Date(
          `${item.vencimiento}T23:59:59`
        );

        const diferencia =
          vencimiento.getTime() -
          today.getTime();

        const dias =
          diferencia /
          (1000 * 60 * 60 * 24);

        proximoVencimiento =
          dias <= 30;
      }

      return stockBajo || proximoVencimiento;
    }
  ).length;

  const handleClick = ({ key }) => {
    dispatch(setDisplay(key));
  };

  const goHome = () => {
    dispatch(setDisplay('default'));
  };

  const handleSignOut = () => {
    if (
      window.gapi &&
      window.gapi.auth2
    ) {
      const auth2 =
        window.gapi.auth2.getAuthInstance();

      if (auth2) {
        auth2.signOut();
      }
    }

    dispatch(setLogin(false));
  };

  return (
    <StyledMenu
      mode="inline"
      selectedKeys={[display]}
      onClick={handleClick}
    >
      <Brand onClick={goHome}>
        <BrandTitle>
          MIRÚ
        </BrandTitle>

        <BrandSubtitle>
          Gestión Agrícola
        </BrandSubtitle>
      </Brand>

      <Menu.Item
        key="default"
        icon={<DatabaseOutlined />}
      >
        Panel principal
      </Menu.Item>

      <SubMenu
        key="inventario"
        icon={<ExperimentOutlined />}
        title="Inventario"
      >
        <Menu.Item
          key="consumables"
          icon={<PaperClipOutlined />}
        >
          Semillas 
        </Menu.Item>

        <Menu.Item
          key="reagents"
          icon={<ExperimentOutlined />}
        >
          Agroquímicos
        </Menu.Item>

        <Menu.Item
          key="equipment"
          icon={<ToolOutlined />}
        >
          Otros insumos
        </Menu.Item>
      </SubMenu>

      <Menu.Item
        key="scanner"
        icon={<ScanOutlined />}
      >
        Escanear producto
      </Menu.Item>

      <Menu.Item
        key="work-orders"
        icon={<FileTextOutlined />}
      >
        Hojas de trabajo
      </Menu.Item>

      <Menu.Item
        key="warehouse-map"
        icon={<ApartmentOutlined />}
      >
        Mapa del galpón
      </Menu.Item>

      <Menu.Item
        key="bayer-catalog"
        icon={<AppstoreOutlined />}
      >
        Catálogo Bayer
      </Menu.Item>

      <Menu.Item
        key="movements"
        icon={<HistoryOutlined />}
      >
        Movimientos
      </Menu.Item>

      <Menu.Item
        key="traceability"
        icon={<DatabaseOutlined />}
      >
        Trazabilidad
      </Menu.Item>

      <Menu.Item
        key="alerts"
        icon={
          <Badge
            count={alertCount}
            size="small"
          >
            <BellOutlined
              style={{
                color: 'inherit',
              }}
            />
          </Badge>
        }
      >
        Alertas
      </Menu.Item>

      <SubMenu
        key="usuario"
        icon={<UserOutlined />}
        title="Usuario"
      >
        <Menu.Item
          key="configuracion"
          icon={<SettingOutlined />}
        >
          Configuración
        </Menu.Item>
      </SubMenu>

      <UserInfo>
        <UserOutlined />{' '}
        {user?.name ||
          user?.email ||
          'Usuario'}
      </UserInfo>

      <SignOutButton
        icon={<AlertOutlined />}
        onClick={handleSignOut}
      >
        Cerrar sesión
      </SignOutButton>
    </StyledMenu>
  );
};

export default NavContainer;
