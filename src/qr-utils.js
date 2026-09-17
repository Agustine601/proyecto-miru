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

    for (const key of ['codigoQR', 'codigo', 'code', 'id', 'gtin', 'lot', 'lote']) {
      const v = url.searchParams.get(key);
      if (v) return v.trim();
    }

    const hash = url.hash.replace(/^#\/?/, '').trim();

    if (hash) {
      const partes = hash.split('/').filter(Boolean);
      if (partes.length) return partes[partes.length - 1].trim();
    }

    const partesPath = url.pathname.split('/').filter(Boolean);
    if (partesPath.length) return partesPath[partesPath.length - 1].trim();

    return raw;
  } catch (_) {
    return raw;
  }
};

export const coincideCodigo = (producto, escaneado) => {
  const buscado = normalizarCodigo(extraerCodigoQR(escaneado));
  if (!buscado) return false;

  const codigosProducto = [
    producto?.codigoQR,
    producto?.codigoQRExterno,
    producto?.codigoBarras,
    producto?.codigo,
  ]
    .filter(Boolean)
    .map(normalizarCodigo);

  return codigosProducto.includes(buscado);
};

// Extrae datos habituales de GS1.
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

  const parentesis = [...raw.matchAll(/\((01|10|17|30|37)\)([^()]+)/g)];
  for (const match of parentesis) {
    const ai = match[1];
    const valor = match[2].trim();

    if (ai === '01' && !resultado.gtin) resultado.gtin = valor;
    if (ai === '10' && !resultado.lote) resultado.lote = valor;
    if (ai === '17' && !resultado.vencimiento) resultado.vencimiento = valor;
    if ((ai === '30' || ai === '37') && !resultado.cantidad) {
      resultado.cantidad = Number(valor) || 0;
    }
  }

  if (resultado.vencimiento && /^\d{6}$/.test(resultado.vencimiento)) {
    const yy = Number(resultado.vencimiento.slice(0, 2));
    const mm = Number(resultado.vencimiento.slice(2, 4));
    const dd = Number(resultado.vencimiento.slice(4, 6));

    if (mm >= 1 && mm <= 12) {
      resultado.vencimiento =
        `${2000 + yy}-${String(mm).padStart(2, '0')}-${String(dd || 1).padStart(2, '0')}`;
    }
  }

  return resultado;
};

const normalizarClave = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const ETIQUETAS = {
  produccion: 'Producción',
  production: 'Producción',
  cultivar: 'Cultivar',
  variedad: 'Cultivar',
  partida: 'Partida',
  contenido: 'Contenido',
  'bolsas por pallet': 'Bolsas por pallet',
  bolsasporpallet: 'Bolsas por pallet',
  grado: 'Grado',
  'placa sugerida': 'Placa sugerida',
  placasugerida: 'Placa sugerida',
  lote: 'Lote',
  lot: 'Lote',
  material: 'Material',
  'nro de pallet': 'Nro. de pallet',
  'numero de pallet': 'Nro. de pallet',
  'nro pallet': 'Nro. de pallet',
  pallet: 'Nro. de pallet',
  'peso de bolsa': 'Peso de bolsa',
  pesobolsa: 'Peso de bolsa',
};

const labelForKey = (key) => {
  const normalized = normalizarClave(key);
  const compact = normalized.replace(/\s/g, '');
  return ETIQUETAS[normalized] || ETIQUETAS[compact] || key;
};

const flattenQRObject = (value, prefix = '') => {
  const fields = [];

  if (value == null || value === '') return fields;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      fields.push(...flattenQRObject(item, `${prefix}[${index + 1}]`));
    });
    return fields;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      fields.push(...flattenQRObject(item, path));
    });
    return fields;
  }

  fields.push({
    key: prefix,
    label: labelForKey(prefix.split('.').pop()),
    value: String(value),
  });

  return fields;
};

export const analizarContenidoQR = (value) => {
  const raw = String(value || '').trim();
  const gs1 = extraerGS1(raw);
  let tipo = 'Texto';
  let objeto = null;
  let campos = [];

  if (!raw) {
    return { raw, tipo, objeto, campos, gs1 };
  }

  try {
    objeto = JSON.parse(raw);
    if (objeto && typeof objeto === 'object') {
      tipo = Array.isArray(objeto) ? 'JSON · lista' : 'JSON';
      campos = flattenQRObject(objeto);
    } else {
      tipo = 'JSON · valor';
      campos = [{ key: 'valor', label: 'Valor', value: String(objeto) }];
    }
  } catch (_) {
    if (/^https?:\/\//i.test(raw)) {
      tipo = 'URL';
      try {
        const url = new URL(raw);
        const params = [];
        url.searchParams.forEach((value, key) => {
          params.push({ key: `query.${key}`, label: labelForKey(key), value });
        });
        campos = [
          { key: 'url', label: 'URL', value: raw },
          ...params,
        ];
      } catch (_) {
        campos = [{ key: 'valor', label: 'Valor', value: raw }];
      }
    } else {
      const partes = raw
        .split(/\r?\n|[|;]/)
        .map((x) => x.trim())
        .filter(Boolean);

      campos = partes
        .map((parte) => {
          const match = parte.match(/^\s*([^:=]+)\s*[:=]\s*(.*?)\s*$/);
          if (!match) return null;
          return {
            key: match[1].trim(),
            label: labelForKey(match[1]),
            value: match[2].trim(),
          };
        })
        .filter(Boolean);

      if (campos.length) tipo = 'Campos de etiqueta';
      else if (gs1.gtin || gs1.lote || gs1.vencimiento || gs1.cantidad) tipo = 'GS1';
      else campos = [{ key: 'valor', label: 'Contenido', value: raw }];
    }
  }

  return {
    raw,
    tipo,
    objeto,
    campos,
    gs1,
  };
};

export const formatearDatosQR = (value) => {
  const analizado = analizarContenidoQR(value);
  return {
    raw: analizado.raw,
    tipo: analizado.tipo,
    campos: analizado.campos,
    gs1: analizado.gs1,
    json: analizado.objeto,
  };
};
