import React from 'react';
import { Button, Space, Table, Tag } from 'antd';
import { EnvironmentOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, SwapOutlined, InboxOutlined } from '@ant-design/icons';
import { InboxOutlined } from '@ant-design/icons';
import styled from 'styled-components';

import UpdateItem from '../Modals/UpdateItem';
import DeleteModal from '../Modals/DeleteModal';
import ConsumeModal from '../Modals/ConsumeModal';
import MovementModal from '../Modals/MovementModal';
import ExpirationStatus from './ExpirationStatus';
import FEFOStatus from './FEFOStatus';

const TableShell = styled.div`
  width: 100%;
  background: #fff;
  border: 1px solid #dbe5ee;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(20, 52, 77, 0.06);

  .miru-inventory-table .ant-table {
    font-size: 13px;
  }

  .miru-inventory-table .ant-table-thead > tr > th {
    background: #f3f7fa;
    color: #23445d;
    font-weight: 700;
    border-bottom: 1px solid #dbe5ee;
    padding: 10px 12px;
    white-space: nowrap;
  }

  .miru-inventory-table .ant-table-tbody > tr > td {
    padding: 9px 12px;
    border-bottom: 1px solid #edf2f6;
    vertical-align: middle;
  }

  .miru-inventory-table .ant-table-tbody > tr:hover > td {
    background: #f7fbf8 !important;
  }

  .miru-inventory-table .ant-pagination {
    margin: 12px 14px;
  }
    .product-cell {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .product-thumb {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef7f2;
    border: 1px solid #dcece4;
    color: #198754;
    font-size: 19px;
  }

  .product-thumb img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #fff;
  }
  .product-name {
    color: #173b55;
    font-weight: 700;
  }

  .muted {
    color: #7a8b99;
  }

  .stock-value {
    font-weight: 700;
    color: #176b46;
    white-space: nowrap;
  }

  .actions {
    white-space: nowrap;
  }

  .actions .ant-btn {
    height: 30px;
    padding: 0 9px;
  }

  .ant-tag {
    margin-inline-end: 4px;
  }

  @media (max-width: 800px) {
    border-radius: 10px;

    .miru-inventory-table .ant-table-thead > tr > th,
    .miru-inventory-table .ant-table-tbody > tr > td {
      padding: 8px 9px;
      font-size: 12px;
    }
  }
`;

const text = (value, fallback = '—') =>
  value === undefined || value === null || String(value).trim() === ''
    ? fallback
    : String(value);

const stockTag = (item) => {
  const stock = Number(item.cantidad ?? 0);
  const minimo = Number(item.stockMinimo ?? 10);

  if (stock <= minimo) return <Tag color="red">BAJO</Tag>;
  return <Tag color="green">OK</Tag>;
};

