# MIRÚ — Escáner y Hojas de trabajo

Se agregaron dos funciones nuevas:

## 1. Escanear producto
- Lee códigos de barras y QR con la cámara.
- Busca el código contra `codigoBarras` y `codigoQR` del inventario.
- También permite escribir el código manualmente.
- Los códigos se cargan desde **Agregar producto**.
- Los lectores USB de código de barras que funcionan como teclado siguen siendo compatibles.

> La cámara del navegador necesita un contexto seguro. En PC, `localhost` funciona; para usar la cámara desde el iPhone mediante la IP de la PC, conviene publicar MIRÚ con HTTPS.

El lector ZXing se carga desde UNPKG para evitar agregar otra instalación npm al proyecto.

## 2. Hojas de trabajo / Despachos
- Se crea un pedido sin descontar stock.
- Se agregan productos, cantidades y lotes.
- El encargado de despacho pulsa **Despachar y descontar stock**.
- En ese momento MIRÚ descuenta el lote y el stock general.
- Se registra automáticamente una salida en Movimientos.
- La hoja queda como pendiente, parcial o completa.

## Arranque

Después de copiar el proyecto a la PC:

```powershell
npm install --legacy-peer-deps
npm run build
npm start
```

No se incluye `.env` por seguridad. Crear el archivo `.env` en la raíz con:

```env
MONGO_URI=TU_CONEXION_DE_MONGODB_ATLAS
```
