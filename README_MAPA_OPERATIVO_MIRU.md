# MIRÚ — Mapa operativo y cierre diario

Esta versión conserva la distribución del mapa y agrega:

- Operación de stock desde cada pallet.
- Retiro, consumo interno e ingreso.
- Actualización del saldo del pallet, lote y producto.
- Registro de `palletId` en cada movimiento cuando la operación sale desde el mapa.
- Cierre diario con resumen de entradas, retiros, consumos y saldo final por producto.
- El cierre no vuelve a descontar stock: consolida lo que ya fue registrado durante la jornada.
- Los límites físicos del mapa existentes (720 L y 960 kg en las zonas correspondientes) se mantienen.

## Después de reemplazar el proyecto

En la carpeta del proyecto:

```powershell
npm install --legacy-peer-deps
npm run build
npm start
```

Si MIRÚ se está ejecutando en desarrollo, reiniciá el servidor para que cargue las nuevas rutas.

### Flujo diario

1. Abrir el mapa.
2. Tocar un pallet.
3. Usar **⚡ Cambiar stock**.
4. Elegir Retirar / Consumo interno / Ingresar.
5. Confirmar.
6. Al terminar la jornada, usar **🌙 Cierre del día**.
7. El cierre guarda la fotografía de control y el saldo final; no duplica descuentos.

## Conversión automática de presentación

El mapa ahora toma la presentación desde `presentacion`, `descripcion` o `nombre` y calcula automáticamente el equivalente por unidad.

Ejemplo:
- Stock: 5.075 unidades
- Presentación: 15 L por unidad
- Equivalente: 76.125 L

Si se retiran 20 unidades:
- Nuevo stock: 5.055 unidades
- Equivalente: 75.825 L

La conversión no reemplaza ni altera la cantidad física almacenada: se utiliza como dato calculado para mostrar, registrar movimientos y preparar reportes.

## Movimiento rápido y distribución automática

- En el mapa se agregó **Movimiento rápido · Pedido / turno**.
- Permite cargar varias líneas de ingreso, retiro o consumo y confirmarlas juntas.
- En retiros/consumos sin lote seleccionado, el servidor distribuye la cantidad entre los pallets activos de los lotes disponibles del producto. Si se selecciona un lote, respeta ese lote. Cada tramo queda en el historial con producto, lote, pallet y ubicación.
- En ingresos se puede sumar a un pallet existente. Si no se selecciona pallet, se registra el ingreso en un lote (saldo pendiente de ubicar en el mapa).
- El resumen de operaciones se confirma en una sola acción. El servidor valida las cantidades antes de guardar; si no alcanza el stock, devuelve un error sin guardar las operaciones planificadas.
- El cambio de ubicación de pallets continúa usando la acción **Mover pallet** de la vista del rack; el traslado conserva saldo y lote.

Ruta nueva: `POST /movements/lote`.
