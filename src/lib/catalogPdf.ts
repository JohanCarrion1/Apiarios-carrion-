// ============================================================
// CATÁLOGO DE PRODUCTOS — PDF A4 (jspdf)
// ============================================================
// Misma librería que las cotizaciones (jspdf) para que el peso y el
// flujo de descarga sean idénticos.
//
// El documento es un libro de:
//   1. Portada: fondo crema, doble marco dorado, esquineras, logo de la abeja
//      suelto (sin plato ni aro) y jerarquía de título.
//   2. Prólogo: columna de texto justificado + raíl lateral de datos +
//      índice de contenidos. Todo el texto pasa por `textoPdf()` porque
//      jspdf solo puede imprimir el juego de caracteres WinAnsi.
//   3. Una sección por categoría: banda de título sobre la rejilla de
//      4 columnas (6 filas; 5 en la página que abre categoría) con
//      header y footer de marca en cada hoja.
//
// La rejilla se ajusta al número EXACTO de productos de cada página: sólo
// se dibujan los bordes de las celdas ocupadas, de modo que no quedan
// celdas vacías enmarcadas ni renglones colgando al final.
//
// Todo el branding (nombre, logo, colores) y el listado de productos
// vienen de `BRANDING`: el PDF se arma en el cliente, por lo que
// sólo incluye los productos del catálogo vigente de esa empresa.
//
// Las medidas en mm se exportan en CATALOG_METRICS / CATALOG_COVER /
// catalogBandBox() para que la vista previa de la pantalla
// (/admin/catalogo) dibuje exactamente lo mismo que el PDF.

import { jsPDF } from 'jspdf';
import { STORE_MACROS, type StoreProduct } from '../types/store';
import { esPrecioConsultar, formatSoles } from '../types/store';

/* ------------------------------------------------------------------
   GEOMETRÍA DE LA HOJA (mm)
   ------------------------------------------------------------------ */

/** Columnas del grid de productos. */
export const CATALOG_COLS = 4;
/** Filas del grid de productos. */
export const CATALOG_ROWS = 6;
/** Productos por página (4 × 6 = 24). */
export const CATALOG_PER_PAGE = CATALOG_COLS * CATALOG_ROWS;

