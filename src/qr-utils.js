export const normalizarCodigo = (value) => {
  if (value == null) return '';
  return String(value)
    .trim()
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^MIRU[:\-_/]*/i, '')
    .trim()
    .toLowerCase();
};

export const extraerCodigoQR = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    for (const key of ['codigoQR', 'codigo', 'code', 'id']) {
      const v = url.searchParams.get(key);
      if (v) return v.trim();
    }
    return url.pathname.split('/').filter(Boolean).pop()?.trim() || raw;
  } catch (_) {
    return raw;
  }
};

export const coincideCodigo = (producto, escaneado) => {
  const buscado = normalizarCodigo(extraerCodigoQR(escaneado));
  if (!buscado) return false;
  return [producto?.codigoQR, producto?.codigoBarras, producto?.codigo]
    .filter(Boolean)
    .some((v) => normalizarCodigo(v) === buscado);
};
