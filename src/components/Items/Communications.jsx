import React, { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Row,
  Select,
  Spin,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  PushpinFilled,
  PushpinOutlined,
  SendOutlined,
  MessageOutlined,
  TeamOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import {
  useGetCommunicationsQuery,
  useSendCommunicationMutation,
  useMarkCommunicationReadMutation,
  useToggleCommunicationPinMutation,
} from '../../services/communications';

const AREAS = ['Recepción', 'Ventas', 'Depósito', 'Despacho', 'Administración'];
const PRIORITIES = [
  { value: 'normal', label: 'Normal', color: 'default' },
  { value: 'importante', label: 'Importante', color: 'gold' },
  { value: 'urgente', label: 'Urgente', color: 'red' },
];

const priorityMeta = (value) =>
  PRIORITIES.find((p) => p.value === value) || PRIORITIES[0];

const Communications = ({ compact = false }) => {
  const userState = useSelector((state) => state.user || {});
  const [area, setArea] = useState(AREAS[0]);
  const [recipientArea, setRecipientArea] = useState(AREAS[1]);
  const [priority, setPriority] = useState('normal');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todos');
  const [replyTo, setReplyTo] = useState(null);

  const sender = userState.user || userState.email || 'Usuario MIRÚ';
  const senderEmail = userState.email || '';

  const {
    data: messages = [],
    isLoading,
    isError,
    refetch,
  } = useGetCommunicationsQuery(undefined, { pollingInterval: 10000 });

  const [sendMessage, { isLoading: sending }] = useSendCommunicationMutation();
  const [markRead] = useMarkCommunicationReadMutation();
  const [togglePin] = useToggleCommunicationPinMutation();

  const unread = useMemo(
    () => messages.filter((m) => m.recipientArea === area && !m.read).length,
    [messages, area]
  );

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...messages]
      .filter((m) => {
        const matchesText =
          !q ||
          String(m.message || '').toLowerCase().includes(q) ||
          String(m.sender || '').toLowerCase().includes(q) ||
          String(m.senderArea || '').toLowerCase().includes(q) ||
          String(m.recipientArea || '').toLowerCase().includes(q);

        const matchesArea =
          filterArea === 'todos' ||
          m.senderArea === filterArea ||
          m.recipientArea === filterArea;

        const matchesPriority =
          filterPriority === 'todos' ||
          (m.priority || 'normal') === filterPriority;

        return matchesText && matchesArea && matchesPriority;
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [messages, search, filterArea, filterPriority]);

  const enviar = async () => {
    const clean = text.trim();
    if (!clean) return message.warning('Escribí un mensaje antes de enviarlo.');

    try {
      await sendMessage({
        sender,
        senderEmail,
        senderArea: area,
        recipientArea: replyTo?.senderArea || recipientArea,
        message: clean,
        priority,
        parentId: replyTo?._id || null,
      }).unwrap();

      setText('');
      setReplyTo(null);
      setPriority('normal');
      message.success(`Mensaje enviado a ${replyTo?.senderArea || recipientArea}.`);
    } catch (error) {
      message.error(error?.data?.error || 'No se pudo enviar el mensaje.');
    }
  };

  const abrirMensaje = async (item) => {
    if (!item.read && item.recipientArea === area) {
      try {
        await markRead(item._id).unwrap();
      } catch (_) {}
    }
  };

  const fijar = async (item) => {
    try {
      await togglePin({ id: item._id, pinned: !item.pinned }).unwrap();
    } catch (error) {
      message.error(error?.data?.error || 'No se pudo actualizar el mensaje.');
    }
  };

  const comenzarRespuesta = (item) => {
    setReplyTo(item);
    setRecipientArea(item.senderArea || AREAS[0]);
    setText('');
    window.setTimeout(() => document.getElementById('miru-communication-text')?.focus(), 50);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: compact ? 1200 : 1180,
        margin: compact ? '0 auto' : '18px auto 40px',
        padding: compact ? 0 : '0 4px',
        boxSizing: 'border-box',
      }}
    >
      {!compact && (
        <Card
          bordered={false}
          style={{
            marginBottom: 16,
            borderRadius: 18,
            background: 'linear-gradient(135deg,#285832,#397348)',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(40,88,50,.14)',
          }}
          bodyStyle={{ padding: '20px 22px' }}
        >
          <div style={{ fontSize: 12, opacity: .82, fontWeight: 700 }}>MIRÚ · COMUNICACIÓN INTERNA</div>
          <h1 style={{ color: '#fff', margin: '5px 0 0', fontSize: 'clamp(25px, 5vw, 34px)' }}>
            Intercomunicador
          </h1>
          <div style={{ opacity: .9, marginTop: 5 }}>
            Comunicación rápida entre los sectores de la empresa.
          </div>
        </Card>
      )}

      {isError && (
        <Alert
          type="warning"
          showIcon
          message="No se pudieron cargar las comunicaciones"
          description="Verificá que el servidor de MIRÚ esté conectado a MongoDB."
          style={{ marginBottom: 14, borderRadius: 12 }}
        />
      )}

      <Row gutter={[14, 14]} align="top">
        <Col xs={24} lg={9}>
          <Card
            bordered={false}
            style={{ borderRadius: 16, height: '100%' }}
            title={<><SendOutlined /> {replyTo ? 'Responder mensaje' : 'Nuevo mensaje'}</>}
          >
            {replyTo && (
              <Alert
                type="info"
                showIcon
                closable
                onClose={() => setReplyTo(null)}
                message={`Respondiendo a ${replyTo.sender || 'Usuario'} · ${replyTo.senderArea || ''}`}
                description={String(replyTo.message || '').slice(0, 140)}
                style={{ marginBottom: 12 }}
              />
            )}

            <div style={{ marginBottom: 7, fontWeight: 600 }}>Desde</div>
            <Select
              value={area}
              onChange={setArea}
              style={{ width: '100%', marginBottom: 12 }}
              options={AREAS.map((x) => ({ value: x, label: x }))}
            />

            <div style={{ marginBottom: 7, fontWeight: 600 }}>Para</div>
            <Select
              value={replyTo?.senderArea || recipientArea}
              onChange={setRecipientArea}
              disabled={Boolean(replyTo)}
              style={{ width: '100%', marginBottom: 12 }}
              options={AREAS.filter((x) => x !== area).map((x) => ({ value: x, label: x }))}
            />

            <div style={{ marginBottom: 7, fontWeight: 600 }}>Prioridad</div>
            <Select
              value={priority}
              onChange={setPriority}
              style={{ width: '100%', marginBottom: 12 }}
              options={PRIORITIES.map((p) => ({
                value: p.value,
                label: <span><Tag color={p.color}>{p.label}</Tag></span>,
              }))}
            />

            <Input.TextArea
              id="miru-communication-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              showCount
              autoSize={{ minRows: 4, maxRows: 8 }}
              placeholder="Ej.: Preparar el pedido de agroquímicos para recepción..."
              onPressEnter={(e) => {
                if ((e.ctrlKey || e.metaKey) && !e.shiftKey) enviar();
              }}
            />

            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={enviar}
              block
              size="large"
              style={{ marginTop: 11, borderRadius: 10, height: 46 }}
            >
              Enviar mensaje
            </Button>

            <div style={{ marginTop: 8, color: '#718074', fontSize: 11 }}>
              Ctrl + Enter también envía.
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={15}>
          <Card
            bordered={false}
            style={{ borderRadius: 16 }}
            title={
              <span>
                <MessageOutlined /> Bandeja{' '}
                <Badge count={unread} style={{ marginLeft: 7 }} />
              </span>
            }
            extra={
              <Tooltip title="Actualizar">
                <Button icon={<ReloadOutlined />} size="small" onClick={() => refetch()} />
              </Tooltip>
            }
          >
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col xs={24} sm={12}>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar mensajes..."
                />
              </Col>
              <Col xs={12} sm={6}>
                <Select
                  value={filterArea}
                  onChange={setFilterArea}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'todos', label: 'Todos los sectores' },
                    ...AREAS.map((x) => ({ value: x, label: x })),
                  ]}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Select
                  value={filterPriority}
                  onChange={setFilterPriority}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'todos', label: 'Prioridad' },
                    ...PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
                  ]}
                />
              </Col>
            </Row>

            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Tag icon={<TeamOutlined />}>{area}</Tag>
              <span style={{ fontSize: 12, color: '#718074' }}>
                {visibles.length} mensaje{visibles.length === 1 ? '' : 's'}
              </span>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: 35 }}><Spin /></div>
            ) : visibles.length === 0 ? (
              <Empty description={messages.length ? 'No hay mensajes que coincidan' : 'Todavía no hay mensajes'} />
            ) : (
              <List
                itemLayout="vertical"
                dataSource={visibles}
                split={false}
                renderItem={(item) => {
                  const recibido = item.recipientArea === area;
                  const meta = priorityMeta(item.priority);
                  const urgente = item.priority === 'urgente';

                  return (
                    <List.Item
                      onClick={() => abrirMensaje(item)}
                      style={{
                        cursor: recibido && !item.read ? 'pointer' : 'default',
                        background: urgente ? '#fff7f6' : recibido && !item.read ? '#f3f8f1' : '#fff',
                        borderRadius: 12,
                        padding: '12px 13px',
                        marginBottom: 8,
                        border: urgente ? '1px solid #ffd5cf' : '1px solid #edf1eb',
                        boxShadow: item.pinned ? '0 2px 10px rgba(40,88,50,.08)' : 'none',
                      }}
                    >
                      <List.Item.Meta
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <span>{recibido ? '📥' : '📤'} <strong>{item.sender || 'Usuario'}</strong></span>
                            <Tag>{recibido ? `Para ${area}` : `Para ${item.recipientArea}`}</Tag>
                            <Tag color={meta.color}>{meta.label}</Tag>
                            {item.pinned && <Tag color="green" icon={<PushpinFilled />}>Fijado</Tag>}
                            {recibido && !item.read && <Tag color="green">Nuevo</Tag>}
                          </div>
                        }
                        description={
                          <span style={{ fontSize: 11 }}>
                            {item.senderArea || 'Sector'} · {new Date(item.createdAt).toLocaleString('es-AR')}
                          </span>
                        }
                      />
                      <div style={{ color: '#2d3b30', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {item.message}
                      </div>

                      <div style={{ marginTop: 9, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          icon={<MessageOutlined />}
                          onClick={(e) => { e.stopPropagation(); comenzarRespuesta(item); }}
                        >
                          Responder
                        </Button>
                        <Button
                          size="small"
                          icon={item.pinned ? <PushpinFilled /> : <PushpinOutlined />}
                          onClick={(e) => { e.stopPropagation(); fijar(item); }}
                        >
                          {item.pinned ? 'Desfijar' : 'Fijar'}
                        </Button>
                      </div>

                      {item.parentId && (
                        <div style={{ marginTop: 7, color: '#718074', fontSize: 11 }}>
                          <PaperClipOutlined /> Respuesta a una comunicación anterior
                        </div>
                      )}
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Communications;