export interface CatalogMetrics {
  /** Ancho de la hoja A4 vertical. */
  pageW: number;
  /** Alto de la hoja A4 vertical. */
  pageH: number;
  /** Margen en los cuatro lados. */
  margin: number;
  /** Alto reservado al header de marca. */
  headerH: number;
  /** Alto reservado al footer con el número de página. */
  footerH: number;
  /** Esquina superior izquierda del grid. */
  gridX: number;
  /** Esquina superior izquierda del grid. */
  gridY: number;
  /** Ancho útil del grid. */
  gridW: number;
  /** Alto útil del grid (6 filas exactas). */
  gridH: number;
  /** Ancho de cada celda (4 columnas exactas). */
  cellW: number;
  /** Alto de cada celda (6 filas exactas). */
  cellH: number;
  /** Columnas del grid. */
  cols: number;
  /** Filas del grid (6 en continuación, 5 al abrir categoría). */
  rows: number;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;
const HEADER_H = 22;
const FOOTER_H = 10;

/** Métricas del grid. Se calculan una vez y las consume también la
 *  vista previa, para que pantalla y PDF nunca se desincronicen. */
export const CATALOG_METRICS: CatalogMetrics = (() => {
  const gridW = PAGE_W - MARGIN * 2;
  const gridH = PAGE_H - MARGIN - HEADER_H - FOOTER_H - MARGIN;
  return {
    pageW: PAGE_W,
    pageH: PAGE_H,
    margin: MARGIN,
    headerH: HEADER_H,
    footerH: FOOTER_H,
    gridX: MARGIN,
    gridY: MARGIN + HEADER_H,
    gridW,
    gridH,
    cellW: gridW / CATALOG_COLS,
    cellH: gridH / CATALOG_ROWS,
    cols: CATALOG_COLS,
    rows: CATALOG_ROWS,
  };
})();

/** Filas del grid en la página que ABRE una categoría: una menos para dejar
 *  respirar la banda de título de sección. */
export const CATALOG_ROWS_SECTION = CATALOG_ROWS - 1;

/** Productos en la página que abre categoría (4 × 5 = 20). */
export const CATALOG_PER_PAGE_SECTION = CATALOG_COLS * CATALOG_ROWS_SECTION;

/** Alto de la banda de título de sección, sobre la rejilla. */
export const CATALOG_SECTION_BAND_H = 17;

/**
 * Header y pie de las páginas de contenido, en mm. El header se mide desde el
 * margen superior y el pie desde `pageH - margin - footerH`, igual que en la
 * vista previa: así los rótulos de marca caen en la misma línea base en papel
 * y en pantalla.
 */
export const CATALOG_CHROME = {
  /** Lado del logo (o del monograma) del header. */
  logo: 13,
  /** El logo baja 1 mm respecto al margen. */
  logoTop: 1,
  /** Aire entre el logo y el bloque de texto. */
  gap: 4,
  /** Línea base del nombre de marca (15 pt bold). */
  nameY: 6.4,
  /** Línea base del tagline bajo el nombre (7.5 pt). */
  taglineY: 11,
  /** Línea base de "CATÁLOGO", a la derecha (12 pt bold). */
  docY: 6,
  /** Línea base de "Fecha: …", a la derecha (7.5 pt). */
  dateY: 10.6,
  /** Filete del header: `margin + headerH - headerRuleDY`. */
  headerRuleDY: 4,
  /** Filete del pie, respecto a la base del pie. */
  footerRuleDY: -2.5,
  /** Línea base del texto del pie, respecto a la base del pie. */
  footerTextDY: 3.5,
} as const;

/**
 * Geometría de la banda de sección (página que abre categoría) y de la
 * etiqueta de continuación, en mm absolutos de la hoja. La exporta el PDF y
 * la consume también la vista previa: así el título nunca queda debajo del
 * logo del header y la banda nunca pisa la rejilla.
 */
export interface CatalogBandBox {
  /** Borde superior de la banda. */
  top: number;
  /** Línea base del título de categoría. */
  titleY: number;
  /** Línea base del contador de la derecha ("N productos · página x de y"). */
  metaY: number;
  /** Filete que cierra la banda (0 = sin filete). */
  ruleY: number;
}

export function catalogBandBox(m: CatalogMetrics, abre: boolean): CatalogBandBox {
  // La página que abre categoría reserva la banda completa; la de
  // continuación sólo tiene el hueco entre el separador del header (28 mm) y
  // la rejilla (32 mm), así que su título va en 11 pt y sin filete.
  if (abre) {
    const top = m.gridY - CATALOG_SECTION_BAND_H;
    return { top, titleY: top + 9.8, metaY: top + 9.1, ruleY: top + 12.8 };
  }
  return { top: m.gridY - 4, titleY: m.gridY - 1.1, metaY: m.gridY - 1.1, ruleY: 0 };
}

/**
 * Geometría de la portada, en mm absolutos. La comparten el PDF y la vista
 * previa para que la pantalla y el papel se vean igual.
 */
export const CATALOG_COVER = {
  /** Fondo crema de la hoja. */
  bg: '#FCF8F1',
  /** Marcos dorados concéntricos (separación desde el borde de la hoja). */
  frame: 12,
  frame2: 14.6,
  /** Esquineras en L, dentro del segundo marco. */
  bracket: 17.8,
  bracketArm: 7,
  /** Filete superior con rombo. */
  topRuleY: 26,
  /** Centro del logo y lado del logo (sin plato: el logo va suelto). */
  plateCx: 105,
  plateCy: 64,
  logo: 38,
  /** Bloque central de texto. */
  nameY: 105,
  taglineY: 112,
  ornamentY: 122,
  titleY: 136,
  dateY: 146,
  resumenY: 154,
  /** Nota de cierre y pie. */
  // El vacío de la portada se reparte a partes iguales: la nota sube para que
  // no quede un agujero de 77 mm encima y otro de 30 mm debajo.
  noteRuleY: 208,
  noteY: 216,
  footRuleY: 271,
  footY: 279,
  /** Ancho máximo del nombre de la empresa y del cuerpo de la nota. */
  nameW: 152,
  noteW: 150,
  /** Banda vertical libre para el nombre de la portada: entre el logo (que
   *  acaba en 64 + 38/2 = 83) y el tagline (que empieza sobre 109). */
  nameTopY: 85,
  nameBottomY: 109,
  /** Cuerpo tope cuando el nombre necesita dos líneas: dos cuerpos de 19+ pt
   *  no caben en esa banda y el texto invadiría el logo o el tagline. */
  nameTwoLineMax: 16,
  /** Interlineado entre las dos líneas del nombre (mm). */
  nameGap: 8,
} as const;

/** Métricas de la página que abre una categoría: mismo grid, una fila menos y
 *  desplazado hacia abajo por la banda de título. */
export const CATALOG_SECTION_METRICS: CatalogMetrics = (() => {
  const base = CATALOG_METRICS;
  const gridH = base.gridH - CATALOG_SECTION_BAND_H;
  return {
    ...base,
    gridY: base.gridY + CATALOG_SECTION_BAND_H,
    gridH,
    cellH: gridH / CATALOG_ROWS_SECTION,
    rows: CATALOG_ROWS_SECTION,
  };
})();

/** Ancho de la celda interior (descontando el padding de la celda). */
/** Relleno interior de la celda; acota el ancho de la miniatura. */
export const CATALOG_CELL_PAD = 2.2;

/** Alto en mm de la imagen dentro de la celda. Con el stock visible la
 *  imagen cede espacio para que quepan las cuatro líneas de texto. */
export const CATALOG_THUMB_H = 19;
export const CATALOG_THUMB_H_STOCK = 15;

/** Resolución de impresión de las miniaturas del PDF. */
const PRINT_DPI = 300;

/** mm → píxeles a resolución de impresión (múltiplos de 32: más rápido de
 *  codificar que cualquier tamaño y mantiene buena calidad al imprimir). */
const printPx = (mm: number): number => Math.ceil(((mm / 25.4) * PRINT_DPI) / 32) * 32;

/* ------------------------------------------------------------------
   OPCIONES Y BRANDING
   ------------------------------------------------------------------ */

export interface CatalogPdfOptions {
  /** Muestra el precio bajo el nombre del producto. */
  mostrarPrecios: boolean;
  /** Muestra el stock disponible bajo la unidad. */
  mostrarStock: boolean;
}

export const CATALOG_DEFAULT_OPTIONS: CatalogPdfOptions = {
  mostrarPrecios: true,
  mostrarStock: false,
};

/** Branding aplicado al PDF (con defaults de la marca del cliente). */
export interface CatalogPdfBranding {
  nombreEmpresa: string;
  /** URL del logo configurado (vacío = se usa la abeja de marca). */
  logoUrl?: string;
  /** Color primario (marca). */
  primario?: string;
  /** Color secundario (títulos, bordes). */
  secundario?: string;
  /** Ubicación del cliente, p. ej. "Huaraz · Perú". */
  ubicacion?: string;
  /** Subtítulo de la cabecera. */
  tagline?: string;
  /** Fecha de generación (por defecto, ahora). */
  fecha?: Date;
}

const HONEY = '#D9A94F';
const DEEP = '#B57E1C';
/** Tinta del nombre de producto (encabezado de celda). */
const INK: readonly [number, number, number] = [26, 20, 13];
/** Texto de contenido sobre blanco: gris oscuro cálido de alto contraste. */
const TEXT_DARK: readonly [number, number, number] = [52, 47, 40];
/** Texto terciario (unidades, stock). */
const TEXT_MUTED: readonly [number, number, number] = [122, 113, 99];

/** Filetes finos de la rejilla y del índice (los dibuja jspdf como RGB). */
const RULE_RGB: readonly [number, number, number] = [226, 216, 197];
/** El mismo filete en CSS, para que la vista previa use el mismo color. */
export const CATALOG_RULE_COLOR = '#E2D8C5';

/** Textos fijos de la portada, el prólogo y la rejilla. Los comparte la vista
 *  previa: son parte de la maqueta, no datos del catálogo. */
export const CATALOG_TEXTOS = {
  /** Nota de cierre de la portada. */
  notaCierre:
    'Documento de referencia: confirma precios, disponibilidad y plazos de entrega antes de cerrar tu pedido.',
  /** Nota de contacto del raíl del prólogo. */
  notaRail: 'Pedidos al por mayor, transporte y pedidos personalizados: consúltanos.',
} as const;

export const CATALOG_TAGLINE = 'Miel & Productos Naturales';
const DEFAULT_COMPANY = 'Apiarios Carrión';
const DEFAULT_LOCATION = 'Huaraz · Perú';

/* ------------------------------------------------------------------
   TEXTO
   ------------------------------------------------------------------ */

/**
 * Caracteres por encima de U+00FF que las fuentes estándar de jspdf
 * (WinAnsiEncoding / CP1252) sí saben imprimir. Es el mismo mapa que aplica
 * la librería por dentro.
 */
const WIN_ANSI_EXTRA = new Set([
  '\u0192', '\u2013', '\u2014', '\u2018', '\u2019', '\u201a', '\u201c', '\u201d', '\u201e',
  '\u2020', '\u2021', '\u2022', '\u2026', '\u2030', '\u2039', '\u203a', '\u20ac', '\u2122',
  '\u0152', '\u0153', '\u0160', '\u0161', '\u0178', '\u017d', '\u017e', '\u02c6', '\u02dc',
]);

/** Equivalencias tipográficas seguras: lo que no está en WinAnsi se
 *  normaliza a su equivalente imprimible (guiones, comillas, flechas…). */
const SUSTITUCIONES: Record<string, string> = {
  '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2015': '\u2014', '\u2212': '-',
  '\u00a0': ' ', '\u2007': ' ', '\u2009': ' ', '\u202f': ' ', '\u200b': '', '\ufeff': '',
  '\u00ad': '', '\u00ab': '"', '\u00bb': '"', '\u201e': '"', '\u201a': "'",
  '\u2190': '<', '\u2192': '>', '\u25a0': '\u25aa', '\u25cf': '\u2022', '\u2028': ' ', '\u2029': ' ',
  '\ufffd': '', // el "carácter de reemplazo" que se ve roto en pantalla
};

/**
 * Deja el texto dentro del juego WinAnsi antes de mandarlo a jspdf.
 *
 * Es imprescindible: si una cadena trae un solo carácter fuera de ese juego
 * (un "―" U+2015, un ideograma, un emoji pegado por error), jspdf deja de
 * traducirla y la codifica entera en UCS-2, así que en el PDF sale basura
 * tipo "sejó-?R0" en lugar del texto. Aquí los caracteres problema se
 * sustituyen por su equivalente y los que no tienen ninguno se eliminan, de
 * modo que ninguna cadena pueda romper el resto del párrafo.
 */
export function textoPdf(s: string | null | undefined): string {
  if (!s) return '';
  let out = '';
  for (const ch of s.normalize('NFC')) {
    const rep = SUSTITUCIONES[ch];
    if (rep !== undefined) {
      out += rep;
      continue;
    }
    const cp = ch.codePointAt(0) ?? 0;
    if (cp <= 0xff || WIN_ANSI_EXTRA.has(ch)) out += ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Ancho aproximado (mm) de un texto en Helvetica-Bold. No usa las métricas
 * del PDF: sirve para decidir de forma determinista el cuerpo del título de la
 * portada, y al ser la misma función para el PDF y para la vista previa, en
 * los dos sale el mismo tamaño.
 */
const AVANCE_BOLD: Record<string, number> = {
  ' ': 0.278, '!': 0.333, '"': 0.474, '&': 0.722, "'": 0.238, '(': 0.333, ')': 0.333,
  '*': 0.389, ',': 0.278, '-': 0.333, '.': 0.278, '/': 0.278, ':': 0.333, ';': 0.333,
  '?': 0.556, '@': 1.015, '\u00b7': 0.333, '\u2014': 1.0, '\u2013': 0.556, '\u2026': 1.0,
  A: 0.722, B: 0.722, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778, H: 0.722,
  I: 0.278, J: 0.556, K: 0.722, L: 0.611, M: 0.833, N: 0.722, O: 0.778, P: 0.667,
  Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722, V: 0.667, W: 0.944, X: 0.667,
  Y: 0.667, Z: 0.611,
  a: 0.556, b: 0.611, c: 0.556, d: 0.611, e: 0.556, f: 0.333, g: 0.611, h: 0.611,
  i: 0.278, j: 0.278, k: 0.556, l: 0.278, m: 0.889, n: 0.611, o: 0.611, p: 0.611,
  q: 0.611, r: 0.389, s: 0.556, t: 0.333, u: 0.611, v: 0.556, w: 0.778, x: 0.556,
  y: 0.556, z: 0.5,
  0: 0.556, 1: 0.556, 2: 0.556, 3: 0.556, 4: 0.556, 5: 0.556, 6: 0.556, 7: 0.556,
  8: 0.556, 9: 0.556,
};

/** Ancho aproximado en mm de `texto` en Helvetica-Bold a `size` pt. */
export function anchoBold(texto: string, size: number, charSpace = 0): number {
  let em = 0;
  for (const ch of texto.toUpperCase()) em += (AVANCE_BOLD[ch] ?? 0.6) * size + charSpace;
  return (em * 25.4) / 72;
}

/**
 * Cuerpo del nombre de la empresa en la portada: se agranda hasta un máximo y
 * se reduce lo justo para que quepa con aire dentro del marco.
 *
 * Antes el mínimo eran 17 pt y el nombre se imprimía SIEMPRE en una sola línea:
 * con un nombre largo ("Apiarios y Servicios Apícolas del Valle SAC") el texto
 * seguía siendo más ancho que el marco y, al estar centrado en x=105, se salía
 * por la izquierda de la hoja y quedaba cortado. Ahora `coverNameLines` reparte
 * el nombre en dos líneas como mucho y el cuerpo baja hasta 12 pt.
 */
export function coverNameSize(nombre: string, maxW = CATALOG_COVER.nameW): number {
  const txt = textoPdf(nombre).toUpperCase();
  let size = 19;
  if (!txt) return size;
  while (size < 34 && anchoBold(txt, size, 0.9) <= maxW) size += 0.5;
  while (size > 12 && anchoBold(txt, size, 0.9) > maxW) size -= 0.5;
  return size;
}

/**
 * Reparte el nombre de la portada en 1 o 2 líneas que caben en `maxW`.
 * Exportado para que la vista previa reparta exactamente igual que el PDF.
 */
export function coverNameLines(
  nombre: string,
  size: number,
  maxW = CATALOG_COVER.nameW
): string[] {
  const txt = textoPdf(nombre).toUpperCase();
  if (!txt) return [''];
  if (anchoBold(txt, size, 0.9) <= maxW) return [txt];

  const palabras = txt.split(/\s+/).filter(Boolean);
  if (palabras.length < 2) return [txt]; // una sola palabra: no hay por dónde cortar

  // Reparte por palabras buscando el corte que deja las dos líneas más parejas.
  let mejor: [string, string] | null = null;
  let mejorDelta = Infinity;
  for (let corte = 1; corte < palabras.length; corte += 1) {
    const a = palabras.slice(0, corte).join(' ');
    const b = palabras.slice(corte).join(' ');
    if (anchoBold(a, size, 0.9) > maxW || anchoBold(b, size, 0.9) > maxW) continue;
    const delta = Math.abs(anchoBold(a, size, 0.9) - anchoBold(b, size, 0.9));
    if (delta < mejorDelta) {
      mejorDelta = delta;
      mejor = [a, b];
    }
  }
  return mejor ?? [txt];
}

/**
 * Cuerpo y líneas del nombre de la portada, ya resueltos. La vista previa
 * consume exactamente este mismo resultado para que pantalla y papel coincidan.
 */
export function coverNameLayout(nombre: string, maxW = CATALOG_COVER.nameW): {
  size: number;
  lines: string[];
  /** Línea base (mm) de cada línea, de arriba abajo. */
  baselines: number[];
} {
  let size = coverNameSize(nombre, maxW);
  let lines = coverNameLines(nombre, size, maxW);
  if (lines.length > 1) {
    // Dos líneas: el cuerpo tiene que caber en la banda libre.
    size = Math.min(size, CATALOG_COVER.nameTwoLineMax);
    lines = coverNameLines(nombre, size, maxW);
  }
  if (lines.length === 1) return { size, lines, baselines: [CATALOG_COVER.nameY] };

  // Dos líneas centradas verticalmente en la banda libre.
  const alto = CATALOG_COVER.nameGap;
  const totalAlto = (lines.length - 1) * alto;
  const top = (CATALOG_COVER.nameTopY + CATALOG_COVER.nameBottomY) / 2 - totalAlto / 2;
  return { size, lines, baselines: lines.map((_, i) => top + i * alto) };
}

/** "25 de septiembre de 2026" (es-PE). */
export function catalogDateLabel(fecha: Date = new Date()): string {
  const d = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "2026-09-25" para el nombre del archivo. */
function stampArchivo(fecha: Date): string {
  const d = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "Apiarios Carrión" → "apiarios-carrion" (minúsculas, sin acentos, guiones). */
function slugEmpresa(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Nombre del archivo: "catalogo-[nombre-empresa]-[fecha].pdf". */
export function catalogFileName(branding?: Partial<CatalogPdfBranding> | null): string {
  const empresa = (branding?.nombreEmpresa || DEFAULT_COMPANY).trim();
  return `catalogo-${slugEmpresa(empresa)}-${stampArchivo(branding?.fecha ?? new Date())}.pdf`;
}

/** Recorta (sin romper palabra) a un ancho aproximado en caracteres. */
export function recorta(s: string, max = 48): string {
  const t = textoPdf(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '').trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ------------------------------------------------------------------
   IMÁGENES
   ------------------------------------------------------------------ */

/** SVG de la abeja: logo por defecto cuando no hay logo configurado. */
const BEE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F3D78C"/>
      <stop offset=".5" stop-color="#D9A94F"/>
      <stop offset="1" stop-color="#A97A25"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#g)" stroke-linecap="round" stroke-linejoin="round">
    <path stroke-width="4" d="M42 28 L18 8 L25 31 Z"/>
    <path stroke-width="4" d="M39 37 L10 24 L23 43 Z"/>
    <path stroke-width="3.5" d="M40 45 L18 48 L31 57 Z"/>
    <path stroke-width="4" d="M42 26 L56 21 L64 34 L56 46 L42 46 L36 36 Z"/>
    <path stroke-width="4" d="M62 18 Q74 15 76 27 Q77 36 67 38 Q60 39 59 30 Q58 22 62 18 Z"/>
    <path stroke-width="3.5" d="M66 15 L72 5"/>
    <path stroke-width="3.5" d="M73 17 L81 9"/>
    <path stroke-width="4" d="M38 48 Q27 58 29 74 L31 85 Q44 75 46 59 L46 50"/>
    <path stroke-width="3" d="M32 60 L45 58"/>
    <path stroke-width="3" d="M31 68 L43 66"/>
    <path stroke-width="3" d="M33 76 L40 74"/>
    <path stroke-width="5" d="M86 58 A16 16 0 1 0 86 80"/>
    <path stroke-width="4" d="M60 86 L53 100"/>
    <path stroke-width="4" d="M67 91 L73 100"/>
  </g>
</svg>`;

/** Caché de imágenes rasterizadas por URL + tamaño (evita repetir el decode). */
const rasterCache = new Map<string, string | null>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Las imágenes remotas se piden con CORS para poder leer el canvas
    // (si el servidor no lo permite, se degrada a placeholder: nunca
    // rompe la generación del PDF).
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
    }
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}

/**
 * Rasteriza una imagen a un JPEG cuadrado de `sizePx` (encuadre centrado
 * tipo object-cover, el mismo criterio que la tienda). Devuelve null si la
 * imagen no existe o el navegador bloquea su lectura (CORS), en cuyo caso
 * el llamador dibuja un placeholder con la marca.
 */
async function rasterize(src: string, sizePx: number): Promise<string | null> {
  const clean = (src || '').trim();
  if (!clean || clean === 'data:,') return null;
  const key = `${clean}@${sizePx}`;
  const cached = rasterCache.get(key);
  if (cached !== undefined) return cached;

  let out: string | null = null;
  try {
    const img = await loadImage(clean);
    const w = img.naturalWidth || sizePx;
    const h = img.naturalHeight || sizePx;
    const side = Math.min(w, h);
    const sx = (w - side) / 2;
    const sy = (h - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Fondo crema: si la foto es transparente, no sale negro al imprimir.
    ctx.fillStyle = '#f7f1e3';
    ctx.fillRect(0, 0, sizePx, sizePx);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, sizePx, sizePx);
    // JPEG ~0.86: calidad de impresión sin inflar el peso del archivo.
    out = canvas.toDataURL('image/jpeg', 0.86);
  } catch {
    out = null;
  }
  rasterCache.set(key, out);
  return out;
}

/** El mismo SVG de la abeja, listo para un `img src`: el PDF lo rasteriza a
 *  PNG y la vista previa lo pinta en vector, de modo que ambos salen de una
 *  sola fuente y se ven iguales. */
export const BEE_SVG_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BEE_SVG)}`;

let cachedBeeLogo: string | null = null;

/**
 * Logo de marca para el PDF: el SVG de la abeja rasterizado a PNG con fondo
 * transparente.
 *
 * Antes se usaba `branding.logoUrl` pasado por `rasterize()`, que hace un
 * recorte cuadrado y devuelve JPEG. De ahi venia el aspecto de "foto
 * recortada": una imagen de catálogo comprimida, recortada al centro y
 * rasterizada a JPEG queda pixelada al imprimirse a 13 mm. Aqui no hay
 * recorte (el viewBox del SVG ya es cuadrado) ni JPEG (PNG conserva el canal
 * alfa), y se rasteriza a 4x la resolución de impresión.
 */
async function resolveLogoPng(): Promise<string | null> {
  if (cachedBeeLogo) return cachedBeeLogo;
  try {
    const img = await loadImage(BEE_SVG_URL);
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    cachedBeeLogo = canvas.toDataURL('image/png');
    return cachedBeeLogo;
  } catch (error) {
    console.warn('[CATALOGO] No se pudo rasterizar el logo de marca:', error);
    return null;
  }
}

/* ------------------------------------------------------------------
   PAGINADO
   ------------------------------------------------------------------ */

/** Una página del libro. La portada y el prólogo no llevan rejilla. */
export type CatalogBookPage =
  | { kind: 'portada' }
  | { kind: 'prologo' }
  | {
      kind: 'categoria';
      categoria: string;
      productos: StoreProduct[];
      /** Primera página de la categoría: lleva la banda de título. */
      abre: boolean;
      /** Página de esta categoría (1-based). */
      n: number;
      /** Cuántas páginas ocupa la categoría en total. */
      total: number;
    };

/**
 * Índice de categorías con al menos un producto, en el orden de la tienda
 * (STORE_MACROS) y, detrás, cualquier categoría propia que no esté en él.
 */
function categoriasOrdenadas(products: StoreProduct[]): string[] {
  const presentes = new Set(products.map((p) => p.categoria));
  const conocidas = STORE_MACROS.map((m) => m.nombre).filter((n) => presentes.has(n));
  const extra = [...presentes].filter((n) => !conocidas.includes(n)).sort();
  return [...conocidas, ...extra];
}

/**
 * Arma el libro completo: portada, prólogo y luego los productos agrupados por
 * categoría real, abriendo cada categoría en una página nueva.
 */
export function catalogBookPages(products: StoreProduct[]): CatalogBookPage[] {
  const book: CatalogBookPage[] = [{ kind: 'portada' }, { kind: 'prologo' }];

  for (const categoria of categoriasOrdenadas(products)) {
    const propios = products.filter((p) => p.categoria === categoria);
    // La apertura de categoría admite menos productos: lleva la banda de título.
    const primero = CATALOG_PER_PAGE_SECTION;
    const trozos: StoreProduct[][] = [propios.slice(0, primero)];
    for (let i = primero; i < propios.length; i += CATALOG_PER_PAGE) {
      trozos.push(propios.slice(i, i + CATALOG_PER_PAGE));
    }
    for (const productos of trozos) {
      if (productos.length === 0) continue;
      book.push({
        kind: 'categoria',
        categoria,
        productos,
        abre: productos === trozos[0],
        n: 0,
        total: trozos.length,
      });
    }
  }

  // Numera las páginas dentro de cada categoría.
  const porCategoria = new Map<string, number>();
  for (const pg of book) {
    if (pg.kind !== 'categoria') continue;
    const n = (porCategoria.get(pg.categoria) ?? 0) + 1;
    porCategoria.set(pg.categoria, n);
    pg.n = n;
  }
  return book;
}

/** Una línea del índice de contenidos del prólogo. */
export interface CatalogIndiceEntry {
  categoria: string;
  /** Productos de la categoría en todo el catálogo. */
  productos: number;
  /** Página del PDF donde empieza la categoría (1-based, portada = 1). */
  pagina: number;
  /** Páginas que ocupa la categoría. */
  hojas: number;
}

/** Índice de contenidos del prólogo: una fila por categoría, con su número
 *  de productos y la página donde empieza. */
export function catalogIndice(book: CatalogBookPage[]): CatalogIndiceEntry[] {
  const filas: CatalogIndiceEntry[] = [];
  for (const [i, pg] of book.entries()) {
    if (pg.kind !== 'categoria') continue;
    const previa = filas[filas.length - 1];
    if (previa && previa.categoria === pg.categoria) {
      previa.productos += pg.productos.length;
      continue;
    }
    filas.push({ categoria: pg.categoria, productos: pg.productos.length, pagina: i + 1, hojas: pg.total });
  }
  return filas;
}

/* ------------------------------------------------------------------
   DIBUJO — primitivas
   ------------------------------------------------------------------ */

/** Polígono regular de `lados` lados centrado en (cx, cy). */
function polyPoints(
  cx: number,
  cy: number,
  r: number,
  lados: number,
  giro = -90
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < lados; i += 1) {
    const a = (Math.PI / 180) * ((360 / lados) * i + giro);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/** Contorno de un polígono. */
function drawPolygon(
  doc: jsPDF,
  pts: [number, number][],
  lw = 0.3,
  close = true
): void {
  doc.setLineWidth(lw);
  for (let i = 0; i < pts.length - (close ? 0 : 1); i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    doc.line(x1, y1, x2, y2);
  }
}

/** Rombo relleno (motivo de acento en la portada y el prólogo). */
function drawDiamond(doc: jsPDF, cx: number, cy: number, r: number, c: [number, number, number]): void {
  const pts = polyPoints(cx, cy, r, 4, -90);
  doc.setFillColor(c[0], c[1], c[2]);
  for (let i = 0; i < 4; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 4];
    doc.line(x1, y1, x2, y2);
  }
}

/** Relleno de placeholder cuando el producto no tiene imagen legible. */
function drawPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  color: [number, number, number]
): void {
  doc.setFillColor(248, 243, 231);
  doc.rect(x, y, size, size, 'F');
  // Hexágono hueco: reutiliza el motivo del tema sin depender de la foto.
  doc.setDrawColor(color[0], color[1], color[2]);
  drawPolygon(doc, polyPoints(x + size / 2, y + size / 2, size * 0.26, 6), 0.35);
}

/** Precio de un producto: "S/ 25" o "A consultar". */
function precioLinea(p: StoreProduct): string {
  if (esPrecioConsultar(p)) return 'A consultar';
  return formatSoles(p.precio);
}

interface ResolvedBranding {
  nombre: string;
  tagline: string;
  ubicacion: string;
  honey: [number, number, number];
  deep: [number, number, number];
  fecha: Date;
  pie: string;
}

function resolveBranding(branding?: CatalogPdfBranding | null): ResolvedBranding {
  // Todo el texto de marca pasa por `textoPdf`: si el nombre, el tagline o la
  // ubicación traeran un carácter fuera de WinAnsi, contaminaría todas las
  // páginas del documento.
  const nombre = textoPdf(branding?.nombreEmpresa || DEFAULT_COMPANY) || DEFAULT_COMPANY;
  const ubicacion = textoPdf(branding?.ubicacion || DEFAULT_LOCATION) || DEFAULT_LOCATION;
  const tagline = textoPdf(branding?.tagline || CATALOG_TAGLINE) || CATALOG_TAGLINE;
  return {
    nombre,
    tagline,
    ubicacion,
    honey: hexToRgb(branding?.primario || HONEY),
    deep: hexToRgb(branding?.secundario || DEEP),
    fecha: branding?.fecha ?? new Date(),
    pie: `${nombre} · ${tagline} · ${ubicacion}`,
  };
}

/** Header de marca: se dibuja en las páginas de contenido. */
function drawHeader(doc: jsPDF, b: ResolvedBranding, logoUrl: string | null): void {
  const { margin, headerH, pageW } = CATALOG_METRICS;
  const C = CATALOG_CHROME;
  const logoSize = C.logo;

  if (logoUrl) {
    doc.addImage(logoUrl, 'PNG', margin, margin + C.logoTop, logoSize, logoSize);
  } else {
    drawPlaceholder(doc, margin, margin + C.logoTop, logoSize, b.honey);
  }

  const textX = margin + logoSize + C.gap;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
  doc.text(recorta(b.nombre.toUpperCase(), 30), textX, margin + C.nameY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(
    recorta(`${b.tagline.toUpperCase()} · ${b.ubicacion.toUpperCase()}`, 54),
    textX,
    margin + C.taglineY
  );

  // Lado derecho: tipo de documento + fecha de generación.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
  doc.text('CATÁLOGO', pageW - margin, margin + C.docY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(`Fecha: ${catalogDateLabel(b.fecha)}`, pageW - margin, margin + C.dateY, { align: 'right' });

  // Separador bajo el header.
  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, margin + headerH - C.headerRuleDY, pageW - margin, margin + headerH - C.headerRuleDY);
}

/** Footer: branding de la marca a la izquierda, "Página X de Y" a la derecha. */
function drawFooter(doc: jsPDF, b: ResolvedBranding, pageIndex: number, totalPages: number): void {
  const { margin, footerH, pageW, pageH } = CATALOG_METRICS;
  const base = pageH - margin - footerH;
  const y = base + CATALOG_CHROME.footerTextDY;

  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, base + CATALOG_CHROME.footerRuleDY, pageW - margin, base + CATALOG_CHROME.footerRuleDY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(recorta(b.pie, 62), margin, y);
  doc.text(`Página ${pageIndex + 1} de ${totalPages}`, pageW - margin, y, { align: 'right' });
}

/**
 * Texto sobre un arco, letra a letra: jspdf no tiene texto curvado, así que
 * se coloca cada carácter en su punto del círculo y se orienta tangente.
 * `centro` va en grados, medidos desde las 12 en punto y en sentido horario.
 * `invertir` dibuja el arco inferior (las letras "miran" hacia el centro).
 *
 * El centrado y el apoyo se calculan aquí a mano (`align` y `baseline` de
 * jspdf desplazan en los ejes de la página, no en los del glifo, así que en
 * un arcometerían la caja), con lo que las mayúsculas quedan centradas
 * exactamente sobre la circunferencia.
 */
function drawArcText(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  texto: string,
  centro: number,
  size: number,
  color: [number, number, number],
  invertir = false
): void {
  const t = textoPdf(texto).toUpperCase();
  const chars = [...t];
  const charSpace = (size * 0.14 * 25.4) / 72; // pt → mm
  const halfCap = (size * 0.3585 * 25.4) / 72; // media caja alta de Helvetica, pt → mm

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);

  const anchos = chars.map((c) => doc.getTextWidth(c) + charSpace);
  const total = anchos.reduce((acc, w) => acc + w, 0) / r; // radianes
  // El arco de abajo se recorre al revés: en la circunferencia, avanzar en el
  // sentido horario es ir de izquierda a derecha por arriba y al revés por
  // debajo, y es lo que hace que las dos frases se lean del derecho.
  const dir = invertir ? -1 : 1;
  let a = (centro * Math.PI) / 180 - (dir * total) / 2;

  for (let i = 0; i < chars.length; i += 1) {
    const ang = a + (dir * anchos[i]) / 2 / r; // centro del carácter
    // Rotación visual del glifo: en el arco de arriba, el ángulo medido desde
    // las 12; en el de abajo, el mismo menos 180°, para que las letras miren
    // hacia el centro. `rotationDirection: 0` gira en sentido horario, pero
    // jsPDF invierte el ángulo al construir la matriz, de ahí el signo.
    const rot = (ang * 180) / Math.PI - (invertir ? 180 : 0);
    const rad = (rot * Math.PI) / 180;
    const px = cx + r * Math.sin(ang);
    const py = cy - r * Math.cos(ang);
    // Punto del arco, menos media caja en la tangente (para centrar la letra a
    // lo largo del arco) y menos media caja alta sobre la normal (para
    // centrarla sobre la circunferencia).
    const x = px - halfCap * Math.sin(rad) - (anchos[i] / 2) * Math.cos(rad);
    const y = py + halfCap * Math.cos(rad) - (anchos[i] / 2) * Math.sin(rad);
    doc.text(chars[i], x, y, { angle: -rot, rotationDirection: 0 });
    a += (dir * anchos[i]) / r;
  }
}

/**
 * Rótulo centrado en un eje, con espaciado entre letras_opticamente exacto.
 *
 * `doc.text(..., { align: 'center' })` no sirve para esto: el ancho con el que
 * jspdf centra sale de `getStringUnitWidth()`, que para las fuentes estándar
 * IGNORA el espaciado entre letras, mientras que el OPERADOR `Tc` sí lo aplica
 * (y lo aplica en puntos, multiplicando por 72/25.4). Resultado: cada rótulo
 * con tracking se va a la derecha, y cuanto más larga la frase peor
 * ("CATÁLOGO DE PRODUCTOS" se iba más de 20 mm).
 *
 * Aquí se mide el ancho VISIBLE —los glifos más los n-1 huecos que sí se
 * ven, el último no cuenta porque no dibuja nada— y se dibuja alineado a la
 * izquierda desde `eje - ancho / 2`. El espaciado se pasa ya en mm.
 */
function textoCentrado(
  doc: jsPDF,
  txt: string,
  eje: number,
  y: number,
  charSpacePt = 0
): void {
  const cs = (charSpacePt * 25.4) / 72; // pt → mm, que es la unidad de `Tc`
  const n = [...txt].length;
  const glifos = doc.getTextWidth(txt);
  const visible = glifos + Math.max(0, n - 1) * cs;
  doc.text(txt, eje - visible / 2, y, { align: 'left', charSpace: cs });
}

/**
 * PORTADA: hoja de marca. Fondo crema, doble marco dorado con esquineras,
 * logo de la abeja suelto (sin plato ni aro) y jerarquía de título. Sin
 * rejilla ni paginación, como el resto de las hojas editoriales.
 */
function drawCover(
  doc: jsPDF,
  b: ResolvedBranding,
  logoPng: string | null,
  resumen: { total: number; categorias: number }
): void {
  const { pageW, pageH } = CATALOG_METRICS;
  const C = CATALOG_COVER;
  const cx = C.plateCx;

  // Fondo crema: el papel deja de ser un A4 vacío.
  doc.setFillColor(252, 248, 241);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Marcos concéntricos + filetes de esquina.
  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.7);
  doc.rect(C.frame, C.frame, pageW - C.frame * 2, pageH - C.frame * 2, 'S');
  doc.setLineWidth(0.25);
  doc.rect(C.frame2, C.frame2, pageW - C.frame2 * 2, pageH - C.frame2 * 2, 'S');

  // Esquineras en L, el detalle que da aire de documento engraved.
  doc.setLineWidth(0.6);
  const arms: [number, number, number, number][] = [
    [C.bracket, C.bracket, 1, 1],
    [pageW - C.bracket, C.bracket, -1, 1],
    [C.bracket, pageH - C.bracket, 1, -1],
    [pageW - C.bracket, pageH - C.bracket, -1, -1],
  ];
  for (const [ax, ay, sx, sy] of arms) {
    doc.line(ax, ay, ax + C.bracketArm * sx, ay);
    doc.line(ax, ay, ax, ay + C.bracketArm * sy);
  }

  // Filete superior con rombo: abre la composición.
  doc.setLineWidth(0.3);
  doc.line(cx - 34, C.topRuleY, cx - 3, C.topRuleY);
  doc.line(cx + 3, C.topRuleY, cx + 34, C.topRuleY);
  drawDiamond(doc, cx, C.topRuleY, 1.7, b.honey);

  const logoSize = C.logo;
  if (logoPng) {
    doc.addImage(logoPng, 'PNG', C.plateCx - logoSize / 2, C.plateCy - logoSize / 2, logoSize, logoSize);
  } else {
    drawPlaceholder(doc, C.plateCx - logoSize / 2, C.plateCy - logoSize / 2, logoSize, b.honey);
  }

  // Nombre de la empresa: el cuerpo se ajusta al ancho del marco y, si no cabe
  // en una línea, se reparte en dos antes de imprimirse.
  const nombre = b.nombre.toUpperCase();
  const nombreLayout = coverNameLayout(nombre);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(nombreLayout.size);
  doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
  nombreLayout.lines.forEach((linea, i) => {
    textoCentrado(doc, linea, cx, nombreLayout.baselines[i], 0.9);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  textoCentrado(doc, recorta(`${b.tagline} · ${b.ubicacion}`.toUpperCase(), 52), cx, C.taglineY, 0.7);

  // Ornamento central: filete interrupted por un rombo.
  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.3);
  doc.line(cx - 30, C.ornamentY, cx - 4, C.ornamentY);
  doc.line(cx + 4, C.ornamentY, cx + 30, C.ornamentY);
  drawDiamond(doc, cx, C.ornamentY, 1.6, b.deep);

  // Título del documento.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  textoCentrado(doc, 'CATÁLOGO DE PRODUCTOS', cx, C.titleY, 2.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  textoCentrado(doc, catalogDateLabel(b.fecha), cx, C.dateY, 0.4);

  doc.setFontSize(8);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  const plural = resumen.total === 1 ? '' : 's';
  textoCentrado(
    doc,
    recorta(
      `Edición ${b.fecha.getFullYear()} · ${resumen.total} producto${plural} · ${resumen.categorias} familia${resumen.categorias === 1 ? '' : 's'}`,
      60
    ),
    cx,
    C.resumenY,
    0.5
  );

  // Nota de cierre: el catálogo es una guía, no un inventario en vivo.
  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.3);
  doc.line(cx - 40, C.noteRuleY, cx + 40, C.noteRuleY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  const nota = CATALOG_TEXTOS.notaCierre;
  let ny = C.noteY;
  for (const linea of doc.splitTextToSize(nota, C.noteW)) {
    textoCentrado(doc, linea, cx, ny);
    ny += 4;
  }

  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.25);
  doc.line(cx - 30, C.footRuleY, cx + 30, C.footRuleY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  textoCentrado(doc, recorta(`${b.nombre} · ${b.ubicacion}`, 46), cx, C.footY);
}

/**
 * Geometría del prólogo, en mm absolutos de la hoja. La comparten el PDF y la
 * vista previa.
 */
export const CATALOG_PROLOGUE = {
  eyebrowY: 38,
  titleY: 50,
  ruleY: 55,
  bodyY: 64,
  /** Columna de texto justificado. */
  textW: 134,
  bodySize: 10.5,
  lead: 5.7,
  paraGap: 4.6,
  /** Raíl lateral de datos. */
  railRuleX: 150,
  railX: 154,
  railW: 46,
  /** Índice de contenidos, a todo el ancho. */
  indexY: 206,
  indexRowH: 8.4,
  indexMaxRows: 5,
} as const;

/**
 * Los cuatro párrafos del prólogo, con los datos reales del catálogo. Los usa
 * el PDF y también la vista previa: si el texto viviera en los dos sitios,
 * acabarían divergiendo (y el prólogo es justo donde se colaron antes los
 * caracteres corruptos).
 */
export function catalogPrologoParrafos(
  nombreEmpresa: string,
  ubicacion: string,
  total: number,
  familias: number
): string[] {
  const nombre = textoPdf(nombreEmpresa) || DEFAULT_COMPANY;
  const firma = textoPdf(ubicacion).split('·')[0].trim() || 'la sierra';
  return [
    `Desde ${firma}, ${nombre} trabaja con la miel y los productos de la colmena como lo que son: el resultado de una estación entera, de una flora concreta y de manos que saben esperar. Este catálogo reúne ${total} producto${total === 1 ? '' : 's'} ordenados en ${familias} familia${familias === 1 ? '' : 's'}.`,
    'Los productos naturales —mieles, polen, propóleo y jalea real— se elaboran de forma artesanal y en su mejor momento, cuando la cosecha es más generosa y la humedad es la correcta. Los equipos y las herramientas están elegidos para durar en el taller: preferimos pocas piezas que se puedan reparar a muchas que haya que sustituir.',
    'El material biológico requiere su tiempo. Por eso lo trabajamos por encargo y por temporada, indicándote la fecha de entrega en cada consulta. No es una demora: es la forma en que la colmena avisa que está lista.',
    'Este documento es una guía de referencia, no un inventario en tiempo real. Los precios y las cantidades disponibles pueden variar; confírmalos con nosotros antes de cerrar un pedido. Para cualquier consulta sobre pedidos al por mayor, transporte o un pedido personalizado, escríbenos. Estaremos encantados de ayudarte.',
  ];
}

/** PRÓLOGO: hoja editorial con el texto de presentación de la marca, un raíl
 *  de datos a la derecha y el índice de contenidos al pie. */
function drawPrologue(
  doc: jsPDF,
  b: ResolvedBranding,
  indice: CatalogIndiceEntry[],
  logoPng: string | null,
  totalPages: number
): void {
  const { margin, pageW, gridW } = CATALOG_METRICS;
  const P = CATALOG_PROLOGUE;
  const total = indice.reduce((acc, e) => acc + e.productos, 0);
  const familias = indice.length;

  // --- Cabecera del bloque ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
  doc.text('P R E S E N T A C I Ó N', margin, P.eyebrowY, { charSpace: 0.8 });

  doc.setFontSize(24);
  doc.text('Prólogo', margin, P.titleY);

  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, P.ruleY, margin + gridW, P.ruleY);
  doc.setLineWidth(0.8);
  doc.line(margin, P.ruleY, margin + 34, P.ruleY);

  // --- Columna de texto ---
  const parrafos = catalogPrologoParrafos(b.nombre, b.ubicacion, total, familias);

  const limite = P.indexY - 16;
  let y = P.bodyY;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(P.bodySize);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  for (const p of parrafos) {
    const lineas: string[] = doc.splitTextToSize(textoPdf(p), P.textW);
    lineas.forEach((linea, i) => {
      if (y > limite) return;
      // Justificado: jspdf reparte el sobrante entre las palabras salvo en la
      // última línea del párrafo, que se queda ragged.
      const ultima = i === lineas.length - 1;
      if (ultima || !/\s/.test(linea)) doc.text(linea, margin, y);
      else doc.text(linea, margin, y, { align: 'justify', maxWidth: P.textW });
      y += P.lead;
    });
    y += P.paraGap;
  }

  // --- Firma ---
  if (y < limite) {
    y += 4;
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(10);
    doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
    doc.text(b.nombre, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(b.ubicacion, margin, y + 4.4);
  }

  drawPrologueRail(doc, b, total, familias);

  // --- Índice de contenidos ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
  doc.text('Í N D I C E   D E   C O N T E N I D O S', margin, P.indexY, { charSpace: 0.6 });

  const filas = indice.slice(0, P.indexMaxRows);
  const ocultas = indice.length - filas.length;
  let ry = P.indexY + 4;
  for (const fila of [...filas]) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(recorta(fila.categoria, 40), margin, ry + 3);

    const plural = fila.productos === 1 ? '' : 's';
    const hojas = fila.hojas > 1 ? ` · ${fila.hojas} páginas` : '';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`${fila.productos} producto${plural}${hojas} · pág. ${fila.pagina}`, pageW - margin, ry + 3, {
      align: 'right',
    });

    doc.setDrawColor(RULE_RGB[0], RULE_RGB[1], RULE_RGB[2]);
    doc.setLineWidth(0.15);
    doc.line(margin, ry + P.indexRowH - 1.6, margin + gridW, ry + P.indexRowH - 1.6);
    ry += P.indexRowH;
  }
  if (ocultas > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`y ${ocultas} familia${ocultas === 1 ? '' : 's'} más`, margin, ry + 3);
  }

  // El prólogo es una hoja de contenido más: mismo header y pie que el resto.
  drawHeader(doc, b, logoPng);
  drawFooter(doc, b, 1, totalPages);
}

/** Raíl lateral del prólogo: datos del catálogo, nota de contacto y ornamento. */
function drawPrologueRail(
  doc: jsPDF,
  b: ResolvedBranding,
  total: number,
  familias: number
): void {
  const P = CATALOG_PROLOGUE;
  const { x, w } = { x: P.railX, w: P.railW };
  const nota = CATALOG_TEXTOS.notaRail;

  let y = P.bodyY;
  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.25);
  doc.line(P.railRuleX, P.bodyY - 4, P.railRuleX, P.indexY - 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
  doc.text('E N   E S T E   C A T Á L O G O', x, y, { charSpace: 0.4 });
  doc.setLineWidth(0.5);
  doc.line(x, y + 2.6, x + 18, y + 2.6);
  y += 10;

  const datos: [string, string][] = [
    ['Productos', String(total)],
    ['Familias', String(familias)],
    ['Edición', String(b.fecha.getFullYear())],
  ];
  for (const [label, valor] of datos) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(label.toUpperCase(), x, y, { charSpace: 0.5 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
    doc.text(valor, x, y + 4.6);
    y += 12.4;
  }

  doc.setDrawColor(RULE_RGB[0], RULE_RGB[1], RULE_RGB[2]);
  doc.setLineWidth(0.2);
  doc.line(x, y - 4, x + w, y - 4);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  for (const linea of doc.splitTextToSize(textoPdf(nota), w)) {
    doc.text(linea, x, y + 1);
    y += 3.8;
  }

  // Ornamento: hexágono con rombos, el motivo de la colmena.
  const oy = Math.max(y + 10, P.indexY - 26);
  const cx = x + w / 2;
  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.3);
  doc.line(x + 4, oy, cx - 11, oy);
  doc.line(cx + 11, oy, x + w - 4, oy);
  drawPolygon(doc, polyPoints(cx, oy, 7, 6), 0.45);
  drawDiamond(doc, cx, oy, 1.6, b.deep);
  drawDiamond(doc, cx - 10, oy, 1.1, b.honey);
  drawDiamond(doc, cx + 10, oy, 1.1, b.honey);
}

/** BANDA DE SECCIÓN: título de la categoría sobre su primera página de productos. */
function drawSectionBand(
  doc: jsPDF,
  b: ResolvedBranding,
  categoria: string,
  cantidad: number,
  pagina: number,
  total: number
): void {
  const { margin, gridW, pageW } = CATALOG_METRICS;
  const box = catalogBandBox(CATALOG_SECTION_METRICS, true);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
  doc.text(recorta(categoria, 34), margin, box.titleY, { charSpace: 0.5 });

  const etiqueta = `${cantidad} producto${cantidad === 1 ? '' : 's'}`;
  const cola =
    total > 1 ? ` · página ${pagina} de ${total}` : '';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(`${etiqueta}${cola}`, pageW - margin, box.metaY, { align: 'right' });

  doc.setDrawColor(b.honey[0], b.honey[1], b.honey[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, box.ruleY, margin + gridW, box.ruleY);
}

/** Etiqueta discreta de "continuación" en páginas que no abren categoría. */
function drawContinuationTag(
  doc: jsPDF,
  b: ResolvedBranding,
  categoria: string,
  pagina: number,
  total: number
): void {
  const { margin, pageW } = CATALOG_METRICS;
  const box = catalogBandBox(CATALOG_METRICS, false);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(b.deep[0], b.deep[1], b.deep[2]);
  doc.text(recorta(categoria, 34), margin, box.titleY, { charSpace: 0.4 });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(`continuación · página ${pagina} de ${total}`, pageW - margin, box.metaY, { align: 'right' });
}

/**
 * Rejilla de productos que se ajusta al número exacto de productos de la
 * página: sólo se dibujan los bordes de las celdas REALMENTE ocupadas, así
 * que no quedan huecos enmarcados ni renglones colgando al final. La rejilla
 * arranca pegada a la banda de sección y el sobrante de la última fila queda
 * como aire: con la paginación actual (20 productos al abrir categoría y 24 en
 * las siguientes) una fila a medias sólo puede darse en la última página de la
 * categoría, que no tiene a dónde continuar.
 */
function drawGrid(
  doc: jsPDF,
  productos: StoreProduct[],
  m: CatalogMetrics,
  b: ResolvedBranding,
  options: CatalogPdfOptions,
  thumbs: Map<string, string | null>
): void {
  const cols = m.cols;
  const total = productos.length;
  if (total === 0) return;

  const usadas = Math.ceil(total / cols);
  const enUltima = total % cols; // celdas ocupadas en la última fila
  const anchoUltima = enUltima === 0 ? cols : enUltima;
  const bottom = m.gridY + usadas * m.cellH;

  doc.setDrawColor(RULE_RGB[0], RULE_RGB[1], RULE_RGB[2]);
  doc.setLineWidth(0.15);

  // Verticales: las de las filas completas, más el borde derecho de la última.
  // El divisor entre la última fila y el aire sobrante sólo arranca en esa
  // fila; si la última fila está completa, todos los bordes van de arriba abajo.
  const topUltima = m.gridY + (usadas - 1) * m.cellH;
  for (let c = 0; c < anchoUltima; c += 1) {
    const x = m.gridX + c * m.cellW;
    doc.line(x, enUltima > 0 && c === enUltima ? topUltima : m.gridY, x, bottom);
  }
  doc.line(m.gridX + anchoUltima * m.cellW, m.gridY, m.gridX + anchoUltima * m.cellW, bottom);

  // Horizontales: a todo el ancho entre filas, y el pie sólo de lo ocupado.
  for (let r = 0; r < usadas; r += 1) {
    const y = m.gridY + r * m.cellH;
    const ancho = r === usadas - 1 ? anchoUltima * m.cellW : m.gridW;
    doc.line(m.gridX, y, m.gridX + ancho, y);
  }

  for (let k = 0; k < total; k += 1) {
    const col = k % cols;
    const row = Math.floor(k / cols);
    drawCell(
      doc,
      productos[k],
      m.gridX + col * m.cellW,
      m.gridY + row * m.cellH,
      m.cellW,
      b,
      options,
      thumbs.get(productos[k].id) ?? null
    );
  }
}

/** Una celda del grid: imagen, nombre, precio, unidad y (opcional) stock. */
function drawCell(
  doc: jsPDF,
  p: StoreProduct,
  x: number,
  y: number,
  cellW: number,
  b: ResolvedBranding,
  options: CatalogPdfOptions,
  thumb: string | null
): void {
  const innerW = cellW - CATALOG_CELL_PAD * 2;

  // Con stock la imagen cede alto para que quepan las 4 líneas de texto.
  const imgH = options.mostrarStock ? CATALOG_THUMB_H_STOCK : CATALOG_THUMB_H;
  const imgW = Math.min(imgH, innerW);
  const imgX = x + (cellW - imgW) / 2;
  const imgY = y + 2;

  if (thumb) {
    doc.addImage(thumb, 'JPEG', imgX, imgY, imgW, imgH);
  } else {
    drawPlaceholder(doc, imgX, imgY, imgW, b.honey);
  }

  let cursor = imgY + imgH + 2.4;

  // Nombre: hasta 2 líneas medidas con las métricas reales de la fuente.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const lines: string[] = doc.splitTextToSize(textoPdf(p.nombre) || 'Producto', innerW);
  const nameLines = lines.slice(0, 2);
  if (lines.length > 2 && nameLines.length === 2) {
    nameLines[1] = `${nameLines[1].replace(/[\s,;.]+$/, '')}…`;
  }
  nameLines.forEach((line: string) => {
    doc.text(line, x + cellW / 2, cursor, { align: 'center' });
    cursor += 3.3;
  });

  // Precio (o "A consultar" si el producto no tiene precio fijo).
  if (options.mostrarPrecios) {
    const consultar = esPrecioConsultar(p);
    doc.setFont('helvetica', consultar ? 'italic' : 'bold');
    doc.setFontSize(consultar ? 6.2 : 8);
    doc.setTextColor(consultar ? TEXT_MUTED[0] : b.deep[0], consultar ? TEXT_MUTED[1] : b.deep[1], consultar ? TEXT_MUTED[2] : b.deep[2]);
    doc.text(recorta(precioLinea(p), 22), x + cellW / 2, cursor, { align: 'center' });
    cursor += 4;
  }

  // Unidad.
  const unidad = textoPdf(p.unidad);
  if (unidad) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(recorta(unidad, 26), x + cellW / 2, cursor, { align: 'center' });
    cursor += 3.2;
  }

  // Stock (opcional).
  if (options.mostrarStock) {
    const sinStock = !p.stock || p.stock <= 0;
    doc.setFont('helvetica', sinStock ? 'bold' : 'normal');
    doc.setFontSize(5.8);
    if (sinStock) {
      doc.setTextColor(178, 70, 48);
    } else {
      doc.setTextColor(106, 122, 88);
    }
    doc.text(sinStock ? 'Agotado' : `Stock: ${p.stock}`, x + cellW / 2, cursor, { align: 'center' });
  }
}

/* ------------------------------------------------------------------
   API PÚBLICA
   ------------------------------------------------------------------ */

/** Total de productos de una categoría a lo largo de todas sus páginas. */
function countInCategory(paginas: Extract<CatalogBookPage, { kind: 'categoria' }>[], categoria: string): number {
  return paginas
    .filter((pg) => pg.categoria === categoria)
    .reduce((acc, pg) => acc + pg.productos.length, 0);
}

/**
 * Arma el documento completo (portada, prólogo y una sección por categoría) y
 * devuelve el `jsPDF` junto con los datos de la descarga. `downloadCatalogPdf`
 * sólo le añade el guardado; esta separación permite inspeccionar el PDF sin
 * dispararle la descarga al navegador.
 */
export async function buildCatalogDoc(
  products: StoreProduct[],
  branding?: CatalogPdfBranding | null,
  options: CatalogPdfOptions = CATALOG_DEFAULT_OPTIONS
): Promise<{ doc: jsPDF; archivo: string; totalPages: number }> {
  const b = resolveBranding(branding);
  const book = catalogBookPages(products);
  const paginas = book.filter((pg) => pg.kind === 'categoria') as Extract<
    CatalogBookPage,
    { kind: 'categoria' }
  >[];
  if (paginas.length === 0) throw new Error('No hay productos para el catálogo');

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  // 2 páginas editoriales (portada + prólogo) + las páginas de producto.
  const totalPages = paginas.length + 2;
  const indice = catalogIndice(book);

  // Logo vectorial, rasterizado a 512 px: 3.5x la resolución de impresión
  // del header de marca (13 mm ≈ 154 px a 300 dpi) y suficiente para la
  // portada, donde se imprime a 32 mm.
  const logoPng = await resolveLogoPng();

  // Miniaturas a 300 dpi sobre el lado mayor de la imagen dentro de la celda.
  const thumbPx = printPx(options.mostrarStock ? CATALOG_THUMB_H_STOCK : CATALOG_THUMB_H);
  const thumbs = new Map<string, string | null>();
  for (const pg of paginas) {
    for (const p of pg.productos) {
      if (!thumbs.has(p.id)) thumbs.set(p.id, await rasterize(p.imageUrl, thumbPx));
    }
  }

  /* --- Página 1: portada --- */
  drawCover(doc, b, logoPng, {
    total: products.length,
    categorias: indice.length,
  });

  /* --- Página 2: prólogo --- */
  doc.addPage();
  drawPrologue(doc, b, indice, logoPng, totalPages);

  /* --- Desde la 3: una sección por categoría --- */
  // Las dos primeras hojas (portada y prólogo) ya están emitidas, así que la
  // primera hoja de producto es la número 3: su índice 0-based es 2, que es
  // lo que espera el pie ("Página X de Y").
  for (let i = 0; i < paginas.length; i += 1) {
    const pg = paginas[i];
    doc.addPage();
    const pageIndex = i + 2;

    const m = pg.abre ? CATALOG_SECTION_METRICS : CATALOG_METRICS;
    if (pg.abre) {
      drawSectionBand(
        doc,
        b,
        pg.categoria,
        pg.total === 1 ? pg.productos.length : countInCategory(paginas, pg.categoria),
        pg.n,
        pg.total
      );
    } else {
      drawContinuationTag(doc, b, pg.categoria, pg.n, pg.total);
    }
    // La rejilla se ajusta a los productos de esta hoja: el sobrante de la
    // última fila se deja como aire, nunca como un hueco enmarcado.
    drawGrid(doc, pg.productos, m, b, options, thumbs);
    drawHeader(doc, b, logoPng);
    drawFooter(doc, b, pageIndex, totalPages);
  }

  return {
    doc,
    archivo: catalogFileName({ nombreEmpresa: b.nombre, fecha: b.fecha }),
    totalPages,
  };
}

/**
 * Genera el PDF del catálogo y lo descarga con el nombre
 * "catalogo-[nombre-empresa]-[fecha].pdf". Devuelve el nombre del archivo.
 */
export async function downloadCatalogPdf(
  products: StoreProduct[],
  branding?: CatalogPdfBranding | null,
  options: CatalogPdfOptions = CATALOG_DEFAULT_OPTIONS
): Promise<string> {
  const { doc, archivo, totalPages } = await buildCatalogDoc(products, branding, options);
  doc.save(archivo);
  console.log(`[CATALOGO] PDF generado: ${archivo} · ${products.length} productos · ${totalPages} página(s)`);
  return archivo;
}
