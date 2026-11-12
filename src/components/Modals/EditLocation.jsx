import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useUpdateItemMutation } from '../../services/items';

const EditLocation = ({ item, categoria }) => {
  const [visible, setVisible] = useState(false);
  const [ubicacion, setUbicacion] = useState(item?.ubicacion || '');
  const [updateItem, { isLoading }] = useUpdateItemMutation();

  useEffect(() => {
    setUbicacion(item?.ubicacion || '');
  }, [item?.ubicacion]);

  const guardar = async () => {
    const id = item?._id || item?.id;
    if (!id || !categoria) {
      message.error('No se pudo identificar el producto.');
      return;
    }

    try {
      await updateItem({ id, categoria, ubicacion: ubicacion.trim() }).unwrap();
      message.success('Ubicación del producto actualizada.');
      setVisible(false);
    } catch (error) {
      message.error(error?.data?.error || 'No se pudo actualizar la ubicación.');
    }
  };

  return (
    <>
      <Button
        icon={<EnvironmentOutlined />}
        onClick={(event) => {
          event.stopPropagation();
          setUbicacion(item?.ubicacion || '');
          setVisible(true);
        }}
      >
        Editar ubicación
      </Button>
      <Modal
        title="Editar ubicación del producto"
        visible={visible}
        onCancel={() => setVisible(false)}
        onOk={guardar}
        okText="Guardar ubicación"
        cancelText="Cancelar"
        confirmLoading={isLoading}
        destroyOnClose
      >
        <div style={{ marginBottom: 10 }}>
          <b>{item?.nombre || 'Producto'}</b>
        </div>
        <Input
          autoFocus
          value={ubicacion}
          onChange={(event) => setUbicacion(event.target.value)}
          placeholder="Ej.: Galpón 3 · Rack R08 · Posición P2"
          onPressEnter={guardar}
        />
        <div style={{ color: '#718078', fontSize: 12, marginTop: 8 }}>
          Podés escribir una ubicación libre o una referencia física del galpón.
        </div>
      </Modal>
    </>
  );
};

export default EditLocation;
