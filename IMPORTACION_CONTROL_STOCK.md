# Importación de Control Stock a MIRÚ

## Distribución física
- `07. SEMILLAS\07.05 SEMILLAS DE MAIZ` → **GALPÓN DE SEMILLAS**.
- Todo lo demás → **GALPÓN DE AGROQUÍMICOS**.

## Categorías en MIRÚ
- Semillas → `consumables` / **🌱 Semilla**.
- Herbicidas, insecticidas, fungicidas, inoculantes/curasemillas, coadyuvantes y fertilizantes → `reagents` / **🧪 Agroquímico**.
- Silo bolsa, cereales y varios → `equipment` / **📦 Otros insumos**.

Se cargan solamente registros con existencia mayor a cero. Los registros con existencia cero o negativa no se cargan como stock físico.

Con `.env` configurado con `MONGO_URI`, ejecutar:

```powershell
npm run import:stock
```

El importador actualiza coincidencias por nombre + galpón + centro operativo y reemplaza sus lotes/stock por los datos del Excel.

El Excel original no contiene rack/posición, por lo que la ubicación inicial queda en el galpón. No se inventan racks.
