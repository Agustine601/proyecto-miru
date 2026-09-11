import React, { useState } from 'react';
import styled from 'styled-components';

import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  InputNumber,
} from 'antd';

import { EditOutlined } from '@ant-design/icons';

import { useUpdateItemMutation } from '../../services/items.js';

const StyledButton = styled(Button)`
  margin-top: 1rem;
  margin-right: 1rem;
`;

const UpdateItem = (props) => {
  const [visible, setVisible] = useState(false);

  const [updateItem] = useUpdateItemMutation();

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [formula, setFormula] = useState('');
  const [cas, setCas] = useState('');
  const [lote, setLote] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cantidad, setCantidad] = useState();
  const [unidad, setUnidad] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ultimoMantenimiento, setUltimoMantenimiento] =
    useState('');

  const handleSubmit = async () => {
    if (!categoria) {
      return;
    }

    const updateInfo = {
      id: props.id,
      categoria,
      nombre,
      formula,
      cas,
      lote,
      proveedor,
      vencimiento,
      cantidad,
      unidad,
      ubicacion,
      descripcion,
      ultimoMantenimiento,
    };

    console.log('Producto actualizado:', updateInfo);

    await updateItem(updateInfo);

    setVisible(false);
  };

  const limpiarFormulario = () => {
    setNombre('');
    setCategoria('');
    setFormula('');
    setCas('');
    setLote('');
    setProveedor('');
    setVencimiento('');
    setCantidad();
    setUnidad('');
    setUbicacion('');
    setDescripcion('');
    setUltimoMantenimiento('');
  };

  const abrirModal = () => {
    limpiarFormulario();
    setVisible(true);
  };

  return (
    <div>
      <StyledButton
        type="default"
        icon={<EditOutlined />}
        size="default"
        onClick={abrirModal}
      >
        Editar
      </StyledButton>

      <Modal
        title="Editar producto"
        centered
        visible={visible}
        onOk={handleSubmit}
        onCancel={() => setVisible(false)}
        width={850}
        okText="Guardar cambios"
        cancelText="Cancelar"
      >
        <Form
          labelCol={{
            span: 6,
          }}
          wrapperCol={{
            span: 16,
          }}
          layout="horizontal"
        >
          {/* CATEGORÍA */}

          <Form.Item label="Categoría" required>
            <Select
              placeholder="Seleccione una categoría"
              value={categoria || undefined}
              onChange={(value) => setCategoria(value)}
            >
              <Select.Option value="consumables">
                🌱 Semilla
              </Select.Option>

              <Select.Option value="reagents">
                🧪 Agroquímico
              </Select.Option>

              <Select.Option value="equipment">
                📦 Otros insumos
              </Select.Option>
            </Select>
          </Form.Item>

          {/* NOMBRE */}

          <Form.Item label="Nombre">
            <Input
              placeholder="Nombre del producto"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Form.Item>

          {/* PRODUCTOS QUÍMICOS */}

          {categoria === 'reagents' && (
            <>
              <Form.Item label="Fórmula química">
                <Input
                  placeholder="Ejemplo: HCl"
                  value={formula}
                  onChange={(e) =>
                    setFormula(e.target.value)
                  }
                />
              </Form.Item>

              <Form.Item label="Número CAS">
                <Input
                  placeholder="Ejemplo: 7647-01-0"
                  value={cas}
                  onChange={(e) =>
                    setCas(e.target.value)
                  }
                />
              </Form.Item>
            </>
          )}

          {/* LOTE */}

          {categoria !== 'equipment' && (
            <Form.Item label="Lote">
              <Input
                placeholder="Número de lote"
                value={lote}
                onChange={(e) =>
                  setLote(e.target.value)
                }
              />
            </Form.Item>
          )}

          {/* PROVEEDOR */}

          <Form.Item label="Proveedor">
            <Input
              placeholder="Nombre del proveedor"
              value={proveedor}
              onChange={(e) =>
                setProveedor(e.target.value)
              }
            />
          </Form.Item>

          {/* VENCIMIENTO */}

          {categoria !== 'equipment' && (
            <Form.Item label="Vencimiento">
              <Input
                type="date"
                value={vencimiento}
                onChange={(e) =>
                  setVencimiento(e.target.value)
                }
              />
            </Form.Item>
          )}

          {/* CANTIDAD */}

          {categoria !== 'equipment' && (
            <Form.Item label="Cantidad">
              <InputNumber
                min={0}
                value={cantidad}
                onChange={(value) =>
                  setCantidad(value)
                }
                style={{
                  width: '100%',
                }}
              />
            </Form.Item>
          )}

          {/* UNIDAD */}

          {categoria !== 'equipment' && (
            <Form.Item label="Unidad">
              <Select
                placeholder="Seleccione una unidad"
                value={unidad || undefined}
                onChange={(value) =>
                  setUnidad(value)
                }
              >
                <Select.Option value="unidades">
                  Unidades
                </Select.Option>

                <Select.Option value="ml">
                  Mililitros (mL)
                </Select.Option>

                <Select.Option value="litros">
                  Litros (L)
                </Select.Option>

                <Select.Option value="gramos">
                  Gramos (g)
                </Select.Option>

                <Select.Option value="kilogramos">
                  Kilogramos (kg)
                </Select.Option>
              </Select>
            </Form.Item>
          )}

          {/* UBICACIÓN */}

          <Form.Item label="Ubicación">
            <Input
              placeholder="Ejemplo: Estante A-03"
              value={ubicacion}
              onChange={(e) =>
                setUbicacion(e.target.value)
              }
            />
          </Form.Item>

          {/* MANTENIMIENTO */}

          {categoria === 'equipment' && (
            <Form.Item label="Último mantenimiento">
              <Input
                type="date"
                value={ultimoMantenimiento}
                onChange={(e) =>
                  setUltimoMantenimiento(e.target.value)
                }
              />
            </Form.Item>
          )}

          {/* DESCRIPCIÓN */}

          <Form.Item label="Descripción">
            <Input.TextArea
              rows={3}
              placeholder="Descripción del producto..."
              value={descripcion}
              onChange={(e) =>
                setDescripcion(e.target.value)
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UpdateItem;
