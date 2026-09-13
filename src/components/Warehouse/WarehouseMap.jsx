import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button, Card, Input, Modal, Tag, message, Tooltip } from 'antd';
import { ApartmentOutlined, DragOutlined, SearchOutlined, SaveOutlined, DeleteOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { useGetConsumablesQuery, useGetReagentsQuery, useGetEquipmentQuery, useUpdateItemMutation } from '../../services/items';
import { useGetWarehouseMapQuery, useSaveWarehouseMapMutation } from '../../services/warehouse';

const makeRack = (n, access, group) => Array.from({ length: 12 }, (_, i) => ({
  id: `R${String(n).padStart(2, '0')}-P${String(i + 1).padStart(2, '0')}`,
  rack: n, position: i + 1, access, group,
}));

const racksFront = Array.from({ length: 16 }, (_, i) => makeRack(i + 1, 'frente', 'racks-01-16'));
const racksSide = Array.from({ length: 8 }, (_, i) => makeRack(i + 18, 'costado', 'racks-18-25'));
const racksFront2 = Array.from({ length: 4 }, (_, i) => makeRack(i + 26, 'frente', 'racks-26-29'));
const racksSide2 = Array.from({ length: 4 }, (_, i) => makeRack(i + 30, 'costado', 'racks-30-33'));

// CONTROL MAX: 10 filas x 3 posiciones de piso, con hasta 2 pallets apilados.
const controlMax = Array.from({ length: 30 }, (_, i) => ({
  id: `CM-F${String(Math.floor(i / 3) + 1).padStart(2, '0')}-P${String((i % 3) + 1).padStart(2, '0')}`,
  row: Math.floor(i / 3) + 1, position: (i % 3) + 1, access: 'entrada',
}));

const Wrapper = styled.div`width:100%; padding:20px 22px 50px; max-width:1600px; box-sizing:border-box;`;
const Header = styled(Card)`margin-bottom:16px; .ant-card-body{padding:18px 20px;}`;
const Toolbar = styled.div`display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:14px;`;
const Legend = styled.div`display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;`;
const Building = styled.div`position:relative; border:2px solid #28352d; border-radius:10px; background:#172019; min-height:790px; overflow:hidden; box-shadow:0 8px 28px rgba(0,0,0,.14);`;
const Wall = styled.div`position:absolute; background:#f5f5f5; z-index:4;`;
const VerticalWall = styled(Wall)`top:0; bottom:0; width:5px; left:69%;`;
const TopWall = styled(Wall)`left:0; right:0; height:5px; top:0;`;
const BottomWall = styled(Wall)`left:0; right:0; height:5px; bottom:0;`;
const Label = styled.div`position:absolute; z-index:7; font-size:12px; font-weight:800; letter-spacing:.2px; color:${p=>p.color||'#dce9dd'}; text-shadow:0 1px 2px #000; pointer-events:none;`;
const Zone = styled.div`
  position:absolute; border:2px solid ${p=>p.border||'#18d1c2'}; background:${p=>p.bg||'rgba(17,210,195,.04)'}; z-index:2;
  border-radius:3px; box-sizing:border-box;
`;
const RackStrip = styled.div`
  position:absolute; z-index:5; display:flex; gap:7px; align-items:stretch;
`;
const RackMini = styled.div`
  width:${p=>p.w||'34px'}; min-width:${p=>p.w||'34px'}; height:${p=>p.h||'120px'}; border:2px solid ${p=>p.side?'#00c9bd':'#27d5c6'};
  background:rgba(0,0,0,.15); border-radius:2px; cursor:pointer; position:relative; padding:3px; box-sizing:border-box;
  &:hover{background:rgba(39,213,198,.14); box-shadow:0 0 0 2px rgba(39,213,198,.2);}
`;
const MiniSlots = styled.div`display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(3,1fr); height:100%; gap:2px;`;
const MiniSlot = styled.div`
  border:1px solid rgba(178,255,246,.42); border-radius:1px; background:${p=>p.occupied?'#5ecb70':'rgba(255,255,255,.035)'}; min-width:0; min-height:0;
  ${p=>p.highlight?'outline:2px solid #ffd54a;':''}
`;
const RackName = styled.div`position:absolute; left:50%; transform:translateX(-50%); top:-19px; color:#dffaf6; font-size:10px; font-weight:900; white-space:nowrap; text-shadow:0 1px 2px #000;`;
const AccessMark = styled.div`position:absolute; z-index:6; color:#ffe082; font-size:10px; font-weight:900; writing-mode:vertical-rl; background:rgba(0,0,0,.55); padding:3px; border-radius:3px;`;
const Emergency = styled.div`position:absolute; z-index:7; border:3px solid #ff4b4b; background:rgba(255,75,75,.14); color:#ff9b9b; font-size:10px; font-weight:900; padding:5px 7px; border-radius:3px;`;
const Entry = styled.div`position:absolute; z-index:7; border:3px solid #ff3f3f; background:rgba(255,63,63,.14); color:#ff9696; font-size:10px; font-weight:900; padding:5px 7px; border-radius:3px;`;
const ControlZone = styled.div`position:absolute; z-index:3; left:1%; top:18%; width:19%; height:72%; border:2px solid #f29a28; background:rgba(242,154,40,.055); border-radius:4px; padding:12px 9px; box-sizing:border-box;`;
const ControlGrid = styled.div`height:100%; display:grid; grid-template-rows:repeat(10,1fr); gap:5px;`;
const ControlRow = styled.div`display:grid; grid-template-columns:repeat(3,1fr); gap:5px;`;
const ControlSlot = styled.div`
  border:2px solid #f29a28; background:${p=>p.occupied?'#e8a044':'rgba(242,154,40,.08)'}; border-radius:3px; cursor:pointer; position:relative; min-height:0;
  &:hover{filter:brightness(1.15);}
  ${p=>p.highlight?'outline:3px solid #fff176;':''}
`;
const StackBadge = styled.span`position:absolute; top:1px; right:2px; font-size:8px; font-weight:900; color:#fff; text-shadow:0 1px 2px #000;`;
const ControlTitle = styled.div`position:absolute; top:-22px; left:0; color:#ffb44f; font-weight:900; font-size:12px;`;
const RackGroupTitle = styled.div`position:absolute; z-index:7; color:#3ce1d2; font-size:11px; font-weight:900; background:rgba(0,0,0,.45); padding:3px 5px; border-radius:3px;`;
const FloorTitle = styled.div`position:absolute; z-index:7; left:50%; top:9px; transform:translateX(-50%); color:#fff; font-weight:900; font-size:14px; letter-spacing:1px;`;
const Unassigned = styled.div`display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:8px; margin-top:12px;`;
const ProductCard = styled.div`border:1px solid #d8e3d5; background:#fff; border-radius:9px; padding:9px; cursor:grab; font-size:12px; &:hover{border-color:#7ca07e;}`;

function itemName(item){ return item?.nombre || item?.name || 'Sin nombre'; }
function itemLot(item){ return item?.lote || item?.lotes?.[0]?.numero || ''; }

export default function WarehouseMap(){
  const { data: saved = {}, isLoading } = useGetWarehouseMapQuery();
  const [saveMap, { isLoading: saving }] = useSaveWarehouseMapMutation();
  const [map, setMap] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dragged, setDragged] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const { data: consumables=[] } = useGetConsumablesQuery();
  const { data: reagents=[] } = useGetReagentsQuery();
  const { data: equipment=[] } = useGetEquipmentQuery();
  const [updateItem] = useUpdateItemMutation();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('miru_pending_warehouse_placement');
      if (raw) setPendingPlacement(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const products = useMemo(() => [
    ...consumables.map(x=>({...x, categoria:'consumables'})),
    ...reagents.map(x=>({...x, categoria:'reagents'})),
    ...equipment.map(x=>({...x, categoria:'equipment'})),
  ], [consumables,reagents,equipment]);

  const state = map || saved || {};
  const occupied = state.occupied || {};
  const filteredProducts = products.filter(p => {
    const q=search.trim().toLowerCase(); if(!q) return true;
    return [itemName(p), itemLot(p), p.ubicacion, p.codigoBarras].some(v=>String(v||'').toLowerCase().includes(q));
  });

  const productPayload = p => ({ id:String(p._id || p.id), nombre:itemName(p), lote:itemLot(p), categoria:p.categoria, ubicacion:p.ubicacion || '', codigoBarras:p.codigoBarras || '', codigoQR:p.codigoQR || '', cantidad:p.cantidad ?? 0, unidad:p.unidad || '', vencimiento:p.vencimiento || '', solicitante:p.solicitante || '', destino:p.destino || '' });

  const persistProductLocation = async (product, slotId) => {
    if (!product?.id || !product?.categoria) return;
    const body = { ubicacion: slotId };
    if (Array.isArray(product.lotes) && product.lotes.length) {
      body.lotes = product.lotes.map(lote => ({ ...lote, ubicacion: lote.numero === (product.lote || lote.numero) ? slotId : (lote.ubicacion || '') }));
    }
    try {
      await updateItem({ id: product.id, categoria: product.categoria, ...body }).unwrap();
    } catch (error) {
      message.warning('El mapa se actualizó, pero no se pudo actualizar la ubicación del producto.');
    }
  };

  const finishPendingPlacement = async (slotId) => {
    if (!pendingPlacement?.product) return false;
    const p = pendingPlacement.product;
    const maxStack = slotId.startsWith('CM-') ? 2 : 1;
    const current = stackOf(occupied[slotId]);
    if (current.length >= maxStack) {
      message.warning(`La posición admite ${maxStack} pallet${maxStack > 1 ? 's' : ''}.`);
      return true;
    }
    const payload = productPayload({ ...p, categoria: pendingPlacement.categoria || p.categoria });
    const next = { ...occupied, [slotId]: [...current, payload] };
    const nextState = { ...state, occupied: next };
    setMap(nextState);
    setUpdatingLocation(true);
    try {
      await saveMap(nextState).unwrap();
      await persistProductLocation(p, slotId);
      sessionStorage.removeItem('miru_pending_warehouse_placement');
      setPendingPlacement(null);
      message.success(`Pallet ubicado en ${slotId}.`);
    } catch (error) {
      message.error('No se pudo guardar la ubicación del pallet.');
    } finally {
      setUpdatingLocation(false);
    }
    return true;
  };
  const stackOf = value => Array.isArray(value) ? value : (value ? [value] : []);

  const put = async (slotId, product, maxStack=1) => {
    if (!product) return;
    const current = stackOf(occupied[slotId]);
    if (current.length >= maxStack) { message.warning(`La posición admite ${maxStack} pallet${maxStack>1?'s':''}.`); return; }
    const payload = productPayload(product);
    const nextState = {...state, occupied:{...occupied, [slotId]:[...current, payload]}};
    setMap(nextState);
    setSelectedProduct(null);
    await persistProductLocation(product, slotId);
  };
  const move = async (from,to,maxStack=1) => {
    const source=stackOf(occupied[from]); const dest=stackOf(occupied[to]);
    if(!source.length) return;
    if(dest.length >= maxStack) { message.warning(`La posición destino admite ${maxStack} pallet${maxStack>1?'s':''}.`); return; }
    // Si hay pallets apilados, se mueve el pallet de arriba, no todo el montón.
    const moving = source[source.length - 1];
    const remaining = source.slice(0, -1);
    const next={...occupied,[to]:[...dest,moving]};
    if (remaining.length) next[from]=remaining; else delete next[from];
    const nextState = {...state,occupied:next};
    setMap(nextState);
    setDragged(null);
    await persistProductLocation(moving, to);
  };
  const addOrMove = (slotId, maxStack=1) => {
    if (pendingPlacement?.product) return finishPendingPlacement(slotId);
    if (dragged && String(dragged).startsWith('PRODUCT:')) { const p=selectedProduct; setDragged(null); return put(slotId,p,maxStack); }
    if (dragged) return move(dragged, slotId, maxStack);
    if (selectedProduct) return put(slotId, selectedProduct, maxStack);
    setDetail({id:slotId, product:stackOf(occupied[slotId])});
  };
  const clear = (id) => { const next={...occupied}; delete next[id]; setMap({...state,occupied:next}); };
  const save = async()=>{ try{ await saveMap(state).unwrap(); message.success('Mapa guardado.'); } catch(e){ message.error('No se pudo guardar el mapa.'); } };
  const isMatch = product => !!search && [product?.nombre, product?.lote].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase()));

  const renderRackMini = (rack, index, side=false) => (
    <Tooltip key={rack[0].rack} title={`Rack ${String(rack[0].rack).padStart(2,'0')} · 12 pallets · acceso ${side?'lateral':'frente'}`}>
      <RackMini
        side={side}
        draggable={false}
        onClick={() => setDetail({id:`R${String(rack[0].rack).padStart(2,'0')}`, rack:rack[0].rack, product:rack.flatMap(slot=>stackOf(occupied[slot.id]).map(p=>({...p, slot:slot.id})))})}
      >
        <RackName>R{String(rack[0].rack).padStart(2,'0')}</RackName>
        <MiniSlots>
          {rack.map(slot=>{
            const stack=stackOf(occupied[slot.id]);
            return <Tooltip key={slot.id} title={`${slot.id}${stack[0]?` · ${stack[0].nombre}`:' · Libre'}`}>
              <MiniSlot
                occupied={!!stack.length}
                highlight={isMatch(stack[0])}
                draggable={!!stack.length}
                onDragStart={(e)=>{e.stopPropagation(); setDragged(slot.id); setSelectedProduct(null);}}
                onDragOver={e=>e.preventDefault()}
                onDrop={(e)=>{e.stopPropagation(); addOrMove(slot.id,1);}}
                onClick={(e)=>{e.stopPropagation(); addOrMove(slot.id,1);}}
              />
            </Tooltip>;
          })}
        </MiniSlots>
      </RackMini>
    </Tooltip>
  );

  const renderControl = () => (
    <ControlZone>
      <ControlTitle>CONTROL MAX · APILADO</ControlTitle>
      <ControlGrid>
        {Array.from({length:10},(_,r)=><ControlRow key={r}>
          {controlMax.slice(r*3,r*3+3).map(slot=>{
            const stack=stackOf(occupied[slot.id]); const product=stack[stack.length-1];
            return <Tooltip key={slot.id} title={`${slot.id}${product?` · ${product.nombre}`:' · Libre'} · ${stack.length}/2`}>
              <ControlSlot occupied={!!product} highlight={isMatch(product)} draggable={!!product}
                onDragStart={()=>{setDragged(slot.id);setSelectedProduct(null);}}
                onDragOver={e=>e.preventDefault()} onDrop={()=>addOrMove(slot.id,2)} onClick={()=>addOrMove(slot.id,2)}>
                <StackBadge>{stack.length}/2</StackBadge>
              </ControlSlot>
            </Tooltip>;
          })}
        </ControlRow>)}
      </ControlGrid>
    </ControlZone>
  );

  const allRacks = [...racksFront,...racksSide,...racksFront2,...racksSide2];

  if(isLoading) return <Wrapper>Cargando mapa...</Wrapper>;
  return <Wrapper>
    <Header>
      <h1 style={{margin:0,color:'#23452b'}}><ApartmentOutlined/> Mapa físico del galpón</h1>
      <p style={{margin:'6px 0 0',color:'#66736a'}}>Vista según tu boceto: entrada arriba a la izquierda, CONTROL MAX a la izquierda, racks 01–16 arriba y los demás sectores a la derecha. Cada rack tiene 12 pallets.</p>
      {pendingPlacement?.product && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, border: '2px solid #f29a28', background: '#fff8ea' }}>
          <div style={{ fontWeight: 800, color: '#8a5310' }}>📦 PALLET PENDIENTE DE UBICAR</div>
          <div style={{ marginTop: 4 }}><b>{itemName(pendingPlacement.product)}</b> · Lote {itemLot(pendingPlacement.product) || '—'} · {pendingPlacement.product.cantidad ?? '—'} {pendingPlacement.product.unidad || ''}</div>
          <div style={{ marginTop: 4, color: '#8a5310' }}>Tocá una posición libre del mapa para guardar dónde quedó.</div>
        </div>
      )}
      <Toolbar>
        <Input prefix={<SearchOutlined/>} placeholder="Buscar producto, lote o ubicación" value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:380}} allowClear/>
        <Button type="primary" icon={<SaveOutlined/>} loading={saving} onClick={save}>Guardar mapa</Button>
        {pendingPlacement?.product && <Tag color="orange">Elegí una posición para el pallet escaneado</Tag>}
        {updatingLocation && <Tag color="blue">Guardando ubicación…</Tag>}
        {selectedProduct && <Tag closable onClose={()=>setSelectedProduct(null)}>Seleccionado: {itemName(selectedProduct)}</Tag>}
      </Toolbar>
      <Legend>
        <Tag color="cyan">Racks 01–16</Tag>
        <Tag color="cyan">Racks 18–25 / 30–33 · acceso lateral</Tag>
        <Tag color="orange">CONTROL MAX · 10 × 3 × 2 = 60 pallets</Tag>
        <Tag color="green">Pallet ocupado</Tag>
        <Tag>Posición libre</Tag>
        <Tag color="red">Entrada / salidas de emergencia</Tag>
      </Legend>
    </Header>

    <Building>
      <TopWall/><BottomWall/><VerticalWall/>
      <FloorTitle>GALPÓN · MAPA DE UBICACIONES</FloorTitle>

      <Entry style={{left:'4%',top:'-1px'}}>ENTRADA</Entry>
      <Emergency style={{right:'-1px',top:'30%'}}>SALIDA</Emergency>
      <Emergency style={{left:'10%',bottom:'-1px'}}>EMERGENCIA</Emergency>
      <Emergency style={{left:'38%',bottom:'-1px'}}>EMERGENCIA</Emergency>
      <Emergency style={{left:'88%',bottom:'-1px'}}>EMERGENCIA</Emergency>

      {renderControl()}
      <Label style={{left:'3%',top:'10%'}} color="#ffb44f">ESPACIO PARA CONTROL MAX</Label>
      <Label style={{left:'32%',top:'5%'}} color="#3ce1d2">RACKS DEL 1 AL 16</Label>
      <Zone style={{left:'27%',top:'8%',width:'43%',height:'20%'}} border="#27d5c6" bg="rgba(39,213,198,.025)"/>

      <RackStrip style={{left:'28%',top:'12%',width:'41%',height:'15%',gap:'5px'}}>
        {racksFront.map((rack,i)=>renderRackMini(rack,i,false))}
      </RackStrip>

      <RackGroupTitle style={{left:'25%',top:'54%'}}>RACKS 18–25 · ACCESO LATERAL</RackGroupTitle>
      <RackStrip style={{left:'25%',top:'58%',width:'43%',height:'19%',gap:'12px'}}>
        {racksSide.map((rack,i)=>renderRackMini(rack,i,true))}
      </RackStrip>
      <AccessMark style={{left:'67%',top:'61%'}}>MULA →</AccessMark>

      <RackGroupTitle style={{left:'71%',top:'5%'}}>RACKS 26–29</RackGroupTitle>
      <RackStrip style={{left:'72%',top:'10%',width:'24%',height:'20%',gap:'12px'}}>
        {racksFront2.map((rack,i)=>renderRackMini(rack,i,false))}
      </RackStrip>

      <RackGroupTitle style={{left:'71%',top:'54%'}}>RACKS 30–33 · ACCESO LATERAL</RackGroupTitle>
      <RackStrip style={{left:'72%',top:'58%',width:'24%',height:'19%',gap:'13px'}}>
        {racksSide2.map((rack,i)=>renderRackMini(rack,i,true))}
      </RackStrip>
      <AccessMark style={{right:'2%',top:'62%'}}>← MULA</AccessMark>

      <Label style={{left:'69.5%',top:'42%'}} color="#d6d6d6">PARED</Label>
      <Label style={{left:'76%',bottom:'4%'}} color="#aaa">SALIDAS DE EMERGENCIA</Label>
    </Building>

    <Card style={{marginTop:16}} title={<><DragOutlined/> Productos disponibles para ubicar</>} extra={<span>{filteredProducts.length} productos</span>}>
      <p style={{fontSize:12,color:'#66736a'}}>Arrastrá un producto sobre una posición libre. También podés hacer clic en un producto y después en la posición. Para mover un pallet, arrastrá la celda verde a otra posición.</p>
      <Unassigned>{filteredProducts.map(p=><ProductCard key={`${p.categoria}-${p._id}`} draggable onDragStart={()=>{setDragged(`PRODUCT:${p._id}`); setSelectedProduct(p);}} onClick={()=>setSelectedProduct(p)}><b>{itemName(p)}</b><div>Lote: {itemLot(p)||'—'}</div><div>Stock: {p.cantidad ?? '—'} {p.unidad||''}</div></ProductCard>)}</Unassigned>
    </Card>

    <Modal open={!!detail} title={detail?.rack ? `RACK ${String(detail.rack).padStart(2,'0')} · 12 posiciones` : detail?.id} onCancel={()=>setDetail(null)} footer={detail?.product?.length ? [<Button key="del" danger icon={<DeleteOutlined/>} onClick={()=>{ if(detail.rack){ const next={...occupied}; detail.product.forEach(p=>delete next[p.slot]); setMap({...state,occupied:next}); } else { clear(detail.id); } setDetail(null); }}>Liberar posiciones</Button>,<Button key="close" onClick={()=>setDetail(null)}>Cerrar</Button>] : <Button onClick={()=>setDetail(null)}>Cerrar</Button>}>
      {detail?.rack ? <>
        <p><b>Capacidad:</b> 12 pallets · <b>Acceso:</b> {detail.rack>=18?'lateral con mula':'frente'}</p>
        {detail.product?.length ? detail.product.map((p,i)=><div key={`${p.slot}-${i}`} style={{padding:'7px 0',borderBottom:'1px solid #eee'}}><b>{p.nombre}</b><div>Ubicación: {p.slot}</div><div>Lote: {p.lote || '—'}</div></div>) : <p>No hay pallets ubicados en este rack.</p>}
      </> : detail?.product?.length ? <><p><b>Pallets apilados:</b> {detail.product.length}/2</p>{detail.product.map((p,i)=><div key={i} style={{padding:'7px 0',borderBottom:'1px solid #eee'}}><b>{i+1}. {p.nombre}</b><div>Lote: {p.lote || '—'}</div><div>Categoría: {p.categoria}</div></div>)}</> : <p>Posición libre. Seleccioná un producto y luego esta posición para ubicarlo.</p>}
    </Modal>
  </Wrapper>;
}
