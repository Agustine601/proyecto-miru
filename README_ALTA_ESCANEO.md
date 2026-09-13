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
