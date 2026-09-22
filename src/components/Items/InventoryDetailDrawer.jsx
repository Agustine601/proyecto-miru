import React from 'react';
import { Button, Drawer, Tag } from 'antd';
import { EnvironmentOutlined, InboxOutlined, SwapOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import ExpirationStatus from './ExpirationStatus.jsx';
import FEFOStatus from './FEFOStatus.jsx';

const Hero = styled.div`display:flex; gap:14px; align-items:center; padding-bottom:18px; border-bottom:1px solid #edf1ef;`;
const Img = styled.div`width:76px;height:76px;border-radius:14px;background:#eef7f2;border:1px solid #dcece4;display:flex;align-items:center;justify-content:center;font-size:30px;color:#16865b;overflow:hidden;img{width:100%;height:100%;object-fit:contain;background:#fff;}`;
const Box = styled.div`margin-top:16px;padding:14px;border-radius:12px;background:#f7faf9;border:1px solid #e6eeeb;`;
const Actions = styled.div`display:grid;grid-template-columns:1fr;gap:8px;margin-top:18px;`;

const InventoryDetailDrawer = ({ item, open, onClose, actions, categoria }) => {
  if (!item) return null;
  const image = item.imagen || item.imagenBolsa || item.datosQR?.imagen || '';
  const stock = Number(item.cantidad ?? 0);
  const min = Number(item.stockMinimo ?? 10);

  return (
    <Drawer title="Detalle del producto" placement="right" width={390} open={open} onClose={onClose}>
      <Hero>
        <Img>{image ? <img src={image} alt="" /> : <InboxOutlined />}</Img>
        <div><div style={{fontSize:20,fontWeight:700,color:'#183c34'}}>{item.nombre}</div><div style={{color:'#73837e'}}>{item.proveedor || 'Sin proveedor'}</div><Tag color={stock <= 0 ? 'red' : stock <= min ? 'orange' : 'green'} style={{marginTop:7}}>{stock <= 0 ? 'Sin stock' : stock <= min ? 'Stock bajo' : 'En stock'}</Tag></div>
      </Hero>
      <Box><b>Stock actual</b><div style={{fontSize:24,fontWeight:700,color:'#16865b',marginTop:4}}>{stock} {item.unidad || ''}</div><div style={{color:'#73837e'}}>Stock mínimo: {min} {item.unidad || ''}</div></Box>
      <Box><div><b> <EnvironmentOutlined /> Ubicación</b></div><div style={{marginTop:6}}>{item.ubicacion || 'Sin ubicación'}</div></Box>
      <Box><div><b>Datos</b></div><div style={{marginTop:8,lineHeight:1.9}}>Lote: {item.lote || (item.lotes?.length ? `${item.lotes.length} lotes` : 'Sin lote')}<br/>Vencimiento: {item.vencimiento || 'Sin fecha'}<br/>Código: {item.codigoBarras || item.codigoQR || 'Sin código'}</div></Box>
      <ExpirationStatus vencimiento={item.vencimiento} />
      <FEFOStatus item={item} />
      <Actions>{actions}</Actions>
    </Drawer>
  );
};
export default InventoryDetailDrawer;
