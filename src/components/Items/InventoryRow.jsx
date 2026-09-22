import React from 'react';
import styled from 'styled-components';
import { Button, Tag, Tooltip } from 'antd';
import { EnvironmentOutlined, InboxOutlined, CalendarOutlined, MoreOutlined, RightOutlined } from '@ant-design/icons';

const Row = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(250px, 1.35fr) minmax(150px, .75fr) minmax(145px, .7fr) minmax(155px, .75fr) 38px;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e4ece8;
  border-radius: 14px;
  box-shadow: 0 3px 12px rgba(16, 56, 47, .05);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-1px);
    border-color: #b8d8ca;
    box-shadow: 0 7px 20px rgba(16, 56, 47, .09);
  }

  @media (max-width: 1000px) {
    grid-template-columns: minmax(230px, 1.25fr) minmax(135px, .8fr) minmax(135px, .8fr) 38px;
    .location { display: none; }
  }

  @media (max-width: 680px) {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    padding: 11px;
    .stock, .expiry, .location { display: none; }
  }
`;

const Product = styled.div` display:flex; align-items:center; min-width:0; gap:12px; `;
const Thumb = styled.div`
  width:48px; height:48px; flex:0 0 48px; border-radius:11px; overflow:hidden;
  display:flex; align-items:center; justify-content:center; background:#eef7f2; color:#198754;
  border:1px solid #dcece4; font-size:22px;
  img { width:100%; height:100%; object-fit:contain; background:#fff; }
`;
const ProductText = styled.div` min-width:0; h3 { margin:0 0 4px; color:#183c34; font-size:15px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } p { margin:0; color:#70817c; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } `;
const Cell = styled.div` min-width:0; color:#304943; font-size:13px; .label { display:block; color:#91a09b; font-size:11px; margin-bottom:3px; } strong { color:#1f4339; font-size:14px; } `;
const StockBar = styled.div` height:5px; margin-top:6px; border-radius:99px; background:#edf2ef; overflow:hidden; span { display:block; height:100%; width:${p => Math.min(100, Math.max(4, p.percent || 0))}%; background:${p => p.low ? '#f59e0b' : '#20a36a'}; border-radius:99px; } `;
const More = styled.div` display:flex; justify-content:flex-end; color:#8a9b95; font-size:18px; `;

const status = (stock, min) => stock <= 0 ? { text:'Sin stock', color:'red' } : stock <= min ? { text:'Stock bajo', color:'orange' } : { text:'En stock', color:'green' };

const InventoryRow = ({ item, categoria, onSelect, actions }) => {
  const isEquipment = categoria === 'equipment';
  const stock = Number(item.cantidad ?? 0);
  const min = Number(item.stockMinimo ?? 10);
  const st = isEquipment ? { text: 'Disponible', color: 'green' } : status(stock, min);
  const percent = min > 0 ? (stock / min) * 100 : 100;
  const image = item.imagen || item.imagenBolsa || item.datosQR?.imagen || '';

  return (
    <Row onClick={() => onSelect?.(item)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect?.(item)}>
      <Product>
        <Thumb>{image ? <img src={image} alt="" /> : <InboxOutlined />}</Thumb>
        <ProductText>
          <h3>{item.nombre || 'Producto sin nombre'}</h3>
          <p>{item.lote ? `Lote ${item.lote}` : item.lotes?.length ? `${item.lotes.length} lotes` : 'Sin lote'} · {item.proveedor || 'Sin proveedor'}</p>
          {categoria === 'reagents' && item.formula && <p>{item.formula}</p>}
        </ProductText>
      </Product>

      <Cell className="stock">
        <span className="label">{isEquipment ? 'Tipo' : 'Stock actual'}</span>
        <strong>{isEquipment ? 'Equipamiento' : `${stock} ${item.unidad || ''}`}</strong>
        {!isEquipment && <><StockBar percent={percent} low={stock <= min} /><span className="label" style={{ marginTop: 4 }}>Mínimo: {min} {item.unidad || ''}</span></>}
      </Cell>

      <Cell className="expiry">
        <span className="label">{isEquipment ? 'Mantenimiento' : 'Vencimiento'}</span>
        <span><CalendarOutlined /> {isEquipment ? (item.ultimoMantenimiento || 'Sin registrar') : (item.vencimiento || 'Sin fecha')}</span>
        <div style={{ marginTop: 5 }}><Tag color={st.color}>{st.text}</Tag></div>
      </Cell>

      <Cell className="location">
        <span className="label">Ubicación</span>
        <span><EnvironmentOutlined /> {item.ubicacion || 'Sin ubicación'}</span>
      </Cell>

      <More>
        <Tooltip title="Acciones">
          <Button type="text" shape="circle" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Tooltip>
        <RightOutlined style={{ fontSize: 12 }} />
      </More>
      <div style={{ display:'none' }}>{actions}</div>
    </Row>
  );
};

export default InventoryRow;
