import React, { useMemo, useState } from 'react';
import { Spin } from 'antd';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { useGetEquipmentQuery } from '../../services/items.js';
import UpdateItem from '../Modals/UpdateItem.jsx';
import DeleteModal from '../Modals/DeleteModal.jsx';
import SearchInvalid from './SearchInvalid.jsx';
import InventoryRow from './InventoryRow.jsx';
import InventoryDetailDrawer from './InventoryDetailDrawer.jsx';

const Wrap=styled.div`width:100%;display:flex;flex-direction:column;gap:8px;`;
const Header=styled.div`display:grid;grid-template-columns:minmax(250px,1.35fr) minmax(150px,.75fr) minmax(145px,.7fr) minmax(155px,.75fr) 38px;gap:14px;padding:0 14px 4px;color:#8a9994;font-size:11px;text-transform:uppercase;letter-spacing:.5px;@media(max-width:1000px){grid-template-columns:minmax(230px,1.25fr) minmax(135px,.8fr) minmax(135px,.8fr) 38px;.location{display:none}}@media(max-width:680px){grid-template-columns:minmax(0,1fr) auto;.stock,.expiry,.location{display:none}}`;
const Count=styled.div`display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;padding:4px 2px;color:#71817b;font-size:13px;strong{color:#1d4338}`;
const EquipmentList=()=>{const {data,error,isLoading,isError,isSuccess}=useGetEquipmentQuery();const searchInput=useSelector(s=>s.filter.filter);const inventoryFilter=useSelector(s=>s.filter.inventoryFilter||'todos');const [selected,setSelected]=useState(null);const items=useMemo(()=>{let results=data||[];const q=String(searchInput||'').toLowerCase().trim();if(q)results=results.filter(i=>[i.nombre,i.proveedor,i.ubicacion,i.descripcion,i.ultimoMantenimiento].some(v=>String(v||'').toLowerCase().includes(q)));if(inventoryFilter==='sin-ubicacion')results=results.filter(i=>!String(i.ubicacion||'').trim());return results;},[data,searchInput,inventoryFilter]);if(isLoading)return <Spin/>;if(isError)return <p>Error al cargar el equipamiento: {error?.message||'Error desconocido'}</p>;if(!isSuccess||!items.length)return <SearchInvalid/>;const actions=(item)=><><UpdateItem id={item._id} categoria="equipment"/><DeleteModal name={item.nombre} id={item._id} categoria="equipment"/></>;return <Wrap><Count><span>Equipamiento</span><strong>{items.length} equipos</strong></Count><Header><span>Equipo</span><span>Información</span><span>Estado</span><span className="location">Ubicación</span><span/></Header>{items.map(item=><InventoryRow key={item._id} item={item} categoria="equipment" onSelect={setSelected} actions={actions(item)}/>)}<InventoryDetailDrawer item={selected} open={!!selected} onClose={()=>setSelected(null)} categoria="equipment" actions={selected&&actions(selected)}/></Wrap>};
export default EquipmentList;
