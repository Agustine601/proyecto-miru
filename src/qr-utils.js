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

export const extraerGS1 = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return {};

  const result = { codigoBarras: raw };
  const normalized = raw.replace(/\u001d/g, '<GS>');

  // GS1 frecuentes en etiquetas de pallets:
  // 01 = GTIN, 10 = lote, 17 = vencimiento, 30/37 = cantidad.
  const gtin = normalized.match(/(?:^|<GS>)\(?(01)\)?([0-9]{14})/);
  if (gtin) result.gtin = gtin[2];

  const lotParen = normalized.match(/\(10\)(.*?)(?=\(17\)|\(30\)|\(37\)|$)/);
  if (lotParen) result.lote = lotParen[1].trim();
  if (!result.lote) {
    const lotPlain = normalized.match(/(?:^|<GS>)10([^<]{1,30}?)(?=(?:<GS>)?(?:17|30|37)|$)/);
    if (lotPlain) result.lote = lotPlain[1].trim();
  }

  const expParen = normalized.match(/\(17\)([0-9]{6})/);
  const expPlain = normalized.match(/(?:^|<GS>)17([0-9]{6})/);
  const exp = expParen || expPlain;
  if (exp) {
    const yy = Number(exp[1].slice(0, 2));
    const mm = exp[1].slice(2, 4);
    const dd = exp[1].slice(4, 6);
    result.vencimiento = `20${String(yy).padStart(2, '0')}-${mm}-${dd}`;
  }

  const qtyParen = normalized.match(/\((30|37)\)([0-9]{1,8})/);
  const qtyPlain = normalized.match(/(?:^|<GS>)(30|37)([0-9]{1,8})(?=<GS>|$)/);
  const qty = qtyParen || qtyPlain;
  if (qty) result.cantidad = Number(qty[2]);

  return result;
};
