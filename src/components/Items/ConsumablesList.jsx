import React, { useMemo, useState } from 'react';
import { Spin, Tag } from 'antd';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { useGetConsumablesQuery } from '../../services/items';
import ConsumeModal from '../Modals/ConsumeModal';
import MovementModal from '../Modals/MovementModal';
import UpdateItem from '../Modals/UpdateItem';
import DeleteModal from '../Modals/DeleteModal';
import SearchInvalid from './SearchInvalid';
import InventoryRow from './InventoryRow';
import InventoryDetailDrawer from './InventoryDetailDrawer';

const Wrap=styled.div`width:100%;display:flex;flex-direction:column;gap:8px;`;
const Header=styled.div`display:grid;grid-template-columns:minmax(250px,1.35fr) minmax(150px,.75fr) minmax(145px,.7fr) minmax(155px,.75fr) 38px;gap:14px;padding:0 14px 4px;color:#8a9994;font-size:11px;text-transform:uppercase;letter-spacing:.5px;@media(max-width:1000px){grid-template-columns:minmax(230px,1.25fr) minmax(135px,.8fr) minmax(135px,.8fr) 38px;.location{display:none}}@media(max-width:680px){grid-template-columns:minmax(0,1fr) auto;.stock,.expiry,.location{display:none}}`;
const Count=styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;padding:4px 2px;color:#71817b;font-size:13px;strong{color:#1d4338}`;

const ConsumablesList=()=>{const searchInput=useSelector(s=>s.filter.filter);const inventoryFilter=useSelector(s=>s.filter.inventoryFilter||'todos');const {data,isLoading,isError}=useGetConsumablesQuery();const [selected,setSelected]=useState(null);const items=useMemo(()=>{const q=String(searchInput||'').toLowerCase().trim();return (data||[]).filter(item=>{const stock=Number(item.cantidad??0),min=Number(item.stockMinimo??10),low=stock<=min;const soon=item.vencimiento&&(()=>{const d=(new Date(`${item.vencimiento}T23:59:59`).getTime()-Date.now())/86400000;return d>=0&&d<=30})();const noLoc=!String(item.ubicacion||'').trim();if(inventoryFilter==='stock-bajo'&&!low)return false;if(inventoryFilter==='vence-30'&&!soon)return false;if(inventoryFilter==='sin-ubicacion'&&!noLoc)return false;if(!q)return true;return [item.nombre,item.lote,item.proveedor,item.vencimiento,item.cantidad,item.stockMinimo,item.unidad,item.ubicacion,item.descripcion].some(v=>String(v||'').toLowerCase().includes(q));});},[data,searchInput,inventoryFilter]);if(isLoading)return <Spin/>;if(isError)return <p>Error al cargar las semillas.</p>;if(!items.length)return <SearchInvalid/>;const itemActions=(item)=><><ConsumeModal item={item} categoria="consumables"/><MovementModal item={item} categoria="consumables"/><UpdateItem id={item._id} categoria="consumables"/><DeleteModal id={item._id} name={item.nombre} categoria="consumables"/></>;return <Wrap><Count><span>Inventario de semillas</span><strong>{items.length} productos</strong></Count><Header><span>Producto</span><span>Stock</span><span>Vencimiento</span><span className="location">Ubicación</span><span/></Header>{items.map(item=><InventoryRow key={item._id} item={item} categoria="consumables" onSelect={setSelected} actions={itemActions(item)}/>)}<InventoryDetailDrawer item={selected} open={!!selected} onClose={()=>setSelected(null)} categoria="consumables" actions={selected&&itemActions(selected)}/></Wrap>};
export default ConsumablesList;
