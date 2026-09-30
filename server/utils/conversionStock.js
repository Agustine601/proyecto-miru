const normalizarTextoConversion = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const extraerConversion = (producto) => {
  const texto = [producto?.presentacion, producto?.descripcion, producto?.nombre]
    .filter(Boolean).join(' | ');
  const normalizado = normalizarTextoConversion(texto).replace(',', '.');
  const patrones = [
    /(?:por|x|envase de|presentacion de|presentacion:)\s*(\d+(?:\.\d+)?)\s*(litros?|lts?|lt|l|kilogramos?|kgs?|kg|kilos?)\b/i,
    /\b(\d+(?:\.\d+)?)\s*(litros?|lts?|lt|l|kilogramos?|kgs?|kg|kilos?)\s*(?:\/\s*unidad|por\s*unidad|c\/u|c\/u)\b/i,
    /\b(\d+(?:\.\d+)?)\s*(litros?|lts?|lt|l|kilogramos?|kgs?|kg|kilos?)\b/i,
  ];
  for (const patron of patrones) {
    const match = normalizado.match(patron);
    if (!match) continue;
    const factor = Number(match[1]);
    if (!Number.isFinite(factor) || factor <= 0) continue;
    const esKg = /kg|kilo/.test(match[2]);
    return { factor, unidad: esKg ? 'kg' : 'L' };
  }
  return null;
};

const calcularEquivalente = (cantidad, producto) => {
  const conversion = extraerConversion(producto);
  const unidades = Number(cantidad || 0);
  if (!conversion || !Number.isFinite(unidades)) return null;
  return { ...conversion, cantidad: unidades * conversion.factor };
};

module.exports = { extraerConversion, calcularEquivalente };
