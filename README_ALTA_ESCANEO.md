# MIRÚ — Alta de productos por escaneo

La pantalla **Agregar producto** ahora incluye **Escanear QR / código de barras**.

## Flujo
1. Abrir **Agregar producto**.
2. Pulsar **Escanear QR / código de barras**.
3. Leer la etiqueta con la cámara.
4. MIRÚ completa automáticamente los datos disponibles.
5. Revisar/completar los datos que la etiqueta no codifique.
6. Guardar el producto.

## QR de logística
Si el QR contiene una URL pública de Logística Rojas, MIRÚ intenta consultar la composición y cargar producto, código, lote, cantidad, orden y datos de destinatario/destino cuando están disponibles.

## Códigos GS1
Se reconocen los identificadores más habituales:
- AI 01: GTIN
- AI 10: lote
- AI 17: vencimiento
- AI 30/37: cantidad, cuando viene codificada

El código de barras no siempre contiene el nombre del producto o la cantidad. En esos casos MIRÚ conserva el código leído y deja esos campos para completar.

## Semillas
Al seleccionar **Semilla**, se pueden registrar **Solicitante** y **Destino**. Si el QR trae esos datos, MIRÚ intenta completarlos automáticamente.


# MIRÚ · Escáner QR mejorado

Esta versión integra el escáner dentro del bundle de MIRÚ con `@zxing/browser`, sin depender del CDN de ZXing.

### Cambios incluidos

- Cámara trasera en iPhone/Android con `getUserMedia` desde una acción directa del usuario.
- Interfaz de escaneo a pantalla completa.
- Recuadro grande para posicionar el QR.
- Línea de escaneo animada.
- Indicaciones de luz, etiqueta plana y teléfono vertical.
- Vibración al detectar un código cuando el dispositivo lo permite.
- Fallback manual si la cámara o el lector no están disponibles.
- `BarcodeDetector` nativo cuando el navegador lo soporta y ZXing como fallback.
- Lectura de QR, EAN, UPC, Code 128, Code 39, ITF y Data Matrix cuando el navegador/lector lo admite.
- Análisis de QR con JSON, URL, campos `clave: valor` y GS1.
- Visualización del contenido original completo y de todos los campos detectados.
- Conservación de los datos originales en MongoDB dentro de `datosQR`.
- Consulta de QR de Logística Rojas desde el backend para evitar problemas de CORS.
- Alta del producto + creación real del pallet en MongoDB.
- Luego del alta, MIRÚ lleva el pallet al mapa del galpón para elegir su ubicación física.
- Corrección del flujo de respuestas de las rutas POST/PUT/DELETE de productos.
- `webpack.config.js` agregado para que el build sea reproducible.
- Limpieza de `index.html`: se eliminan scripts CDN/Google antiguos y la carga manual duplicada de `bundle.js`.
- Las claves `.pem` locales no forman parte de esta entrega.

### Probar

```powershell
npm install
npm run build
npm start
```

Si el puerto 3000 está ocupado:

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm start
```

Para probar la cámara en iPhone en producción usá la URL HTTPS de Render. En local, `localhost` también es un contexto seguro para `getUserMedia`.
