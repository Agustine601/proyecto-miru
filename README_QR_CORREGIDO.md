# MIRÚ — QR corregido

## Qué se corrigió

1. El formulario **Agregar producto** genera automáticamente un código `MIRU-...`.
2. El código queda en el campo **Código QR** y se guarda junto al producto.
3. Se muestra un bloque visible **QR DEL PRODUCTO** con el QR que se va a guardar.
4. Se puede generar otro QR e imprimirlo.
5. El escáner usa ZXing y permite QR/códigos de barras.
6. El escáner busca también en **Otros insumos**.
7. Se agregó `qr-runtime.js` para que la interfaz muestre el QR incluso si el bundle compilado no se regeneró.
8. Se actualizó el cache de la PWA para evitar que el navegador conserve la versión anterior.

## MUY IMPORTANTE si seguís viendo la versión vieja

MIRÚ es una PWA y el navegador puede tener guardado el bundle anterior. Después de instalar esta versión, cerrá todas las pestañas de MIRÚ y hacé una recarga forzada (Ctrl+Shift+R). Si sigue igual, desde las herramientas del navegador eliminá los datos del sitio/Service Worker de MIRÚ y volvé a abrirlo.

En producción, ejecutá el servidor con `npm start` desde la carpeta del proyecto.
