import React from 'react';
import styled from 'styled-components';
import { Button, Modal } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

import { useResetSystemMutation } from '../../services/items';

const Wrapper = styled.div`
  width: 100%;
  max-width: 1000px;
  padding: 40px;
`;

const Title = styled.h1`
  margin-bottom: 8px;
  color: #23452b;
`;

const Subtitle = styled.p`
  color: #66736a;
  margin-bottom: 35px;
`;

const DangerZone = styled.div`
  padding: 25px;
  border: 1px solid #ffccc7;
  border-radius: 12px;
  background: #fff2f0;
  max-width: 700px;
`;

const DangerTitle = styled.h2`
  margin-top: 0;
  color: #cf1322;
`;

const Description = styled.p`
  color: #595959;
  line-height: 1.6;
`;

const ResetButton = styled(Button)`
  margin-top: 10px;
  height: 42px;
  border-radius: 8px !important;
  font-weight: 600;
`;

const Settings = () => {
    console.log('ESTOY EN EL SETTINGS NUEVO');
  const [resetSystem, { isLoading }] =
    useResetSystemMutation();
  const handleReset = () => {
    Modal.confirm({
      title: '¿Restablecer MIRÚ?',
      icon: <WarningOutlined />,
      content:
        'Esta acción eliminará los productos, lotes y movimientos del sistema. Esta acción no se puede deshacer.',
      okText: 'Continuar',
      cancelText: 'Cancelar',
      okType: 'danger',

      onOk: () => {
        Modal.confirm({
          title: 'Última confirmación',
          content:
            '¿Realmente querés borrar todos los datos del inventario?',
          okText: 'Sí, restablecer MIRÚ',
          cancelText: 'Cancelar',
          okType: 'danger',

          onOk: async () => {
            try {
              await resetSystem().unwrap();

              Modal.success({
                title: 'MIRÚ restablecido',
                content:
                  'Todos los productos, lotes y movimientos fueron eliminados correctamente.',
                okText: 'Aceptar',

                onOk: () => {
                  window.location.reload();
                },
              });
            } catch (error) {
              console.error(
                'Error al restablecer MIRÚ:',
                error
              );

              Modal.error({
                title: 'Error',
                content:
                  'No se pudo restablecer MIRÚ. Revisá que el servidor esté funcionando.',
                okText: 'Cerrar',
              });
            }
          },
        });
      },
    });
  };

  return (
    <Wrapper>
      <Title>⚙️ Configuración</Title>

      <Subtitle>
        Configuración general del sistema MIRÚ.
      </Subtitle>

      <DangerZone>
        <DangerTitle>
          Zona peligrosa
        </DangerTitle>

        <Description>
          Desde aquí podrás restablecer MIRÚ para
          comenzar nuevamente con el inventario.
        </Description>

        <Description>
          Se eliminarán los productos, lotes y
          movimientos registrados.
        </Description>

        <ResetButton
          danger
          type="primary"
          icon={<WarningOutlined />}
          loading={isLoading}
          onClick={handleReset}
        >
          {isLoading
            ? 'Restableciendo...'
            : 'Restablecer MIRÚ'}
        </ResetButton>
      </DangerZone>
    </Wrapper>
  );
};

export default Settings;

