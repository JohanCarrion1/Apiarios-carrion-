// ============================================================
// GENERACIÓN DE PDF DE COTIZACIÓN (jspdf)
// ============================================================
// Hoja A4: logo (abeja rasterizada desde SVG), cabecera de marca,
// datos de la cotización, tabla de productos y total general.

import { jsPDF } from 'jspdf';
import type { Cotizacion } from '../types/cotizaciones';
import { formatearFechaCorta } from '../types/cotizaciones';
import { formatSoles } from '../types/store';

const HONEY = '#D9A94F';
const DEEP = '#B57E1C';
const INK = '#1A140D';
/** Dorado del logo (tono central del gradiente oro de la marca), para que el
 *  nombre de la empresa en el PDF coincida con el color del logo. */
const LOGO_GOLD = '#D9A94F';
/** Texto de contenido sobre blanco: gris oscuro cálido de alto contraste. */
const TEXT_DARK = [52, 47, 40] as const;

/** Branding aplicado al PDF (con defaults de "Apiarios Carrión"). */
export interface QuotePdfBranding {
  nombreEmpresa: string;
  /** Color primario (marca). */
  primario?: string;
  /** Color secundario (títulos). */
  secundario?: string;
  tagline?: string;
  /** Texto del pie de página. */
  footer?: string;
}

/** SVG de la abeja (idéntico al ícono compacto del Logo). */
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

let cachedLogo: string | null = null;

