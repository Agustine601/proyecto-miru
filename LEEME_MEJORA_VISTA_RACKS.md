# MIRÚ — Mejora de visualización de racks

## Qué cambia
- Al seleccionar un rack en el mapa operativo actual, se abre un panel amplio (hasta 960 px) sin navegar fuera del mapa.
- El panel muestra un resumen de posiciones, ocupación y pallets.
- Incorpora una vista frontal en cuadrícula de cuatro columnas. Cada posición muestra su identificador y, cuando el inventario ya tiene datos guardados, producto, lote y cantidad.
- Se puede seguir usando la ficha operativa y el botón de cambio de stock que ya existían.
- Los racks dibujados en el plano de Galpones 3 y 4 ahora responden al clic y abren una vista frontal informativa.

## Importante sobre Galpones 3 y 4
En esta versión el plano de G3/G4 continúa siendo una previsualización física: sus posiciones todavía no están conectadas al almacenamiento real de stock. Por eso la ventana lo aclara y no permite modificar cantidades ni liberar posiciones desde esa vista. No se inventan productos, lotes ni cantidades.

## Archivos modificados
- `src/components/Warehouse/WarehouseMap.jsx`

## Instalación
1. Hacé una copia de seguridad de tu carpeta actual del proyecto.
2. Cerrá el servidor de desarrollo si está ejecutándose.
3. Extraé este ZIP sobre una copia del proyecto, conservando la estructura de carpetas y reemplazando los archivos cuando Windows lo pregunte.
4. No reemplaces tu `.env` local: este ZIP no lo incluye. Conservá también tus certificados locales si los necesitás para HTTPS.
5. En PowerShell, dentro de la carpeta del proyecto, ejecutá `npm install` solamente si npm informa que faltan dependencias; esta mejora no agrega dependencias nuevas.
6. Ejecutá `npm run dev` y probá primero un rack que ya tenga pallets registrados.

## Verificación
Se verificó la sintaxis JSX/JavaScript del archivo modificado mediante el transpilador TypeScript disponible en el entorno. No se pudo ejecutar el build completo de Webpack porque el ZIP no contiene `node_modules` y no se instaló el entorno completo. Por lo tanto, probalo primero sobre una copia y no borres tu versión anterior.
