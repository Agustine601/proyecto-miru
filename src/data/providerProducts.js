// Catálogos de proveedores agrícolas para MIRÚ.
// Fuentes oficiales consultadas: Bayer, Quimeco y Rizobacter Argentina.
// Los productos y categorías pueden cambiar; el botón "Fuente oficial" siempre enlaza al sitio del proveedor.

const item = (nombre, tipo, descripcion='', url='') => ({
  nombre, tipo, descripcion: descripcion || `Producto ${nombre} del portfolio de ${tipo}.`,
  icono: '🧪', color: 'green', categoria: 'reagents', fuente: tipo, url,
});

export const quimecoProducts = [
  item('X-Trim® LowFlow NEO','Coadyuvante especializado','Coadyuvante especializado Quimeco.','https://quimeco.com.ar/productos/'),
  item('X-Trim® LowFlow','Coadyuvante especializado','Coadyuvante especializado para aplicaciones agrícolas.','https://quimeco.com.ar/productos/'),
  item('X-Trim® Power','Coadyuvante especializado','Coadyuvante especializado para mejorar la aplicación.','https://quimeco.com.ar/productos/'),
  item('Aceite Winnow Ultra','Coadyuvante especializado','Aceite de uso agrícola del portfolio Quimeco.','https://quimeco.com.ar/productos/'),
  item('Micro Winnow','Coadyuvante especializado','Coadyuvante del portfolio Quimeco.','https://quimeco.com.ar/productos/'),
  item('Activate Total Mix','Optimizador de mezclas','Optimizador de mezclas.','https://quimeco.com.ar/productos/'),
  item('Activate Max','Acondicionador de agua y potenciador','Acondicionador de agua y potenciador de herbicidas.','https://quimeco.com.ar/productos/'),
  item('Fulldrop','Antideriva','Agente antideriva.','https://quimeco.com.ar/productos/'),
  item('Aceite Quimeco','Aceites de uso agrícola','Aceite de uso agrícola.','https://quimeco.com.ar/productos/'),
  item('Aceite Quimeco Plus','Aceites de uso agrícola','Aceite de uso agrícola.','https://quimeco.com.ar/productos/'),
  item('Aceite Winnow','Aceites de uso agrícola','Aceite de uso agrícola.','https://quimeco.com.ar/productos/'),
  item('Combo Bio Soja','Biológicos','Solución biológica para soja.','https://quimeco.com.ar/productos/'),
  item('Combo Bio Trigo','Biológicos','Solución biológica para trigo.','https://quimeco.com.ar/productos/'),
  item('X-Mart','Biológicos','Producto biológico del portfolio Quimeco.','https://quimeco.com.ar/productos/'),
  item('Protect Pack Full','Inoculantes y curasemillas','Pack de inoculación y tratamiento de semillas.','https://quimeco.com.ar/productos/'),
  item('Protect Pack','Inoculantes y curasemillas','Pack de inoculación y tratamiento de semillas.','https://quimeco.com.ar/productos/'),
  item('Inoculante Quimeco','Inoculantes y curasemillas','Inoculante del portfolio Quimeco.','https://quimeco.com.ar/productos/'),
  item('Combo Trigo','Inoculantes y curasemillas','Combo para tratamiento de trigo.','https://quimeco.com.ar/productos/'),
  item('Xilonen','Fertilizante foliar','Fertilizante foliar.','https://quimeco.com.ar/productos/'),
  item('Xilonen Fosfitos','Fertilizante foliar','Fertilizante foliar con fosfitos.','https://quimeco.com.ar/productos/'),
  item('Xilonen Zinc','Fertilizante foliar','Fertilizante foliar con zinc.','https://quimeco.com.ar/productos/'),
  item('Xilonen Boro','Fertilizante foliar','Fertilizante foliar con boro.','https://quimeco.com.ar/productos/'),
  item('Xilogrow','Fertilizante foliar','Fertilizante foliar del portfolio Quimeco.','https://quimeco.com.ar/productos/'),
];

