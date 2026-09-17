import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  Menu,
  Badge,
  Button,
  Drawer,
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
  MenuOutlined,
} from '@ant-design/icons';

import styled from 'styled-components';

import { setDisplay } from './displaySlice';
import { setLogin } from '../../loginSlice';

import {
  useGetConsumablesQuery,
  useGetReagentsQuery,
} from '../../services/items';

/* =========================================
   DESKTOP
   ========================================= */

const DesktopSidebar = styled.aside`
  width: 270px;
  min-width: 270px;
  height: 100vh;
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #1f4728 0%, #285a32 55%, #1c4025 100%);
  box-shadow: 4px 0 18px rgba(0, 0, 0, 0.12);

  @media (max-width: 700px) {
    display: none;
  }
`;

const StyledMenu = styled(Menu)`
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: none !important;
  background: transparent !important;

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

/* =========================================
   BRAND
   ========================================= */

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

/* =========================================
   USER
   ========================================= */

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

const DesktopFooter = styled.div`
  flex: 0 0 auto;
  background: linear-gradient(180deg, #285a32 0%, #1c4025 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

/* =========================================
   MOBILE HEADER
   ========================================= */

const MobileHeader = styled.div`
  display: none;

  @media (max-width: 700px) {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 1000;
    width: 100%;
    height: 62px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: linear-gradient(
      135deg,
      #1f4728 0%,
      #285a32 55%,
      #1c4025 100%
    );
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.16);
  }
`;

const MobileBrand = styled.div`
  color: white;
  cursor: pointer;
  line-height: 1;

  strong {
    display: block;
    font-size: 23px;
    letter-spacing: 2px;
  }

  span {
    display: block;
    margin-top: 3px;
    font-size: 9px;
    letter-spacing: 0.8px;
    color: #cfe5ce;
    text-transform: uppercase;
  }
`;

const MobileMenuButton = styled(Button)`
  width: 44px !important;
  height: 44px !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  border-radius: 10px !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  background: rgba(255, 255, 255, 0.1) !important;
  color: white !important;
  font-size: 20px;
`;

/* =========================================
   MOBILE DRAWER
   ========================================= */

const MobileDrawer = styled(Drawer)`
  .ant-drawer-header {
    background: #1f4728;
    border-bottom: none;
  }

  .ant-drawer-title {
    color: white;
    font-weight: 700;
  }

  .ant-drawer-close {
    color: white;
  }

  .ant-drawer-body {
    padding: 8px !important;
    background: #f4f8f2;
  }

  .ant-menu {
    border-right: none !important;
    background: transparent !important;
  }

  .ant-menu-item,
  .ant-menu-submenu-title {
    min-height: 46px !important;
    line-height: 46px !important;
    margin: 4px 0 !important;
    border-radius: 9px !important;
    font-weight: 600;
  }

  .ant-menu-item-selected {
    background: #397348 !important;
    color: white !important;
  }

  .ant-menu-sub {
    background: #e8f0e5 !important;
    border-radius: 9px !important;
  }
`;

/* =========================================
   NAV CONTAINER
   ========================================= */

const NavContainer = () => {
  const dispatch = useDispatch();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 700
  );

  const display = useSelector(
    (state) => state.display?.display || 'default'
  );

  const user = useSelector(
    (state) => state.user?.user
  );

  const { data: consumables = [] } =
    useGetConsumablesQuery();

  const { data: reagents = [] } =
    useGetReagentsQuery();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const today = new Date();

  const productosConAlerta = [
    ...(Array.isArray(consumables) ? consumables : []),
    ...(Array.isArray(reagents) ? reagents : []),
  ];

  const alertCount =
    productosConAlerta.filter((item) => {
      const stock = Number(item?.cantidad || 0);
      const minimo = Number(item?.stockMinimo || 10);

      const stockBajo = stock <= minimo;

      let proximoVencimiento = false;

      if (item?.vencimiento) {
        const vencimiento = new Date(
          `${item.vencimiento}T23:59:59`
        );

        const diferencia =
          vencimiento.getTime() - today.getTime();

        const dias =
          diferencia / (1000 * 60 * 60 * 24);

        proximoVencimiento = dias <= 30;
      }

      return stockBajo || proximoVencimiento;
    }).length;

  /* =========================================
     MENU ITEMS
     ========================================= */

  const menuItems = [
    {
      key: 'default',
      icon: <DatabaseOutlined />,
      label: 'Panel principal',
    },
    {
      key: 'inventario',
      icon: <ExperimentOutlined />,
      label: 'Inventario',
      children: [
        {
          key: 'consumables',
          icon: <PaperClipOutlined />,
          label: 'Semillas',
        },
        {
          key: 'reagents',
          icon: <ExperimentOutlined />,
          label: 'Agroquímicos',
        },
        {
          key: 'equipment',
          icon: <ToolOutlined />,
          label: 'Otros insumos',
        },
      ],
    },
    {
      key: 'scanner',
      icon: <ScanOutlined />,
      label: 'Escanear producto',
    },
    {
      key: 'work-orders',
      icon: <FileTextOutlined />,
      label: 'Hojas de trabajo',
    },
    {
      key: 'warehouse-map',
      icon: <ApartmentOutlined />,
      label: 'Mapa del galpón',
    },
    {
      key: 'bayer-catalog',
      icon: <AppstoreOutlined />,
      label: 'Catálogos de proveedores',
    },
    {
      key: 'movements',
      icon: <HistoryOutlined />,
      label: 'Movimientos',
    },
    {
      key: 'traceability',
      icon: <DatabaseOutlined />,
      label: 'Trazabilidad',
    },
    {
      key: 'alerts',
      icon: (
        <Badge count={alertCount} size="small">
          <BellOutlined />
        </Badge>
      ),
      label: 'Alertas',
    },
    {
      key: 'usuario',
      icon: <UserOutlined />,
      label: 'Usuario',
      children: [
        {
          key: 'configuracion',
          icon: <SettingOutlined />,
          label: 'Configuración',
        },
      ],
    },
  ];

  /* =========================================
     CLICK DEL MENU
     ========================================= */

  const handleMenuClick = (info) => {
    console.log('MIRÚ - EVENTO COMPLETO:', info);

    const key = info?.key;

    console.log('MIRÚ - KEY:', key);

    const screenKeys = [
      'default',
      'consumables',
      'reagents',
      'equipment',
      'scanner',
      'work-orders',
      'warehouse-map',
      'bayer-catalog',
      'movements',
      'traceability',
      'alerts',
      'configuracion',
    ];

    if (screenKeys.includes(key)) {
      console.log('MIRÚ - CAMBIANDO PANTALLA:', key);

      dispatch(setDisplay(key));

      if (isMobile) {
        setMobileMenuOpen(false);
      }
    }
  };

  /* =========================================
     HOME
     ========================================= */

  const goHome = () => {
    dispatch(setDisplay('default'));

    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  /* =========================================
     LOGOUT
     ========================================= */

  const handleSignOut = () => {
    if (window.gapi && window.gapi.auth2) {
      const auth2 = window.gapi.auth2.getAuthInstance();

      if (auth2) {
        auth2.signOut();
      }
    }

    setMobileMenuOpen(false);
    dispatch(setLogin(false));
  };

  /* =========================================
     SELECTED
     ========================================= */

  const selectedKeys =
    typeof display === 'string' && display
      ? [display]
      : ['default'];

  /* =========================================
     RENDER
     ========================================= */

  return (
    <>
      {/* =========================================
          DESKTOP
          ========================================= */}

      <DesktopSidebar>
        <Brand onClick={goHome}>
          <BrandTitle>MIRÚ</BrandTitle>

          <BrandSubtitle>
            Gestión Agrícola
          </BrandSubtitle>
        </Brand>

        <StyledMenu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={handleMenuClick}
        />

        <DesktopFooter>
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
        </DesktopFooter>
      </DesktopSidebar>

      {/* =========================================
          MOBILE
          ========================================= */}

      <MobileHeader>
        <MobileBrand onClick={goHome}>
          <strong>MIRÚ</strong>
          <span>Gestión Agrícola</span>
        </MobileBrand>

        <MobileMenuButton
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuOpen(true)}
        />
      </MobileHeader>

      <MobileDrawer
        title="🌱 MIRÚ"
        placement="left"
        width="85%"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        destroyOnClose
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={handleMenuClick}
        />

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
      </MobileDrawer>
    </>
  );
};

export default NavContainer;