/** Rasteriza el SVG de la abeja a PNG (una sola vez) para incrustarlo en el PDF. */
async function getBeeLogoPng(): Promise<string> {
  if (cachedLogo) return cachedLogo;
  const svg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BEE_SVG)}`;
  const img = new Image();
  img.decoding = 'sync';
  img.src = svg;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo cargar el logo'));
  });
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 240, 240);
  cachedLogo = canvas.toDataURL('image/png');
  return cachedLogo;
}

/** Recorta (sin romper palabra) a un ancho aproximado en caracteres. */
function ellipsis(s: string, max = 48): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function wrap(s: string, maxChars: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Añade el logo de Apiarios Carrión como marca de agua centrada en la página. */
async function stampWatermark(doc: jsPDF): Promise<void> {
  try {
    const logo = await getBeeLogoPng();
    const size = 100;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.14 }));
    doc.addImage(logo, 'PNG', (pageW - size) / 2, (pageH - size) / 2, size, size);
    doc.restoreGraphicsState();
  } catch {
    // Sin marca de agua si el logo no está disponible.
  }
}

/** Genera y descarga el PDF de una cotización con el branding de la marca. */
export async function downloadQuotePdf(
  q: Cotizacion,
  branding?: QuotePdfBranding | null
): Promise<void> {
  const name = (branding?.nombreEmpresa || 'Apiarios Carrión').trim();
  const honey = branding?.primario || HONEY;
  const deep = branding?.secundario || DEEP;
  const tagline = (branding?.tagline || 'MIEL & PRODUCTOS NATURALES · HUARAZ · PERÚ').trim();
  const footer = (branding?.footer || `${name} · ${tagline}`).trim();

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;

  // Columnas de la tabla de productos.
  const colN = margin as number;
  const colNombre = 24;
  const colUnd = 96;
  const colCant = 122;
  const colPrecio = 148;
  const colSub = 178;

  await stampWatermark(doc);

  // ---- Cabecera de marca ---------------------------------------------------
  let y = 14;
  try {
    const logo = await getBeeLogoPng();
    doc.addImage(logo, 'PNG', margin, y, 20, 20);
  } catch {
    // Sin logo disponible: se omite, la cabecera textual es suficiente.
  }

  const [honeyR, honeyG, honeyB] = hexToRgb(honey);
  const [deepR, deepG, deepB] = hexToRgb(deep);
  const [inkR, inkG, inkB] = hexToRgb(INK);
  const [goldR, goldG, goldB] = hexToRgb(LOGO_GOLD);

  // ---- Paginación real -------------------------------------------------------
  // A4 = 210 x 297 mm y el pie se dibuja desde y=272. Antes las filas de la
  // tabla se imprimían hasta y=278 (encima de la línea del pie) y el bloque
  // TOTAL se limitaba con `if (y > 275) y = 275`, un recorte que machacaba la
  // caja del total contra el pie; las notas, además, se dibujaban sin ningún
  // control y se salían de la página. Ahora se pide espacio antes de escribir
  // y, si no cabe, se abre página con cabecera "(continuación)".
  const LIMITE_PIE = 272;
  const LIMITE_CONTENIDO = LIMITE_PIE - 6; // 266

  const dibujarCabeceraTabla = () => {
    doc.setFillColor(honeyR, honeyG, honeyB);
    doc.rect(margin, y - 5, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(inkR, inkG, inkB);
    doc.text('N°', colN + 2, y);
    doc.text('PRODUCTO', colNombre, y);
    doc.text('UND', colUnd, y);
    doc.text('CANT', colCant, y);
    doc.text('P. UNIT.', colPrecio, y);
    doc.text('SUBTOTAL', colSub, y);
  };

  /** Abre una página nueva con marca de agua, título de continuación y pie. */
  const nuevaPagina = async (titulo: string) => {
    doc.addPage();
    await stampWatermark(doc);
    y = 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(deepR, deepG, deepB);
    doc.text(`${titulo} (continuación)`, margin, y);
    y += 7;
  };

  /** Garantiza que `alto` mm caben por debajo de y; si no, salta de página. */
  const asegurarEspacio = async (alto: number) => {
    if (y + alto > LIMITE_CONTENIDO) {
      await nuevaPagina(`COTIZACIÓN ${toWinAnsi(q.numero)}`);
      dibujarCabeceraTabla();
      y += 7;
    }
  };

  /** Línea de pie + textos: se pinta en TODAS las páginas, no solo en la última. */
  const dibujarPie = () => {
    doc.setDrawColor(honeyR, honeyG, honeyB);
    doc.setLineWidth(0.4);
    doc.line(margin, LIMITE_PIE, pageW - margin, LIMITE_PIE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_DARK);
    doc.text(ellipsis(toWinAnsi(footer), 60), pageW / 2, LIMITE_PIE + 5, { align: 'center' });
    doc.text(
      `${toWinAnsi(q.numero)} · generada el ${formatearFechaCorta(q.fecha)}`,
      pageW / 2,
      LIMITE_PIE + 10,
      { align: 'center' }
    );
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(goldR, goldG, goldB);
  doc.text(ellipsis(name.toUpperCase(), 26), margin + 26, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(ellipsis(tagline.toUpperCase(), 42), margin + 26, 28);

  // Título derecho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(deepR, deepG, deepB);
  doc.text('COTIZACIÓN', pageW - margin, 20, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(deepR, deepG, deepB);
  doc.text(q.numero, pageW - margin, 27, { align: 'right' });

  // Línea separadora
  y = 40;
  doc.setDrawColor(honeyR, honeyG, honeyB);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);

  // ---- Datos de la cotización ---------------------------------------------
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(inkR, inkG, inkB);
  const fecha = `Fecha: ${formatearFechaCorta(q.fecha)}`;
  const validez = `Validez: ${q.validezDias} día${q.validezDias === 1 ? '' : 's'}`;
  doc.text(fecha, margin, y);
  doc.text(validez, pageW - margin, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_DARK);
  doc.text(
    q.clienteNombre ? `Cliente: ${ellipsis(toWinAnsi(q.clienteNombre), 60)}` : 'Cliente: —',
    margin,
    y
  );
  doc.text(
    q.clienteTelefono ? `Teléfono: ${toWinAnsi(q.clienteTelefono)}` : '',
    pageW - margin,
    y,
    { align: 'right' }
  );

  // ---- Tabla de productos ---------------------------------------------------
  y += 8;
  dibujarCabeceraTabla();
  y += 7;

  let row = 0;
  for (const p of q.productos) {
    // La banda de la fila ocupa y-5..y+1.5, así que se pide espacio para ella.
    await asegurarEspacio(8);
    row += 1;
    if (row % 2 === 0) {
      doc.setFillColor(246, 241, 227);
      doc.rect(margin, y - 5, contentW, 6, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(inkR, inkG, inkB);
    doc.text(String(row).padStart(2, '0'), colN + 2, y);
    doc.text(ellipsis(toWinAnsi(p.nombre), 34), colNombre, y);
    doc.text(toWinAnsi(p.unidad || '—'), colUnd, y);
    doc.text(String(p.cantidad), colCant, y);
    if (p.consultarPrecio) {
      doc.setTextColor(...TEXT_DARK);
      doc.text('—', colPrecio, y);
      doc.text('—', colSub, y);
    } else {
      doc.text(formatSoles(p.precio), colPrecio, y);
      doc.text(formatSoles(p.subtotal), colSub, y);
    }
    y += 6.5;
  }

  // ---- Total ----------------------------------------------------------------
  // Antes: `if (y > 275) y = 275` recortaba la caja contra la línea del pie.
  await asegurarEspacio(16);
  y += 3;
  doc.setFillColor(honeyR, honeyG, honeyB);
  doc.rect(pageW - margin - 52, y - 5, 52, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(inkR, inkG, inkB);
  doc.text('TOTAL', pageW - margin - 52 + 4, y + 0.5);
  doc.text(formatSoles(q.total), pageW - margin, y + 0.5, { align: 'right' });
  y += 12;

  // ---- Notas ----------------------------------------------------------------
  // Antes se dibujaban todas las líneas de golpe, sin paginar: un texto largo
  // se salía literalmente de la hoja.
  const notas = (q.notas || '').trim();
  if (notas) {
    await asegurarEspacio(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(deepR, deepG, deepB);
    doc.text('NOTAS', margin, y + 1);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(inkR, inkG, inkB);
    for (const l of wrap(toWinAnsi(notas), 78)) {
      await asegurarEspacio(5);
      doc.text(l, margin, y);
      y += 4.5;
    }
  }

  // ---- Pie en todas las páginas ----------------------------------------------
  // Antes se pintaba una sola vez, sobre la última página: en una cotización
  // de varias páginas, las anteriores quedaban sin pie (y la marca de agua se
  // repetía pero el pie no).
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i += 1) {
    doc.setPage(i);
    dibujarPie();
  }
  doc.setPage(totalPaginas);

  doc.save(`cotizacion-${q.numero}.pdf`);
}

/**
 * jsPDF escribe con las fuentes estándar en WinAnsi (cp1252). Cualquier carácter
 * fuera de ese juego (emoji, flechas, símbolos matemáticos) se codifica como
 * basura o directamente rompe el PDF. Aquí se traducen los más habituales a su
 * equivalente y se descarta el resto.
 */
const WINANSI_ALTOS = new Set([
  '€', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', 'Ž',
  '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', 'ž', 'Ÿ',
]);

/** Caracteres que sí existen en cp1252 y por tanto se pueden imprimir. */
function esWinAnsi(ch: string): boolean {
  if (WINANSI_ALTOS.has(ch)) return true;
  const code = ch.codePointAt(0) ?? 0;
  return code <= 0x7f || (code >= 0xa0 && code <= 0xff);
}

const ESPACIOS_ESPECIALES = new Set([
  ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
  ' ', ' ', ' ', ' ', ' ', ' ', ' ', '　',
]);

export function toWinAnsi(s: string): string {
  const REEMPLAZOS: Record<string, string> = {
    '→': '->',
    '←': '<-',
    '↑': '^',
    '↓': 'v',
    '≈': '~',
    '≤': '<=',
    '≥': '>=',
    '≠': '!=',
    '±': '+/-',
    '×': 'x',
    '✓': 'OK',
    '✔': 'OK',
    '✗': 'X',
    '✘': 'X',
    '✅': 'OK',
    '❌': 'X',
    '⭐': '*',
    '•': '-',
    '﻿': '',
  };
  let out = '';
  for (const ch of s) {
    if (ESPACIOS_ESPECIALES.has(ch)) {
      out += ' ';
      continue;
    }
    const rep = REEMPLAZOS[ch];
    if (rep !== undefined) {
      out += rep;
      continue;
    }
    if (esWinAnsi(ch)) {
      out += ch;
    }
    // Emoji y pictogramas: se descartan, no se intenta un reemplazo.
  }
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}