const baseColumns = (categoria, options = {}) => {
  const columns = [
    {
      title: 'Producto',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 210,
      fixed: 'left',
     render: (value, item) => {
  const image =
    item.imagen ||
    item.imagenBolsa ||
    item.datosQR?.imagen ||
    '';

  return (
    <div className="product-cell">
      <div className="product-thumb">
        {image ? (
          <img src={image} alt="" />
        ) : (
          <InboxOutlined />
        )}
      </div>

      <span className="product-name">
        {text(value, 'Sin nombre')}
      </span>
    </div>
  );
},
      sorter: (a, b) => text(a.nombre).localeCompare(text(b.nombre)),
    },
  ];

  if (categoria === 'reagents') {
    columns.push(
      { title: 'Fórmula', dataIndex: 'formula', key: 'formula', width: 120, render: (v) => text(v) },
      { title: 'CAS', dataIndex: 'cas', key: 'cas', width: 120, render: (v) => text(v) },
    );
  }

  columns.push(
    { title: 'Lote', dataIndex: 'lote', key: 'lote', width: 125, render: (v) => text(v, 'Sin lote') },
    { title: 'Proveedor', dataIndex: 'proveedor', key: 'proveedor', width: 150, render: (v) => text(v, 'Sin proveedor') },
    {
      title: 'Stock',
      key: 'stock',
      width: 125,
      sorter: (a, b) => Number(a.cantidad ?? 0) - Number(b.cantidad ?? 0),
      render: (_, item) => (
        <>
          <span className="stock-value">{Number(item.cantidad ?? 0)} {text(item.unidad, '')}</span>{' '}
          {stockTag(item)}
        </>
      ),
    },
    {
      title: 'Mínimo',
      key: 'minimo',
      width: 90,
      render: (_, item) => `${Number(item.stockMinimo ?? 10)} ${text(item.unidad, '')}`,
      sorter: (a, b) => Number(a.stockMinimo ?? 10) - Number(b.stockMinimo ?? 10),
    },
    {
      title: 'Vencimiento',
      key: 'vencimiento',
      width: 155,
      sorter: (a, b) => text(a.vencimiento).localeCompare(text(b.vencimiento)),
      render: (_, item) => (
        <Space size={4} direction="vertical">
          <span>{text(item.vencimiento, 'Sin fecha')}</span>
          <ExpirationStatus vencimiento={item.vencimiento} />
        </Space>
      ),
    },
    {
      title: 'Ubicación',
      key: 'ubicacion',
      width: 145,
      render: (_, item) => (
        <span className={!item.ubicacion ? 'muted' : ''}>
          <EnvironmentOutlined /> {text(item.ubicacion, 'Sin ubicación')}
        </span>
      ),
    },
  );

  if (options.showFefo) {
    columns.push({
      title: 'FEFO',
      key: 'fefo',
      width: 115,
      render: (_, item) => <FEFOStatus item={item} />,
    });
  }

  if (options.showDescription) {
    columns.push({
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      width: 220,
      ellipsis: true,
      render: (v) => text(v, 'Sin descripción'),
    });
  }

  columns.push({
    title: 'Acciones',
    key: 'acciones',
    width: categoria === 'equipment' ? 150 : 250,
    fixed: 'right',
    render: (_, item) => (
      <Space className="actions" size={4}>
        {categoria !== 'equipment' && <ConsumeModal item={item} categoria={categoria} />}
        {categoria !== 'equipment' && <MovementModal item={item} categoria={categoria} />}
        <UpdateItem id={item._id} categoria={categoria} />
        <DeleteModal id={item._id} name={item.nombre} categoria={categoria} />
      </Space>
    ),
  });

  return columns;
};

const equipmentColumns = (categoria) => [
  {
    title: 'Equipo',
    dataIndex: 'nombre',
    key: 'nombre',
    width: 240,
    fixed: 'left',
    render: (v) => <span className="product-name">{text(v, 'Sin nombre')}</span>,
    sorter: (a, b) => text(a.nombre).localeCompare(text(b.nombre)),
  },
  { title: 'Proveedor', dataIndex: 'proveedor', key: 'proveedor', width: 170, render: (v) => text(v, 'Sin especificar') },
  {
    title: 'Ubicación',
    key: 'ubicacion',
    width: 170,
    render: (_, item) => <span className={!item.ubicacion ? 'muted' : ''}><EnvironmentOutlined /> {text(item.ubicacion, 'Sin ubicación')}</span>,
  },
  { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', width: 280, ellipsis: true, render: (v) => text(v, 'Sin descripción') },
  { title: 'Mantenimiento', dataIndex: 'ultimoMantenimiento', key: 'ultimoMantenimiento', width: 150, render: (v) => text(v, 'Sin registrar') },
  {
    title: 'Acciones', key: 'acciones', width: 150, fixed: 'right',
    render: (_, item) => (
      <Space className="actions" size={4}>
        <UpdateItem id={item._id} categoria={categoria} />
        <DeleteModal name={item.nombre} id={item._id} categoria={categoria} />
      </Space>
    ),
  },
];

const InventoryTable = ({ items = [], categoria, showFefo = false, showDescription = false, equipment = false }) => {
  const columns = equipment
    ? equipmentColumns(categoria)
    : baseColumns(categoria, { showFefo, showDescription });

  return (
    <TableShell>
      <Table
        className="miru-inventory-table"
        rowKey="_id"
        columns={columns}
        dataSource={items}
        size="middle"
        bordered={false}
        pagination={{ pageSize: 12, showSizeChanger: true, pageSizeOptions: ['12', '24', '48'], showTotal: (total) => `${total} productos` }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'No hay productos para mostrar' }}
      />
    </TableShell>
  );
};

export default InventoryTable;
