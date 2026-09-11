# MIRÚ — QR final

Esta versión fuerza la actualización del PWA (cache `miru-pwa-v4-qr`) y carga `qr-runtime.js?v=4`.

El QR se muestra dentro de **Agregar producto** y se genera automáticamente como `MIRU-...`.

El endpoint `/qr` genera el PNG en el servidor usando Python + qrcode si Python está disponible; si no, el navegador intenta el generador externo como respaldo.

El escáner usa el lector ZXing existente y, cuando el navegador soporta `BarcodeDetector`, también tiene un lector nativo de QR/códigos de barras.
