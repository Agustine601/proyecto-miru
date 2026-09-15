export const normalizarCodigo = (value) => {
  if (value == null) return '';

  return String(value)
    .trim()
    .toLowerCase();
};

export const extraerCodigoQR = (value) => {
  const raw = String(value || '').trim();

  if (!raw) return '';

  try {
    const url = new URL(raw);

    // Parámetros de consulta
    for (const key of ['codigoQR', 'codigo', 'code', 'id']) {
      const v = url.searchParams.get(key);
      if (v) {
        return v.trim();
      }
    }

    // QR de Logística Rojas:
    // https://logistica-rojas.com.ar/#/public-view/composition/6a5745febd29b055742cdf9d
    const hash = url.hash.replace(/^#\/?/, '').trim();

    if (hash) {
      const partes = hash.split('/').filter(Boolean);

      if (partes.length) {
        return partes[partes.length - 1].trim();
      }
    }

    // URL normal
    const partesPath = url.pathname
      .split('/')
      .filter(Boolean);

    if (partesPath.length) {
      return partesPath[partesPath.length - 1].trim();
    }

    return raw;
  } catch (error) {
    return raw;
  }
};

export const coincideCodigo = (producto, escaneado) => {
  const buscado = normalizarCodigo(
    extraerCodigoQR(escaneado)
  );

  if (!buscado) return false;

  const codigosProducto = [
    producto?.codigoQR,
    producto?.codigoBarras,
    producto?.codigo,
  ]
    .filter(Boolean)
    .map(normalizarCodigo);

  return codigosProducto.includes(buscado);
};
// Extrae datos habituales de etiquetas GS1.
// Soporta AI 01 (GTIN), 10 (lote), 17 (vencimiento),
// 30/37 (cantidad) y variantes con paréntesis o separadores.
export const extraerGS1 = (value) => {
  const raw = String(value || '').trim();
  const resultado = {
    gtin: '',
    lote: '',
    vencimiento: '',
    cantidad: 0,
  };

  if (!raw) return resultado;

  const limpio = raw.replace(/\u001d/g, '|');
  const tomar = (ai) => {
    const re = new RegExp(`(?:^|[|])${ai}([^|]+)`, 'i');
    const match = limpio.match(re);
    return match ? match[1].trim() : '';
  };

  resultado.gtin = tomar('01');
  resultado.lote = tomar('10');
  resultado.vencimiento = tomar('17');

  const cantidad = tomar('30') || tomar('37');
  if (cantidad) resultado.cantidad = Number(cantidad) || 0;

  // Variante legible: (01)XXXXXXXXXXXXXX(10)LOTE(17)YYMMDD...
  const parentesis = [...raw.matchAll(/\((01|10|17|30|37)\)([^()]+)/g)];
  for (const match of parentesis) {
    const ai = match[1];
    const valor = match[2].trim();
    if (ai === '01' && !resultado.gtin) resultado.gtin = valor;
    if (ai === '10' && !resultado.lote) resultado.lote = valor;
    if (ai === '17' && !resultado.vencimiento) resultado.vencimiento = valor;
    if ((ai === '30' || ai === '37') && !resultado.cantidad) resultado.cantidad = Number(valor) || 0;
  }

  if (resultado.vencimiento && /^\d{6}$/.test(resultado.vencimiento)) {
    const yy = Number(resultado.vencimiento.slice(0, 2));
    const mm = Number(resultado.vencimiento.slice(2, 4));
    const dd = Number(resultado.vencimiento.slice(4, 6));
    const year = 2000 + yy;
    if (mm >= 1 && mm <= 12) {
      resultado.vencimiento = `${year}-${String(mm).padStart(2, '0')}-${String(dd || 1).padStart(2, '0')}`;
    }
  }

  return resultado;
};