const rz = (nombre,tipo='Portfolio Rizobacter') => item(nombre,tipo,`Producto ${nombre} del portfolio oficial de Rizobacter Argentina.`,'https://www.rizobacter.com/ar/es/productos/');
export const rizobacterProducts = [
  rz('Rizopower N','Nutrición y bioestimulación'), rz('Rizopower Z','Nutrición y bioestimulación'), rz('Rizopower N-Bio','Nutrición y bioestimulación'), rz('Rizopower B','Nutrición y bioestimulación'), rz('Rizopower','Nutrición y bioestimulación'),
  rz('Rizoderma TMX','Terápicos de semillas'), rz('Rizoderma','Terápicos de semillas'), rz('Rizoderma Soja','Biocontrol'), rz('Rizoderma Trigo','Biocontrol'), rz('Rizoderma Arroz','Biocontrol'),
  rz('Rizospray Wet','Adyuvante'), rz('RizowetEco','Adyuvante'), rz('Rizospray Extremo Mineral','Adyuvante'), rz('Rizospray Pro Maní','Adyuvante'), rz('Rizospray Cleaner','Adyuvante'), rz('Rizospray Cleaner Advance SMART','Adyuvante'), rz('Rizospray Extreme','Adyuvante'), rz('Rizospray Antideriva','Adyuvante'), rz('Rizospray Antiespuma','Adyuvante'), rz('Rizospray Sulfo Dry','Adyuvante'), rz('Rizospray Sulfo','Adyuvante'), rz('Rizospray Corrector Secuestrante','Adyuvante'), rz('Rizospray Captor Corrector','Adyuvante'), rz('Rizospray Integrum','Adyuvante'), rz('Rizospray Water Conditioner','Adyuvante'), rz('Eco Rizospray','Adyuvante'), rz('Rizo Oil','Adyuvante'), rz('Rizo Oil M Plus','Adyuvante'), rz('Rizooil M Plus','Adyuvante'), rz('Antifoam','Adyuvante'),
  rz('Aterix','Biocontrol'), rz('Majestene','Biocontrol'), rz('Regalia Maxx','Biocontrol'), rz('Venerate XC','Biocontrol'), rz('GRANDEVO WDG','Biocontrol'),
  rz('Balboa','Control de plagas'), rz('Phosgas','Control de plagas'), rz('Actellic 50','Control de plagas'), rz('Actellic Plus','Control de plagas'), rz('Clartex XTRA','Control de plagas'),
  rz('Rizomix','Inoculantes y bio-inductores'), rz('Ribol Liq','Inoculantes y bio-inductores'), rz('Rizofos Liq Girasol','Inoculantes y bio-inductores'), rz('Rizofos','Nutrición y bioestimulación'), rz('Rizofos liq Sorgo','Inoculantes y bio-inductores'), rz('Rizofos Wheat','Inoculantes y bio-inductores'), rz('Rizofos Liq Pre Inoculated Corn','Inoculantes y bio-inductores'), rz('Rizospirillum','Inoculantes y bio-inductores'), rz('Rizoliq LLI','Inoculantes y bio-inductores'), rz('Rizoliq LLI Mani','Inoculantes y bio-inductores'), rz('Rizoliq TOP','Inoculantes y bio-inductores'), rz('Rizoliq Top Garbanzo','Inoculantes y bio-inductores'), rz('Rizoliq Top Poroto','Inoculantes y bio-inductores'), rz('Rizoliq Top Poroto Mung','Inoculantes y bio-inductores'), rz('Rizoliq Surco Maní','Inoculantes y bio-inductores'), rz('Rialfa Liq','Inoculantes y bio-inductores'), rz('Rialfa','Inoculantes y bio-inductores'), rz('Rilotus Liq','Inoculantes y bio-inductores'), rz('Rilotus','Inoculantes y bio-inductores'), rz('Rilegum TOP','Inoculantes y bio-inductores'), rz('Rizomicro ZN','Nutrición y bioestimulación'), rz('Microstar CMB','Nutrición y bioestimulación'), rz('Microstar CMB BIO','Nutrición y bioestimulación'), rz('Premax R','Inoculantes y bio-inductores'),
  rz('Rizocarb 50','Terápicos de semillas'), rz('Ritiram Carb Plus','Terápicos de semillas'), rz('Signum Arveja','Inoculantes y bio-inductores'), rz('Signum Chickpea','Inoculantes y bio-inductores'), rz('Signum Vicia','Inoculantes y bio-inductores'),
  rz('Rizonema','Biocontrol'), rz('Suren Maxx','Terápicos de semillas'),
  rz('Rizosil','Inoculantes y bio-inductores'),
  rz('Rizospray Zen','Adyuvante'),
  rz('Rizostar','Fertilizante foliar'),
  rz('Rizoderma SX - Nuevo','Terápicos de semillas'),
  rz('BioElicitor','Protector fúngico'),
  rz('Rizonema','Biocontrol'),
  rz('Rizospray Extremo','Adyuvante'),
  rz('Water Conditioner','Adyuvante'),
  rz('Signum','Inoculantes y bio-inductores'),
  rz('Haven','Nutrición y bioestimulación'),
  rz('Avalora CMB BIO','Nutrición y bioestimulación'),
  rz('Sertivo','Nutrición y bioestimulación'),
  rz('Vitagrow TS','Nutrición y bioestimulación'),
  rz('Spray Gurú','Adyuvante'),
  rz('Rizoliq LLI Garbanzo','Inoculantes y bio-inductores'),
  rz('Microstar PZ BIO','Nutrición y bioestimulación'),
  rz('Rizoliq Surco','Inoculantes y bio-inductores'),
  rz('Vitagrow','Fertilizante foliar'),
  rz('Rizoderma Rice','Terápicos de semillas'),
  rz('Clartex R TDS','Control de plagas'),
];

export const providerCatalog = {
  bayer: null,
  quimeco: { nombre: 'Quimeco', url: 'https://quimeco.com.ar/productos/', products: quimecoProducts },
  rizobacter: { nombre: 'Rizobacter', url: 'https://www.rizobacter.com/ar/es/productos/', products: rizobacterProducts },
};
