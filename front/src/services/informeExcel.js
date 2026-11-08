function escapar(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function columna(numero) {
  let texto = '';
  let n = numero;
  while (n > 0) {
    const resto = (n - 1) % 26;
    texto = String.fromCharCode(65 + resto) + texto;
    n = Math.floor((n - 1) / 26);
  }
  return texto;
}

function crc32(datos) {
  let crc = -1;
  for (let i = 0; i < datos.length; i += 1) {
    crc ^= datos[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (~crc) >>> 0;
}

function entero(valor, bytes) {
  const salida = new Uint8Array(bytes);
  const vista = new DataView(salida.buffer);
  if (bytes === 2) vista.setUint16(0, valor, true);
  else vista.setUint32(0, valor, true);
  return salida;
}

function unir(partes) {
  const total = partes.reduce((suma, parte) => suma + parte.length, 0);
  const salida = new Uint8Array(total);
  let offset = 0;
  partes.forEach((parte) => {
    salida.set(parte, offset);
    offset += parte.length;
  });
  return salida;
}

function textoUtf8(valor) {
  return new TextEncoder().encode(valor);
}

function zip(archivos) {
  const locales = [];
  const centrales = [];
  let offset = 0;
  archivos.forEach((archivo) => {
    const nombre = textoUtf8(archivo.nombre);
    const datos = archivo.datos;
    const crc = crc32(datos);
    const local = unir([
      entero(0x04034b50, 4),
      entero(20, 2),
      entero(0, 2),
      entero(0, 2),
      entero(0, 2),
      entero(0, 2),
      entero(crc, 4),
      entero(datos.length, 4),
      entero(datos.length, 4),
      entero(nombre.length, 2),
      entero(0, 2),
      nombre,
      datos,
    ]);
    const central = unir([
      entero(0x02014b50, 4),
      entero(20, 2),
      entero(20, 2),
      entero(0, 2),
      entero(0, 2),
      entero(0, 2),
      entero(0, 2),
      entero(crc, 4),
      entero(datos.length, 4),
      entero(datos.length, 4),
      entero(nombre.length, 2),
      entero(0, 2),
      entero(0, 2),
      entero(0, 2),
      entero(0, 2),
      entero(0, 4),
      entero(offset, 4),
      nombre,
    ]);
    locales.push(local);
    centrales.push(central);
    offset += local.length;
  });
  const directorio = unir(centrales);
  const fin = unir([
    entero(0x06054b50, 4),
    entero(0, 2),
    entero(0, 2),
    entero(archivos.length, 2),
    entero(archivos.length, 2),
    entero(directorio.length, 4),
    entero(offset, 4),
    entero(0, 2),
  ]);
  return unir([...locales, directorio, fin]);
}

function xmlEstilos() {
  const fuente = (cuerpo) => `<font>${cuerpo}<name val="Calibri"/></font>`;
  const fuentes = [
    fuente('<sz val="11"/>'),
    fuente('<b/><sz val="14"/><color rgb="FFCCAF54"/>'),
    fuente('<b/><sz val="16"/><color rgb="FF111111"/>'),
    fuente('<b/><sz val="11"/><color rgb="FFF4E7C4"/>'),
    fuente('<sz val="11"/><color rgb="FF111111"/>'),
    fuente('<b/><sz val="11"/><color rgb="FF111111"/>'),
    fuente('<b/><sz val="11"/><color rgb="FFCCAF54"/>'),
  ];
  const solido = (color) => `<fill><patternFill patternType="solid"><fgColor rgb="${color}"/></patternFill></fill>`;
  const rellenos = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    solido('FF111111'),
    solido('FFCCAF54'),
    solido('FF1C1C1C'),
    solido('FFF4E7C4'),
    solido('FFFFFFFF'),
    solido('FFF8F1DE'),
  ];
  const lados = (color) => ['left', 'right', 'top', 'bottom']
    .map((lado) => `<${lado} style="thin"><color rgb="${color}"/></${lado}>`)
    .join('');
  const bordes = [
    '<border><left/><right/><top/><bottom/></border>',
    `<border>${lados('FF8D7340')}</border>`,
    `<border>${lados('FFC4B483')}</border>`,
    `<border>${lados('FFCCAF54')}</border>`,
  ];
  const xf = ({ fuenteId, rellenoId, bordeId, horizontal, indent, numFmtId }) => {
    const formato = numFmtId ? ` numFmtId="${numFmtId}" applyNumberFormat="1"` : ' numFmtId="0"';
    const sangria = indent ? ` indent="${indent}"` : '';
    return `<xf${formato} fontId="${fuenteId}" fillId="${rellenoId}" borderId="${bordeId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${horizontal}" vertical="center"${sangria}/></xf>`;
  };
  const formatos = [
    { fuenteId: 0, rellenoId: 0, bordeId: 0, horizontal: 'left' },
    { fuenteId: 1, rellenoId: 2, bordeId: 0, horizontal: 'left', indent: 10 },
    { fuenteId: 2, rellenoId: 3, bordeId: 1, horizontal: 'left', indent: 1 },
    { fuenteId: 3, rellenoId: 4, bordeId: 1, horizontal: 'left', indent: 1 },
    { fuenteId: 4, rellenoId: 5, bordeId: 1, horizontal: 'left', indent: 1 },
    { fuenteId: 5, rellenoId: 3, bordeId: 1, horizontal: 'center' },
    { fuenteId: 4, rellenoId: 6, bordeId: 2, horizontal: 'center' },
    { fuenteId: 4, rellenoId: 7, bordeId: 2, horizontal: 'center' },
    { fuenteId: 5, rellenoId: 6, bordeId: 2, horizontal: 'center', numFmtId: 1 },
    { fuenteId: 5, rellenoId: 7, bordeId: 2, horizontal: 'center', numFmtId: 1 },
    { fuenteId: 5, rellenoId: 3, bordeId: 1, horizontal: 'center' },
    { fuenteId: 4, rellenoId: 6, bordeId: 2, horizontal: 'left', indent: 1 },
    { fuenteId: 4, rellenoId: 7, bordeId: 2, horizontal: 'left', indent: 1 },
    { fuenteId: 4, rellenoId: 6, bordeId: 2, horizontal: 'right', numFmtId: 164 },
    { fuenteId: 4, rellenoId: 7, bordeId: 2, horizontal: 'right', numFmtId: 164 },
    { fuenteId: 3, rellenoId: 2, bordeId: 3, horizontal: 'left', indent: 1 },
    { fuenteId: 3, rellenoId: 2, bordeId: 3, horizontal: 'center', numFmtId: 1 },
    { fuenteId: 6, rellenoId: 2, bordeId: 3, horizontal: 'right', numFmtId: 164 },
    { fuenteId: 5, rellenoId: 6, bordeId: 2, horizontal: 'center', numFmtId: 1 },
    { fuenteId: 5, rellenoId: 7, bordeId: 2, horizontal: 'center', numFmtId: 1 },
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="$#,##0"/></numFmts>
  <fonts count="${fuentes.length}">${fuentes.join('')}</fonts>
  <fills count="${rellenos.length}">${rellenos.join('')}</fills>
  <borders count="${bordes.length}">${bordes.join('')}</borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${formatos.length}">${formatos.map(xf).join('')}</cellXfs>
</styleSheet>`;
}

function celda(ref, estilo, valor) {
  if (typeof valor === 'number') return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  if (valor === undefined || valor === null || valor === '') return `<c r="${ref}" s="${estilo}"/>`;
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t>${escapar(valor)}</t></is></c>`;
}

function hoja({ titulo, filtros, resumen, encabezados, detalle, totalDinero, conLogo }) {
  const anchos = encabezados.length === 6 ? [18, 28, 24, 22, 20, 16] : [18, 28, 24, 22, 18];
  const columnas = anchos.map((ancho, indice) => `<col min="${indice + 1}" max="${indice + 1}" width="${ancho}" customWidth="1"/>`).join('');
  const filas = [];
  const combinadas = [`A1:${columna(encabezados.length)}1`, 'A2:B2'];
  const marca = [celda('A1', 1, 'MysticalCut')];
  for (let i = 2; i <= encabezados.length; i += 1) marca.push(celda(`${columna(i)}1`, 1, ''));
  filas.push(`<row r="1" ht="54" customHeight="1">${marca.join('')}</row>`);

  const colServicio = Math.max(4, encabezados.indexOf('Servicio') + 1);
  const finResumen = colServicio - 1;
  const finCantidad = encabezados.length;
  const rango = (fila, estilo, valor, desde, hasta) => {
    const celdas = [celda(`${columna(desde)}${fila}`, estilo, valor)];
    for (let c = desde + 1; c <= hasta; c += 1) celdas.push(celda(`${columna(c)}${fila}`, estilo, ''));
    if (hasta > desde) combinadas.push(`${columna(desde)}${fila}:${columna(hasta)}${fila}`);
    return celdas;
  };
  const tituloFila = [celda('A2', 2, titulo), celda('B2', 2, '')];
  tituloFila.push(...rango(2, 5, 'Resumen', 3, finResumen));
  tituloFila.push(...rango(2, 5, 'Cantidad', colServicio, finCantidad));
  filas.push(`<row r="2" ht="28" customHeight="1">${tituloFila.join('')}</row>`);

  const bloques = Math.max(filtros.length, resumen.length);
  for (let i = 0; i < bloques; i += 1) {
    const numero = 3 + i;
    const celdas = [];
    if (filtros[i]) {
      celdas.push(celda(`A${numero}`, 3, filtros[i][0]));
      celdas.push(celda(`B${numero}`, 4, filtros[i][1]));
    }
    if (resumen[i]) {
      const alterna = i % 2 === 1;
      celdas.push(...rango(numero, alterna ? 7 : 6, resumen[i][0], 3, finResumen));
      celdas.push(...rango(numero, alterna ? 9 : 8, resumen[i][1], colServicio, finCantidad));
    }
    filas.push(`<row r="${numero}" ht="22" customHeight="1">${celdas.join('')}</row>`);
  }

  const filaTabla = 3 + bloques + 1;
  filas.push(`<row r="${filaTabla - 1}" ht="12" customHeight="1"/>`);
  filas.push(`<row r="${filaTabla}" ht="24" customHeight="1">${encabezados.map((nombre, indice) => celda(`${columna(indice + 1)}${filaTabla}`, 10, nombre)).join('')}</row>`);
  detalle.forEach((fila, indice) => {
    const numero = filaTabla + 1 + indice;
    const alterna = indice % 2 === 1;
    const celdas = fila.map((valor, columnaIndice) => {
      const esNumero = typeof valor === 'number';
      let estilo = alterna ? 12 : 11;
      if (esNumero) estilo = totalDinero ? (alterna ? 14 : 13) : (alterna ? 19 : 18);
      return celda(`${columna(columnaIndice + 1)}${numero}`, estilo, valor);
    });
    filas.push(`<row r="${numero}" ht="20" customHeight="1">${celdas.join('')}</row>`);
  });

  const filaTotal = filaTabla + detalle.length + 1;
  const total = totalDinero
    ? detalle.reduce((suma, fila) => suma + (Number(fila[fila.length - 1]) || 0), 0)
    : detalle.length;
  const totalCeldas = [celda(`A${filaTotal}`, 15, 'Total')];
  for (let i = 2; i < encabezados.length; i += 1) totalCeldas.push(celda(`${columna(i)}${filaTotal}`, 15, ''));
  totalCeldas.push(celda(`${columna(encabezados.length)}${filaTotal}`, totalDinero ? 17 : 16, total));
  filas.push(`<row r="${filaTotal}" ht="24" customHeight="1">${totalCeldas.join('')}</row>`);
  combinadas.push(`A${filaTotal}:${columna(encabezados.length - 1)}${filaTotal}`);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols>${columnas}</cols>
  <sheetData>${filas.join('')}</sheetData>
  <mergeCells count="${combinadas.length}">${combinadas.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>
  ${conLogo ? '<drawing r:id="rId1"/>' : ''}
</worksheet>`;
}

function dibujo() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:oneCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>80000</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>160000</xdr:rowOff></xdr:from>
    <xdr:ext cx="640000" cy="312000"/>
    <xdr:pic>
      <xdr:nvPicPr><xdr:cNvPr id="1" name="Logo MysticalCut"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
      <xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
      <xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="640000" cy="312000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;
}

export function crearInformeExcel({ titulo, filtros, resumen, encabezados, detalle, totalDinero, logo }) {
  const conLogo = logo && logo.length;
  const archivos = [
    {
      nombre: '[Content_Types].xml',
      datos: textoUtf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${conLogo ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ''}
</Types>`),
    },
    {
      nombre: '_rels/.rels',
      datos: textoUtf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      nombre: 'xl/workbook.xml',
      datos: textoUtf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Informe" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      datos: textoUtf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    {
      nombre: 'xl/styles.xml',
      datos: textoUtf8(xmlEstilos()),
    },
    {
      nombre: 'xl/worksheets/sheet1.xml',
      datos: textoUtf8(hoja({ titulo, filtros, resumen, encabezados, detalle, totalDinero, conLogo })),
    },
  ];
  if (conLogo) {
    archivos.push({
      nombre: 'xl/worksheets/_rels/sheet1.xml.rels',
      datos: textoUtf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`),
    });
    archivos.push({ nombre: 'xl/drawings/drawing1.xml', datos: textoUtf8(dibujo()) });
    archivos.push({
      nombre: 'xl/drawings/_rels/drawing1.xml.rels',
      datos: textoUtf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/>
</Relationships>`),
    });
    archivos.push({ nombre: 'xl/media/logo.png', datos: logo });
  }
  return zip(archivos);
}
