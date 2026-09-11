import React from 'react';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal, Button } from 'antd';
import { useDeleteItemMutation } from '../../services/items';

const { confirm } = Modal;

const DeleteModal = (props) => {
  const [deleteItem] = useDeleteItemMutation();

  function showConfirm() {
    confirm({
      title: `¿Está seguro de que desea eliminar "${props.name}"?`,
      icon: <ExclamationCircleOutlined />,
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      okType: 'danger',

      onOk() {
        deleteItem({
          id: props.id,
          categoria: props.categoria,
        });
      },

      onCancel() {
        console.log('Eliminación cancelada');
      },
    });
  }

  return (
    <Button
      danger
      type="dashed"
      onClick={showConfirm}
      style={{ alignSelf: 'end' }}
    >
      Eliminar
    </Button>
  );
};

export default DeleteModal;