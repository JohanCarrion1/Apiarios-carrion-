// ============================================================
// CATÁLOGO — generador de catálogos PDF (exclusivo de admins)
// ============================================================
// Ruta: /admin/catalogo
// - Lee el catálogo vigente (productsService = fuente única de
//   verdad, el mismo store que la tienda y las cotizaciones).
// - Vista previa en pantalla que replica hoja por hoja el PDF final: se
//   dibuja con las MISMAS medidas en mm que usa el generador
//   (CATALOG_METRICS), así que lo que se ve es lo que se descarga.
// - Filtros opcionales: categoría, con/sin precios y con/sin stock.
// - El PDF es un libro: portada, prólogo y una sección por categoría; dentro
//   de cada sección la rejilla es de 4 × 6 y la página que abre categoría
//   lleva banda de título, por lo que caben 20 (4 × 5) productos.
// - "Generar PDF" abre un modal de selección para marcar exactamente qué
//   productos entran; los marcados se agrupan por categoría en el PDF.
// Acceso: SOLO usuarios presentes en la lista de admins (config/admins),
// igual que /admin/cotizaciones. Ver firestore.rules.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Package,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useScrollToTopOnMount } from '../hooks/useScrollToTopOnMount';
import { BRANDING } from '../lib/branding';
import { useAdminList, isEmailAdmin } from '../lib/adminAccess';
import { saveUltimaVista } from '../utils/lastView';
import * as productsService from '../lib/productsService';
import { emitGlobalToast } from '../lib/toastBus';
import {
  CATALOG_METRICS,
  CATALOG_TAGLINE,
  CATALOG_THUMB_H,
  CATALOG_THUMB_H_STOCK,
  CATALOG_CELL_PAD,
  CATALOG_CHROME,
  CATALOG_COVER,
  CATALOG_PROLOGUE,
  CATALOG_RULE_COLOR,
  catalogBandBox,
  catalogDateLabel,
  catalogBookPages,
  catalogFileName,
  catalogIndice,
  catalogPrologoParrafos,
  coverNameLayout,
  downloadCatalogPdf,
  recorta,
  textoPdf,
  BEE_SVG_URL,
  CATALOG_TEXTOS,
  CATALOG_SECTION_METRICS,
  type CatalogBookPage,
  type CatalogIndiceEntry,
  type CatalogMetrics,
  type CatalogPdfBranding,
  type CatalogPdfOptions,
} from '../lib/catalogPdf';
import { catEmoji, esPrecioConsultar, formatSoles, sortProducts, STORE_MACROS, type StoreProduct } from '../types/store';
import StoreImage from './StoreImage';
import LoadingScreen from './LoadingScreen';

const inputCls =
  'rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-cream focus:border-honey/70 focus:outline-none';

/** Opción del selector de categoría. */
interface CategoriaFiltro {
  id: string;
  emoji: string;
  nombre: string;
}

/* Paleta de impresión (papel blanco). Debe coincidir con catalogPdf.ts. */
const PAPER_TEXT = '#342f28';
const PAPER_MUTED = '#7a7163';
const PAPER_BORDER = CATALOG_RULE_COLOR;
const PAPER_PLACEHOLDER = '#f8f3e7';
const PAPER_DANGER = '#b24630';
const PAPER_STOCK = '#6a7a58';
/** Tinta del nombre de producto en la celda (INK en catalogPdf.ts). */
const PAPER_INK = '#1a140d';
/** Helvetica, como las fuentes base de jspdf. */
const PAPER_FONT = 'Helvetica, Arial, sans-serif';

/** pt (unidad de jspdf) → mm, para que los grosores de línea coincidan. */
const ptNum = (pt: number) => (pt * 25.4) / 72;
const ptMm = (pt: number) => `${ptNum(pt).toFixed(3)}mm`;

/**
 * Desplaza el borde superior de un bloque de texto para que su PRIMERA línea
 * base caiga en `y` mm, igual que hace `doc.text()` en el PDF. Se apoya en las
 * métricas de Helvetica/Arial (subida 0.905, bajada 0.212), que es la fuente
 * que resuelven las dos caras del catálogo.
 */
/**
 * `doc.text()` ancla el texto por su LÍNEA BASE; un bloque HTML lo ancla por
 * su caja. Esta función convierte una línea base en mm (medida desde arriba) al
 * `top` que necesita el bloque. `lead` es el interlineado en mm y sólo hace
 * falta cuando el bloque no va con `leading-none` (line-height: 1).
 */
function baselineTop(yMm: number, sizePt: number, lead?: number): number {
  // El "content area" de Helvetica mide 1.117 em (ascender 0.905 + descender
  // 0.212); el interlineado reparte la diferencia por arriba y por abajo.
  const leadEm = lead == null ? 1 : lead / (sizePt * ptNum(1));
  const halfLeading = ((leadEm - 1.117) * sizePt) / 2;
  return yMm - (halfLeading + 0.905 * sizePt) * ptNum(1);
}

/**
 * Corte de líneas con las métricas reales del navegador: el equivalente a
 * `splitTextToSize` del PDF, para que la columna justificada de la vista previa
 * se rompa en el mismo punto que la impresa.
 */
function wrapText(
  texto: string,
  sizePt: number,
  widthMm: number,
  estilo: '' | 'bold' | 'italic' = ''
): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];
  const lienzo = document.createElement('canvas').getContext('2d');
  if (!lienzo) return [texto];
  lienzo.font = `${estilo === 'bold' ? 'bold ' : estilo === 'italic' ? 'italic ' : ''}${sizePt}pt ${PAPER_FONT}`;
  const maxPx = (widthMm / 25.4) * 96;
  const lineas: string[] = [];
  let actual = palabras[0];
  for (let i = 1; i < palabras.length; i += 1) {
    const prueba = `${actual} ${palabras[i]}`;
    if (lienzo.measureText(prueba).width <= maxPx) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabras[i];
    }
  }
  lineas.push(actual);
  return lineas;
}

/**
 * Ancho visible de un texto, en mm, con las MISMAS métricas AFM que aplica el
 * PDF (jspdf mide con la fuente estándar y el navegador con la del sistema):
 * así la vista previa cae donde cae el papel.
 */
let lienzoTexto: CanvasRenderingContext2D | null | undefined;
let medidorAfm: jsPDF | null = null;

/**
 * Ancho de un texto en mm con la fuente que el navegador VA a pintar.
 *
 * Se mide con un canvas en vez de con las métricas AFM de jspdf porque el
 * navegador puede acabar sustituyendo Helvetica por otra cosa: si midiera con
 * AFM y el navegador pintara otra fuente, el rótulo saldría descentrado. Con
 * el canvas el ancho es el de verdad, así el centro acierta siempre. Si no
 * hay canvas (SSR/pruebas) se cae a las métricas AFM, que es lo que usa el PDF.
 */
function anchoTexto(txt: string, sizePt: number, estilo: '' | 'bold' | 'italic' = ''): number {
  if (lienzoTexto === undefined) {
    lienzoTexto =
      typeof document === 'undefined' || !document.createElement
        ? null
        : document.createElement('canvas').getContext('2d');
  }
  if (lienzoTexto) {
    lienzoTexto.font = `${estilo === 'bold' ? 'bold ' : estilo === 'italic' ? 'italic ' : ''}${sizePt}pt ${PAPER_FONT}`;
    return (lienzoTexto.measureText(txt).width * 25.4) / 96;
  }
  if (!medidorAfm) medidorAfm = new jsPDF({ unit: 'mm' });
  medidorAfm.setFont('helvetica', estilo === 'bold' ? 'bold' : estilo === 'italic' ? 'italic' : 'normal');
  medidorAfm.setFontSize(sizePt);
  return medidorAfm.getTextWidth(txt);
}

/**
 * Rótulo centrado en el eje de la hoja.
 *
 * `text-anchor="middle"` mide la caja INCLUDINGO el hueco que deja el
 * `letter-spacing` detrás del último carácter —que no dibuja nada—, así que
 * el texto se ve corrido hacia la izquierda. Se mide el ancho visible (los
 * glifos más los n-1 huecos que sí se ven) y se ancla por su inicio: el
 * mismo cálculo que hace `textoCentrado` en el PDF.
 */
function txtCentrado(
  txt: string,
  eje: number,
  y: number,
  sizePt: number,
  charSpacePt: number,
  props: Record<string, unknown>
) {
  const cs = ptNum(charSpacePt);
  const n = [...txt].length;
  const visible = anchoTexto(txt, sizePt, (props.fontWeight === 'bold' ? 'bold' : props.fontStyle === 'italic' ? 'italic' : '') as
    | ''
    | 'bold'
    | 'italic') + Math.max(0, n - 1) * cs;
  return (
    <text
      {...props}
      x={+(eje - visible / 2).toFixed(3)}
      y={y}
      fontSize={ptNum(sizePt)}
      letterSpacing={cs}
      textAnchor="start"
    >
      {txt}
    </text>
  );
}

/** Polígono regular de `lados` lados centrado en (cx, cy), en string SVG. */
function svgPoly(cx: number, cy: number, r: number, lados: number, giro = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < lados; i += 1) {
    const a = (Math.PI / 180) * ((360 / lados) * i + giro);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** Ancho de la hoja A4 en px CSS (96 dpi) — base del ajuste al ancho. */
const PAGE_PX = (210 * 96) / 25.4;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.5;

/* ------------------------------------------------------------------
   Interruptor (precio / stock)
   ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
        checked ? 'border-honey/60 bg-honey/10' : 'border-line bg-ink hover:border-husk/40'
      }`}
    >
      <span
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-honey' : 'bg-line2'
        }`}
      >
        <motion.span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-ink shadow"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-cream">{label}</span>
        <span className="block truncate text-xs text-husk">{hint}</span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------
   Celda del grid (idéntica a la que dibuja catalogPdf.ts)
   ------------------------------------------------------------------ */

/**
 * Una celda del grid. No lleva borde propio: los filetes los dibuja la
 * rejilla como líneas sueltas, igual que `drawGrid` en el PDF, para que el
 * marco encaje exactamente con las celdas ocupadas.
 */
function CatalogCell({
  producto,
  x,
  y,
  w,
  h,
  options,
  accent,
  honey,
}: {
  producto: StoreProduct;
  x: number;
  y: number;
  w: number;
  h: number;
  options: CatalogPdfOptions;
  accent: string;
  honey: string;
}) {
  const imgH = options.mostrarStock ? CATALOG_THUMB_H_STOCK : CATALOG_THUMB_H;
  // `drawCell` limita el ancho de la miniatura al hueco interior de la celda.
  const lado = Math.min(imgH, w - CATALOG_CELL_PAD * 2);
  const consultar = esPrecioConsultar(producto);
  const unidad = textoPdf(producto.unidad);
  const sinStock = !producto.stock || producto.stock <= 0;
  const tieneFoto = !!producto.imageUrl && producto.imageUrl !== 'data:,';
  const nombre = textoPdf(producto.nombre) || 'Producto';

  return (
    <div
      className="absolute flex flex-col items-center overflow-hidden text-center"
      style={{ left: `${x}mm`, top: `${y}mm`, width: `${w}mm`, height: `${h}mm`, padding: '2mm 0 0' }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-center overflow-hidden"
        style={{ width: `${imgH}mm`, height: `${imgH}mm` }}
      >
        {tieneFoto ? (
          // La foto real manda; el emoji sólo entra si el navegador no la carga.
          <StoreImage
            src={producto.imageUrl}
            alt={producto.nombre}
            emoji={catEmoji(producto.categoria)}
            className="h-full w-full"
          />
        ) : (
          <Placeholder size={lado} honey={honey} />
        )}
      </div>

      <p
        className="mt-[2.4mm] w-full overflow-hidden font-bold"
        style={{
          fontSize: '6.8pt',
          lineHeight: '3.3mm',
          height: '6.6mm',
          color: PAPER_INK,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {nombre}
      </p>

      {options.mostrarPrecios && (
        <p
          className="mt-[1mm] w-full overflow-hidden text-ellipsis whitespace-nowrap font-bold"
          style={{ fontSize: consultar ? '6.2pt' : '8pt', lineHeight: '2.8mm', color: consultar ? PAPER_MUTED : accent }}
        >
          {consultar ? 'A consultar' : formatSoles(producto.precio)}
        </p>
      )}

      {unidad && (
        <p
          className="mt-[1mm] w-full overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ fontSize: '6pt', lineHeight: '3.2mm', color: PAPER_MUTED }}
        >
          {unidad}
        </p>
      )}

      {options.mostrarStock && (
        <p
          className="mt-[0.6mm] w-full overflow-hidden text-ellipsis whitespace-nowrap"
          style={{
            fontSize: '5.8pt',
            lineHeight: '2.4mm',
            color: sinStock ? PAPER_DANGER : PAPER_STOCK,
            fontWeight: sinStock ? 700 : 400,
          }}
        >
          {sinStock ? 'Agotado' : `Stock: ${producto.stock}`}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Portada: replica drawCover del PDF con las MISMAS medidas en mm
   (CATALOG_COVER). Se dibuja en un SVG con unidades = mm, de modo que cada
   línea base cae donde la pone doc.text(). Ojo: dentro del viewBox la
   unidad es el mm, así que los cuerpos van en mm (ptNum), no en 'pt' — en
   'pt' el texto saldría 3,78 veces más grande que en el papel.
   ------------------------------------------------------------------ */

/**
 * Placeholder de marca y de miniaturas: el mismo motivo que dibuja
 * `drawPlaceholder` del PDF (crema + hexágono hueco del 26 % del lado), para que
 * la vista previa no enseñe un logo o un emoji que el papel no lleva.
 */
export function Placeholder({
  size,
  honey,
  strokePt = 0.35,
}: {
  size: number;
  honey: string;
  strokePt?: number;
}) {
  return (
    <svg width={`${size}mm`} height={`${size}mm`} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <rect x="0" y="0" width={size} height={size} fill={PAPER_PLACEHOLDER} />
      <polygon
        points={svgPoly(size / 2, size / 2, size * 0.26, 6)}
        fill="none"
        stroke={honey}
        strokeWidth={ptNum(strokePt)}
      />
    </svg>
  );
}

/**
 * Logo de marca del catálogo: el mismo SVG de la abeja que rasteriza el PDF
 * (`BEE_SVG_URL` sale del propio módulo del PDF), así que la vista previa no
 * cae en el placeholder hexagonal que se veía antes.
 */
function BrandLogo({ size }: { size: number }) {
  return (
    <img
      src={BEE_SVG_URL}
      alt=""
      style={{ width: `${size}mm`, height: `${size}mm` }}
      className="object-contain"
    />
  );
}


/** Portada. Devuelve la hoja A4 completa. */
export function CoverPage({
  m,
  branding,
  accent,
  honey,
  resumen,
}: {
  m: CatalogMetrics;
  branding: CatalogPdfBranding;
  accent: string;
  honey: string;
  resumen: { total: number; categorias: number };
}) {
  const C = CATALOG_COVER;
  const cx = C.plateCx;
  const nombre = textoPdf(branding.nombreEmpresa).toUpperCase();
  const tagline = recorta(`${textoPdf(branding.tagline || CATALOG_TAGLINE)} · ${textoPdf(branding.ubicacion)}`.toUpperCase(), 52);
  const resumenLinea = recorta(
    `Edición ${(branding.fecha ?? new Date()).getFullYear()} · ${resumen.total} producto${resumen.total === 1 ? '' : 's'} · ${resumen.categorias} familia${resumen.categorias === 1 ? '' : 's'}`,
    60
  );
  const pie = recorta(`${textoPdf(branding.nombreEmpresa)} · ${textoPdf(branding.ubicacion)}`, 46);
  const notaLineas = wrapText(CATALOG_TEXTOS.notaCierre, 7.5, C.noteW, 'italic');

  const txt = {
    fontFamily: PAPER_FONT,
    textAnchor: 'middle' as const,
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: `${m.pageW}mm`, height: `${m.pageH}mm`, background: C.bg }}
    >
      <svg
        width={`${m.pageW}mm`}
        height={`${m.pageH}mm`}
        viewBox={`0 0 ${m.pageW} ${m.pageH}`}
        style={{ position: 'absolute', left: 0, top: 0 }}
        aria-hidden="true"
      >
        <rect x="0" y="0" width={m.pageW} height={m.pageH} fill={C.bg} />

        {/* Marcos concéntricos */}
        <rect
          x={C.frame}
          y={C.frame}
          width={m.pageW - C.frame * 2}
          height={m.pageH - C.frame * 2}
          fill="none"
          stroke={honey}
          strokeWidth={ptNum(0.7)}
        />
        <rect
          x={C.frame2}
          y={C.frame2}
          width={m.pageW - C.frame2 * 2}
          height={m.pageH - C.frame2 * 2}
          fill="none"
          stroke={honey}
          strokeWidth={ptNum(0.25)}
        />

        {/* Esquineras en L */}
        {[
          [C.bracket, C.bracket, 1, 1],
          [m.pageW - C.bracket, C.bracket, -1, 1],
          [C.bracket, m.pageH - C.bracket, 1, -1],
          [m.pageW - C.bracket, m.pageH - C.bracket, -1, -1],
        ].map(([ax, ay, sx, sy]) => (
          <g key={`${ax}-${ay}`} stroke={honey} strokeWidth={ptNum(0.6)}>
            <line x1={ax} y1={ay} x2={ax + C.bracketArm * sx} y2={ay} />
            <line x1={ax} y1={ay} x2={ax} y2={ay + C.bracketArm * sy} />
          </g>
        ))}

        {/* Filete superior con rombo */}
        <g stroke={honey} strokeWidth={ptNum(0.3)}>
          <line x1={cx - 34} y1={C.topRuleY} x2={cx - 3} y2={C.topRuleY} />
          <line x1={cx + 3} y1={C.topRuleY} x2={cx + 34} y2={C.topRuleY} />
        </g>
        <polygon points={svgPoly(cx, C.topRuleY, 1.7, 4)} fill={honey} />

        {/* Nombre y bloque de texto: centrados con el ancho visible, igual que
            el PDF, para que no se cuelguen ni a izquierda ni a derecha.
            `coverNameLayout` devuelve las MISMAS líneas y líneas base que el
            PDF, así que un nombre largo que se parte en dos se ve igual en
            pantalla que en papel. */}
        {(() => {
          const l = coverNameLayout(nombre);
          return l.lines.map((linea, i) =>
            txtCentrado(linea, cx, l.baselines[i], l.size, 0.9, {
              fontFamily: PAPER_FONT,
              fontWeight: 'bold',
              fill: accent,
            })
          );
        })()}
        {txtCentrado(tagline, cx, C.taglineY, 8.5, 0.7, {
          fontFamily: PAPER_FONT,
          fill: PAPER_MUTED,
        })}

        {/* Ornamento central */}
        <g stroke={honey} strokeWidth={ptNum(0.3)}>
          <line x1={cx - 30} y1={C.ornamentY} x2={cx - 4} y2={C.ornamentY} />
          <line x1={cx + 4} y1={C.ornamentY} x2={cx + 30} y2={C.ornamentY} />
        </g>
        <polygon points={svgPoly(cx, C.ornamentY, 1.6, 4)} fill={accent} />

        {txtCentrado('CATÁLOGO DE PRODUCTOS', cx, C.titleY, 16, 2.4, {
          fontFamily: PAPER_FONT,
          fontWeight: 'bold',
          fill: PAPER_TEXT,
        })}
        {txtCentrado(catalogDateLabel(branding.fecha), cx, C.dateY, 9, 0.4, {
          fontFamily: PAPER_FONT,
          fill: PAPER_TEXT,
        })}
        {txtCentrado(resumenLinea, cx, C.resumenY, 8, 0.5, {
          fontFamily: PAPER_FONT,
          fill: PAPER_MUTED,
        })}



        {/* Nota de cierre */}
        <line x1={cx - 40} y1={C.noteRuleY} x2={cx + 40} y2={C.noteRuleY} stroke={honey} strokeWidth={ptNum(0.3)} />
        {notaLineas.map((linea, i) => (
          <Fragment key={i}>
            {txtCentrado(linea, cx, C.noteY + i * 4, 7.5, 0, {
              fontFamily: PAPER_FONT,
              fontStyle: 'italic',
              fill: PAPER_MUTED,
            })}
          </Fragment>
        ))}

        {/* Pie */}
        <line x1={cx - 30} y1={C.footRuleY} x2={cx + 30} y2={C.footRuleY} stroke={honey} strokeWidth={ptNum(0.25)} />
        {txtCentrado(pie, cx, C.footY, 7.5, 0, {
          fontFamily: PAPER_FONT,
          fill: PAPER_MUTED,
        })}
      </svg>

      {/* Logo: va fuera del SVG para poder usar un <img>. El PDF rasteriza
          el mismo SVG de la abeja, así que aquí se ve idéntico. */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: `${C.plateCx - C.logo / 2}mm`,
          top: `${C.plateCy - C.logo / 2}mm`,
          width: `${C.logo}mm`,
          height: `${C.logo}mm`,
        }}
      >
        <BrandLogo size={C.logo} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Hoja A4 de la vista previa
   ------------------------------------------------------------------ */

/** Header de marca (páginas de contenido): mismas líneas base que `drawHeader`. */
function CatalogHeader({
  m,
  branding,
  accent,
  honey,
}: {
  m: CatalogMetrics;
  branding: CatalogPdfBranding;
  accent: string;
  honey: string;
}) {
  const C = CATALOG_CHROME;
  const textoX = m.margin + C.logo + C.gap;
  return (
    <>
      {/* El PDF pone aquí el mismo logo de la abeja que en la portada. */}
      <div
        className="absolute flex items-center justify-center overflow-hidden"
        style={{ left: `${m.margin}mm`, top: `${m.margin + C.logoTop}mm`, width: `${C.logo}mm`, height: `${C.logo}mm` }}
      >
        <BrandLogo size={C.logo} />
      </div>

      <p
        className="absolute truncate font-bold leading-none"
        style={{
          left: `${textoX}mm`,
          top: `${baselineTop(m.margin + C.nameY, 15)}mm`,
          width: `${m.gridW - C.logo - C.gap}mm`,
          fontSize: '15pt',
          color: accent,
        }}
      >
        {recorta(textoPdf(branding.nombreEmpresa).toUpperCase(), 30)}
      </p>
      <p
        className="absolute truncate leading-none"
        style={{
          left: `${textoX}mm`,
          top: `${baselineTop(m.margin + C.taglineY, 7.5)}mm`,
          width: `${m.gridW - C.logo - C.gap}mm`,
          fontSize: '7.5pt',
          color: PAPER_TEXT,
        }}
      >
        {recorta(
          `${textoPdf(branding.tagline || CATALOG_TAGLINE).toUpperCase()} · ${textoPdf(branding.ubicacion || '').toUpperCase()}`,
          54
        )}
      </p>

      <p
        className="absolute right-0 truncate font-bold leading-none"
        style={{
          left: `${m.margin}mm`,
          width: `${m.gridW}mm`,
          top: `${baselineTop(m.margin + C.docY, 12)}mm`,
          fontSize: '12pt',
          textAlign: 'right',
          color: accent,
        }}
      >
        CATÁLOGO
      </p>
      <p
        className="absolute right-0 truncate leading-none"
        style={{
          left: `${m.margin}mm`,
          width: `${m.gridW}mm`,
          top: `${baselineTop(m.margin + C.dateY, 7.5)}mm`,
          fontSize: '7.5pt',
          textAlign: 'right',
          color: PAPER_MUTED,
        }}
      >
        Fecha: {catalogDateLabel(branding.fecha)}
      </p>

      <div
        className="absolute"
        style={{
          left: `${m.margin}mm`,
          top: `${m.margin + m.headerH - C.headerRuleDY}mm`,
          width: `${m.gridW}mm`,
          height: ptMm(0.5),
          background: honey,
        }}
      />
    </>
  );
}

/** Pie con branding y "Página X de Y": mismas líneas base que `drawFooter`. */
function CatalogFooter({
  m,
  branding,
  pageIndex,
  totalPages,
}: {
  m: CatalogMetrics;
  branding: CatalogPdfBranding;
  pageIndex: number;
  totalPages: number;
}) {
  const base = m.pageH - m.margin - m.footerH;
  const y = base + CATALOG_CHROME.footerTextDY;
  return (
    <>
      <div
        className="absolute"
        style={{
          left: `${m.margin}mm`,
          top: `${base + CATALOG_CHROME.footerRuleDY}mm`,
          width: `${m.gridW}mm`,
          height: ptMm(0.3),
          background: branding.primario || '#d9a94f',
        }}
      />
      <p
        className="absolute truncate leading-none"
        style={{ left: `${m.margin}mm`, top: `${baselineTop(y, 6.5)}mm`, width: `${m.gridW - 20}mm`, fontSize: '6.5pt', color: PAPER_MUTED }}
      >
        {recorta(`${textoPdf(branding.nombreEmpresa)} · ${textoPdf(branding.tagline || CATALOG_TAGLINE)} · ${textoPdf(branding.ubicacion)}`, 62)}
      </p>
      <p
        className="absolute right-0 truncate leading-none"
        style={{
          left: `${m.margin}mm`,
          width: `${m.gridW}mm`,
          top: `${baselineTop(y, 6.5)}mm`,
          fontSize: '6.5pt',
          textAlign: 'right',
          color: PAPER_MUTED,
        }}
      >
        Página {pageIndex + 1} de {totalPages}
      </p>
    </>
  );
}

/**
 * Rejilla de productos: replica `drawGrid` del PDF, que ajusta el entramado al
 * número EXACTO de productos de la página. Sólo se dibujan los filetes de las
 * celdas realmente ocupadas, de modo que nunca queda un hueco enmarcado al final
 * de la rejilla: si la última fila queda a medias, el sobrante es aire.
 */
export function CatalogGrid({
  productos,
  metrics,
  options,
  accent,
  honey,
}: {
  productos: StoreProduct[];
  metrics: CatalogMetrics;
  options: CatalogPdfOptions;
  accent: string;
  honey: string;
}) {
  const m = metrics;
  const total = productos.length;
  if (total === 0) return null;

  const cols = m.cols;
  const usadas = Math.ceil(total / cols);
  const enUltima = total % cols; // celdas ocupadas en la última fila
  const anchoUltima = enUltima === 0 ? cols : enUltima;
  const bottom = m.gridY + usadas * m.cellH;
  const topUltima = m.gridY + (usadas - 1) * m.cellH;

  const lineas: { x: number; y: number; w: number; h: number }[] = [];

  // Verticales: las de las filas completas, más el borde derecho de la última.
  // El divisor entre la última fila y el aire sobrante sólo arranca en esa
  // fila; si la última fila está completa, todos los bordes van de arriba abajo.
  for (let c = 0; c < anchoUltima; c += 1) {
    const x = m.gridX + c * m.cellW;
    const y = enUltima > 0 && c === enUltima ? topUltima : m.gridY;
    lineas.push({ x, y, w: 0, h: bottom - y });
  }
  const xDerecha = m.gridX + anchoUltima * m.cellW;
  lineas.push({ x: xDerecha, y: m.gridY, w: 0, h: bottom - m.gridY });

  // Horizontales: a todo el ancho entre filas, y el pie sólo de lo ocupado.
  for (let r = 0; r < usadas; r += 1) {
    const y = m.gridY + r * m.cellH;
    const ancho = r === usadas - 1 ? anchoUltima * m.cellW : m.gridW;
    lineas.push({ x: m.gridX, y, w: ancho, h: 0 });
  }

  return (
    <>
      {lineas.map((l, i) => (
        <div
          key={`f-${i}`}
          className="absolute"
          style={{
            left: `${l.x}mm`,
            top: `${l.y}mm`,
            width: l.w === 0 ? ptMm(0.15) : `${l.w}mm`,
            height: l.h === 0 ? ptMm(0.15) : `${l.h}mm`,
            background: PAPER_BORDER,
          }}
        />
      ))}

      {productos.map((p, k) => {
        const col = k % cols;
        const row = Math.floor(k / cols);
        return (
          <CatalogCell
            key={p.id}
            producto={p}
            x={m.gridX + col * m.cellW}
            y={m.gridY + row * m.cellH}
            w={m.cellW}
            h={m.cellH}
            options={options}
            accent={accent}
            honey={honey}
          />
        );
      })}
    </>
  );
}

/** Raíl lateral del prólogo: datos del catálogo, nota de contacto y ornamento. */
function PrologueRail({
  accent,
  honey,
  total,
  familias,
  anio,
}: {
  accent: string;
  honey: string;
  total: number;
  familias: number;
  anio: number;
}) {
  const P = CATALOG_PROLOGUE;
  const { x, w } = { x: P.railX, w: P.railW };
  const nota = wrapText(CATALOG_TEXTOS.notaRail, 7.5, w, 'italic');

  let y = P.bodyY + 10;
  const stats: [string, string][] = [
    ['Productos', String(total)],
    ['Familias', String(familias)],
    ['Edición', String(anio)],
  ];
  // El PDF avanza 12.4 mm por dato: el ornamento queda por debajo del último.
  const oy = Math.max(P.bodyY + 10 + 3 * 12.4 + 12, P.indexY - 26);

  return (
    <>
      <div
        className="absolute"
        style={{ left: `${P.railRuleX}mm`, top: `${P.bodyY - 4}mm`, width: ptMm(0.25), height: `${P.indexY - 14 - (P.bodyY - 4)}mm`, background: honey }}
      />
      <p
        className="absolute font-bold leading-none"
        style={{ left: `${x}mm`, top: `${baselineTop(P.bodyY, 6.5)}mm`, fontSize: '6.5pt', letterSpacing: '0.4pt', color: accent }}
      >
        E N&nbsp;&nbsp;&nbsp;E S T E&nbsp;&nbsp;&nbsp;C A T Á L O G O
      </p>
      <div className="absolute" style={{ left: `${x}mm`, top: `${P.bodyY + 2.6}mm`, width: '18mm', height: ptMm(0.5), background: accent }} />

      {stats.map(([label, valor], i) => {
        const sy = y + i * 12.4;
        return (
          <div key={label} className="absolute" style={{ left: `${x}mm`, top: `${P.bodyY + 10}mm`, width: `${w}mm` }}>
            <p className="leading-none" style={{ fontSize: '6.5pt', letterSpacing: '0.5pt', color: PAPER_MUTED, transform: `translateY(${i * 12.4}mm)` }}>
              {label.toUpperCase()}
            </p>
            <p className="font-bold leading-none" style={{ fontSize: '11pt', color: accent, transform: `translateY(${i * 12.4 + 4.6}mm)` }}>
              {valor}
            </p>
          </div>
        );
      })}

      <div className="absolute" style={{ left: `${x}mm`, top: `${y + 3 * 12.4 - 4}mm`, width: `${w}mm`, height: ptMm(0.2), background: PAPER_BORDER }} />

      <div className="absolute" style={{ left: `${x}mm`, top: `${y + 3 * 12.4}mm`, width: `${w}mm` }}>
        {nota.map((linea, i) => (
          <p key={i} className="italic leading-none" style={{ fontSize: '7.5pt', color: PAPER_TEXT, transform: `translateY(${i * 3.8}mm)` }}>
            {linea}
          </p>
        ))}
      </div>

      {/* Ornamento: hexágono con rombos, el motivo de la colmena. */}
      <svg
        className="absolute"
        width={`${w}mm`}
        height="14mm"
        viewBox={`0 0 ${w} 14`}
        style={{ left: `${x}mm`, top: `${oy}mm` }}
        aria-hidden="true"
      >
        <g stroke={honey} strokeWidth={ptNum(0.3)}>
          <line x1={4} y1={7} x2={w / 2 - 11} y2={7} />
          <line x1={w / 2 + 11} y1={7} x2={w - 4} y2={7} />
        </g>
        <polygon points={svgPoly(w / 2, 7, 7, 6)} fill="none" stroke={honey} strokeWidth={ptNum(0.45)} />
        <polygon points={svgPoly(w / 2, 7, 1.6, 4)} fill={accent} />
        <polygon points={svgPoly(w / 2 - 10, 7, 1.1, 4)} fill={honey} />
        <polygon points={svgPoly(w / 2 + 10, 7, 1.1, 4)} fill={honey} />
      </svg>
    </>
  );
}

/** Prólogo: encabezado editorial, columna justificada, raíl e índice. */
export function ProloguePage({
  m,
  branding,
  accent,
  honey,
  indice,
  pageIndex,
  totalPages,
  total,
  familias,
}: {
  m: CatalogMetrics;
  branding: CatalogPdfBranding;
  accent: string;
  honey: string;
  indice: CatalogIndiceEntry[];
  pageIndex: number;
  totalPages: number;
  total: number;
  familias: number;
}) {
  const P = CATALOG_PROLOGUE;
  const nombre = textoPdf(branding.nombreEmpresa);
  const ubicacion = textoPdf(branding.ubicacion);
  const parrafos = catalogPrologoParrafos(nombre, ubicacion, total, familias);
  const limite = P.indexY - 16;
  const filas = indice.slice(0, P.indexMaxRows);
  const ocultas = indice.length - filas.length;

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: `${m.pageW}mm`, height: `${m.pageH}mm`, background: '#fff', fontFamily: PAPER_FONT }}
    >
      <CatalogHeader m={m} branding={branding} accent={accent} honey={honey} />

      {/* --- Cabecera del bloque --- */}
      <p
        className="absolute font-bold leading-none"
        style={{ left: `${m.margin}mm`, top: `${baselineTop(P.eyebrowY, 7)}mm`, fontSize: '7pt', letterSpacing: '0.8pt', color: accent }}
      >
        P R E S E N T A C I Ó N
      </p>
      <p
        className="absolute font-bold leading-none"
        style={{ left: `${m.margin}mm`, top: `${baselineTop(P.titleY, 24)}mm`, fontSize: '24pt', color: accent }}
      >
        Prólogo
      </p>
      <div className="absolute" style={{ left: `${m.margin}mm`, top: `${P.ruleY}mm`, width: `${m.gridW}mm`, height: ptMm(0.3), background: honey }} />
      <div className="absolute" style={{ left: `${m.margin}mm`, top: `${P.ruleY}mm`, width: '34mm', height: ptMm(0.8), background: honey }} />

      {/* --- Columna de texto justificada --- */}
      <div
        className="absolute overflow-hidden text-justify"
        style={{
          left: `${m.margin}mm`,
          top: `${baselineTop(P.bodyY, P.bodySize, P.lead)}mm`,
          width: `${P.textW}mm`,
          height: `${limite - P.bodyY + P.lead}mm`,
          fontSize: `${P.bodySize}pt`,
          lineHeight: `${P.lead}mm`,
          color: PAPER_TEXT,
        }}
      >
        {parrafos.map((t, i) => (
          <p key={i} style={{ marginBottom: i === parrafos.length - 1 ? 0 : `${P.paraGap}mm` }}>
            {t}
          </p>
        ))}
        {/* Firma: el PDF la dibuja al final del texto si cabe. */}
        <p className="font-bold italic leading-none" style={{ fontSize: '10pt', color: accent, marginTop: `${P.paraGap + 4}mm` }}>
          {nombre}
        </p>
        <p className="leading-none" style={{ fontSize: '8.5pt', color: PAPER_MUTED, marginTop: '1.4mm' }}>
          {ubicacion}
        </p>
      </div>

      <PrologueRail accent={accent} honey={honey} total={total} familias={familias} anio={(branding.fecha ?? new Date()).getFullYear()} />

      {/* --- Índice de contenidos --- */}
      <p
        className="absolute font-bold leading-none"
        style={{ left: `${m.margin}mm`, top: `${baselineTop(P.indexY, 7)}mm`, fontSize: '7pt', letterSpacing: '0.6pt', color: accent }}
      >
        Í N D I C E&nbsp;&nbsp;&nbsp;D E&nbsp;&nbsp;&nbsp;C O N T E N I D O S
      </p>
      {filas.map((fila, i) => {
        const ry = P.indexY + 4 + i * P.indexRowH;
        const plural = fila.productos === 1 ? '' : 's';
        const hojas = fila.hojas > 1 ? ` · ${fila.hojas} páginas` : '';
        return (
          <Fragment key={fila.categoria}>
          <p
            className="absolute truncate font-bold leading-none"
            style={{ left: `${m.margin}mm`, top: `${baselineTop(ry + 3, 9)}mm`, fontSize: '9pt', color: PAPER_INK }}
          >
            {recorta(fila.categoria, 40)}
          </p>
          <p
            className="absolute truncate leading-none"
            style={{
              left: `${m.margin}mm`,
              top: `${baselineTop(ry + 3, 7.5)}mm`,
              width: `${m.gridW}mm`,
              fontSize: '7.5pt',
              textAlign: 'right',
              color: PAPER_MUTED,
            }}
          >
            {`${fila.productos} producto${plural}${hojas} · pág. ${fila.pagina}`}
          </p>
          <div
            className="absolute"
            style={{
              left: `${m.margin}mm`,
              top: `${ry + P.indexRowH - 1.6}mm`,
              width: `${m.gridW}mm`,
              height: ptMm(0.15),
              background: PAPER_BORDER,
            }}
          />
          </Fragment>
        );
      })}
      {ocultas > 0 && (
        <p
          className="absolute italic leading-none"
          style={{ left: `${m.margin}mm`, top: `${baselineTop(P.indexY + 4 + filas.length * P.indexRowH + 3, 7.5)}mm`, fontSize: '7.5pt', color: PAPER_MUTED }}
        >
          {`y ${ocultas} familia${ocultas === 1 ? '' : 's'} más`}
        </p>
      )}

      <CatalogFooter m={m} branding={branding} pageIndex={pageIndex} totalPages={totalPages} />
    </div>
  );
}

/** Hoja A4 de la vista previa: refleja una página del libro del PDF. */
export function CatalogPage({
  hoja,
  metrics,
  options,
  branding,
  accent,
  honey,
  pageIndex,
  totalPages,
  totalCategoria,
  totalProductos,
  totalCategorias,
  indice,
}: {
  hoja: CatalogBookPage;
  metrics: CatalogMetrics;
  options: CatalogPdfOptions;
  branding: CatalogPdfBranding;
  accent: string;
  honey: string;
  pageIndex: number;
  totalPages: number;
  totalCategoria: number;
  totalProductos: number;
  totalCategorias: number;
  indice: CatalogIndiceEntry[];
}) {
  const m = metrics;

  /* ---- Portada ---- */
  if (hoja.kind === 'portada') {
    return (
      <CoverPage
        m={m}
        branding={branding}
        accent={accent}
        honey={honey}
        resumen={{ total: totalProductos, categorias: totalCategorias }}
      />
    );
  }

  /* ---- Prólogo ---- */
  if (hoja.kind === 'prologo') {
    return (
      <ProloguePage
        m={m}
        branding={branding}
        accent={accent}
        honey={honey}
        indice={indice}
        pageIndex={pageIndex}
        totalPages={totalPages}
        total={indice.reduce((acc, e) => acc + e.productos, 0)}
        familias={indice.length}
      />
    );
  }

  /* ---- Página de categoría ---- */
  const catMetrics = hoja.abre ? CATALOG_SECTION_METRICS : m;
  // La banda la sitúa el PDF justo encima de la rejilla: así el título nunca
  // queda debajo del logo del header ni pisa la primera fila.
  const box = catalogBandBox(catMetrics, hoja.abre);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: `${m.pageW}mm`, height: `${m.pageH}mm`, background: '#fff', fontFamily: PAPER_FONT }}
    >
      <CatalogHeader m={m} branding={branding} accent={accent} honey={honey} />

      {hoja.abre && (
        <div className="absolute" style={{ left: `${m.margin}mm`, top: `${box.top}mm`, width: `${m.gridW}mm`, height: `${box.ruleY - box.top}mm` }} />
      )}

      <p
        className="absolute truncate font-bold leading-none"
        style={{ left: `${m.margin}mm`, top: `${baselineTop(box.titleY, hoja.abre ? 20 : 11)}mm`, fontSize: hoja.abre ? '20pt' : '11pt', letterSpacing: hoja.abre ? '0.5pt' : '0.4pt', color: accent }}
      >
        {recorta(hoja.categoria, 34)}
      </p>
      <p
        className="absolute right-0 truncate leading-none"
        style={{
          left: `${m.margin}mm`,
          width: `${m.gridW}mm`,
          top: `${baselineTop(box.metaY, hoja.abre ? 8 : 7.5)}mm`,
          fontSize: hoja.abre ? '8pt' : '7.5pt',
          color: PAPER_MUTED,
          fontStyle: hoja.abre ? 'normal' : 'italic',
          textAlign: 'right',
        }}
      >
        {hoja.abre
          ? `${totalCategoria} producto${totalCategoria === 1 ? '' : 's'}${hoja.total > 1 ? ` · página ${hoja.n} de ${hoja.total}` : ''}`
          : `continuación · página ${hoja.n} de ${hoja.total}`}
      </p>
      {hoja.abre && (
        <div
          className="absolute"
          style={{ left: `${m.margin}mm`, top: `${box.ruleY}mm`, width: `${m.gridW}mm`, height: ptMm(0.5), background: honey }}
        />
      )}

      <CatalogGrid
        productos={hoja.productos}
        metrics={catMetrics}
        options={options}
        accent={accent}
        honey={honey}
      />

      <CatalogFooter m={m} branding={branding} pageIndex={pageIndex} totalPages={totalPages} />
    </div>
  );
}


/* ------------------------------------------------------------------
   Pantalla
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   SELECCIÓN DE PRODUCTOS
   ------------------------------------------------------------------ */

/** Checkbox consistente con el tema, sin dependencia externa. */
function SelectionCheck({
  marcado,
  onChange,
  label,
  decorativo = false,
}: {
  marcado: boolean;
  onChange: () => void;
  label: string;
  /** Dentro de otro elemento pulsable: se dibuja, pero no es un control. */
  decorativo?: boolean;
}) {
  const clases = `flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
    marcado ? 'border-honey bg-honey text-ink' : 'border-husk/60 bg-ink/40 text-transparent'
  }`;
  const tick = (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );

  if (decorativo) {
    return (
      <span className={clases} aria-hidden="true">
        {tick}
      </span>
    );
  }
  return (
    <button type="button" role="checkbox" aria-checked={marcado} aria-label={label} onClick={onChange} className={clases}>
      {tick}
    </button>
  );
}

/**
 * Modal previo a la generación: permite marcar exactamente qué productos
 * entran en el PDF. Viene preseleccionado con los productos que ya cumplen
 * los filtros, y se puede marcar o desmarcar por producto o por categoría.
 */
function CatalogoSelectionModal({
  porCategoria,
  seleccion,
  alternar,
  marcarGrupo,
  marcadosDe,
  total,
  generando,
  onClose,
  onGenerar,
}: {
  porCategoria: [string, StoreProduct[]][];
  seleccion: Set<string>;
  alternar: (id: string) => void;
  marcarGrupo: (productos: StoreProduct[], marcar: boolean) => void;
  marcadosDe: (productos: StoreProduct[]) => number;
  total: number;
  generando: boolean;
  onClose: () => void;
  onGenerar: () => void;
}) {
  const [q, setQ] = useState('');

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return porCategoria;
    return porCategoria
      .map(([cat, productos]) => [
        cat,
        productos.filter((p) => p.nombre.toLowerCase().includes(t) || p.subcategoria?.toLowerCase().includes(t)),
      ] as [string, StoreProduct[]])
      .filter(([, productos]) => productos.length > 0);
  }, [porCategoria, q]);

  const todosLosProductos = useMemo(() => porCategoria.flatMap(([, ps]) => ps), [porCategoria]);

  // Cerrar con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !generando) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, generando]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !generando && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Seleccionar productos del catálogo"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-cream">Qué productos incluir</h3>
            <p className="mt-0.5 text-xs text-husk">
              {total} de {todosLosProductos.length} seleccionados · el PDF los ordena por categoría
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={generando}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink/50 text-cream transition-colors hover:bg-ink/80 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Búsqueda + acciones globales */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <div className="relative min-w-[180px] flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto…"
              className="w-full rounded-lg border border-line bg-ink/60 py-2 pl-3 pr-3 text-sm text-cream placeholder:text-husk/70 focus:border-honey/70 focus:outline-none"
            />
          </div>
          <button
            onClick={() => marcarGrupo(todosLosProductos, true)}
            disabled={generando}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-cream transition-colors hover:border-honey/60 disabled:opacity-50"
          >
            Todos
          </button>
          <button
            onClick={() => marcarGrupo(todosLosProductos, false)}
            disabled={generando}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-cream transition-colors hover:border-honey/60 disabled:opacity-50"
          >
            Ninguno
          </button>
        </div>

        {/* Lista por categoría */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {filtradas.length === 0 ? (
            <p className="py-10 text-center text-sm text-husk">Ningún producto coincide con la búsqueda</p>
          ) : (
            filtradas.map(([cat, productos]) => {
              const marcados = marcadosDe(productos);
              const completo = marcados === productos.length;
              return (
                <div key={cat} className="mb-4 last:mb-0">
                  <div className="mb-2 flex items-center gap-2">
                    <SelectionCheck
                      marcado={completo}
                      onChange={() => marcarGrupo(productos, !completo)}
                      label={`Marcar toda la categoría ${cat}`}
                    />
                    <span className="text-sm font-bold text-cream">{cat}</span>
                    <span className="text-xs text-husk">
                      {marcados}/{productos.length}
                    </span>
                    {!completo && marcados > 0 && (
                      <button
                        onClick={() => marcarGrupo(productos, true)}
                        className="text-xs font-semibold text-honey hover:underline"
                      >
                        Marcar todos
                      </button>
                    )}
                    {marcados > 0 && !completo && (
                      <button
                        onClick={() => marcarGrupo(productos, false)}
                        className="text-xs text-husk hover:text-cream hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {productos.map((p) => {
                      const activo = seleccion.has(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => alternar(p.id)}
                          aria-pressed={activo}
                          className={`flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                            activo ? 'border-honey/50 bg-honey/10' : 'border-transparent bg-ink/30 hover:bg-ink/60'
                          }`}
                        >
                          <SelectionCheck marcado={activo} onChange={() => undefined} label={p.nombre} decorativo />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-cream">{p.nombre}</span>
                            {(p.subcategoria || p.unidad) && (
                              <span className="block truncate text-[11px] text-husk">
                                {[p.subcategoria, p.unidad].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <p className="text-xs text-husk">
            {total === 0 ? 'Marca al menos un producto' : `Se generarán ${total} producto${total === 1 ? '' : 's'}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={generando}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-husk/60 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onGenerar}
              disabled={generando || total === 0}
              className="flex items-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Generar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Catalogo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status: adminStatus } = useAdminList();
  const isAdmin = isEmailAdmin(user?.email);

  // Al entrar en /admin/catalogo la vista arranca SIEMPRE en el título
  // "Catálogo", con los filtros, los toggles de precios/stock y sólo después la
  // vista previa. Sin esto heredaba el scroll de la página anterior y se
  // entraba directamente dentro de la hoja del PDF.
  useScrollToTopOnMount();

  // Guardia: solo admins. Los no-admins van a /seleccionar con aviso de
  // acceso denegado (mismo criterio que Cotizaciones y AdminPedidos).
  useEffect(() => {
    if (adminStatus === 'loading') return;
    if (!isAdmin) {
      navigate('/seleccionar', {
        replace: true,
        state: { accessDenied: 'El catálogo es exclusivo de los administradores.' },
      });
    }
  }, [isAdmin, adminStatus, navigate]);

  // Catálogo (productsService = fuente única de verdad).
  const [products, setProducts] = useState<StoreProduct[]>(() => productsService.getAll());
  useEffect(
    () => productsService.onProductsChanged(() => setProducts(productsService.getAll())),
    []
  );

  // Filtros.
  const [categoria, setCategoria] = useState('all');
  const [mostrarPrecios, setMostrarPrecios] = useState(true);
  const [mostrarStock, setMostrarStock] = useState(false);

  const fecha = useMemo(() => new Date(), []);
  const totalCategoriasActual = useMemo(
    () => new Set(products.filter((p) => p.activo !== false).map((p) => p.categoria)).size,
    [products]
  );

  /** Sólo las macro-categorías con productos activos, en orden de impresión. */
  const categorias = useMemo<CategoriaFiltro[]>(() => {
    const conProductos = new Set(products.filter((p) => p.activo !== false).map((p) => p.categoria));
    return [
      { id: 'all', emoji: '🐝', nombre: 'Todos' },
      ...STORE_MACROS.filter((m) => conProductos.has(m.nombre)).map((m) => ({
        id: m.nombre as string,
        emoji: m.emoji,
        nombre: m.nombre as string,
      })),
    ];
  }, [products]);

  const visibles = useMemo(() => {
    let list = products.filter((p) => p.activo !== false);
    if (categoria !== 'all') list = list.filter((p) => p.categoria === categoria);
    return sortProducts(list);
  }, [products, categoria]);

  const options = useMemo<CatalogPdfOptions>(
    () => ({ mostrarPrecios, mostrarStock }),
    [mostrarPrecios, mostrarStock]
  );

  const book = useMemo(() => catalogBookPages(visibles), [visibles]);
  const totalPages = book.length;
  /** Índice de contenidos del prólogo (el PDF lo calcula con la misma función). */
  const indicePrevia = useMemo(() => catalogIndice(book), [book]);
  const [pagina, setPagina] = useState(0);

  // Al cambiar los filtros se vuelve a la primera página y se recorta el
  // índice si el catálogo se encogió.
  useEffect(() => {
    setPagina(0);
  }, [categoria, mostrarPrecios, mostrarStock]);
  useEffect(() => {
    if (pagina > totalPages - 1) setPagina(Math.max(0, totalPages - 1));
  }, [pagina, totalPages]);

  const paginaActual = Math.min(pagina, Math.max(0, totalPages - 1));
  const hojaActual: CatalogBookPage = book[paginaActual] ?? { kind: 'portada' };
  /** Nº de productos de la categoría de la hoja actual (todas sus páginas). */
  const totalCategoriaActual = useMemo(() => {
    if (hojaActual.kind !== 'categoria') return 0;
    return book
      .filter((pg): pg is Extract<CatalogBookPage, { kind: 'categoria' }> => pg.kind === 'categoria')
      .filter((pg) => pg.categoria === hojaActual.categoria)
      .reduce((acc, pg) => acc + pg.productos.length, 0);
  }, [book, hojaActual]);

  // Zoom de la vista previa (ajuste al ancho por defecto).
  const [zoom, setZoom] = useState(0.7);
  const [ajustar, setAjustar] = useState(true);
  const visorRef = useRef<HTMLDivElement | null>(null);

  const aplicarAjuste = useCallback(() => {
    const el = visorRef.current;
    if (!el) return;
    const disponible = el.clientWidth - 24;
    if (disponible <= 0) return;
    setZoom(Math.min(1, Math.max(MIN_ZOOM, disponible / PAGE_PX)));
  }, []);

  useEffect(() => {
    if (!ajustar) return;
    aplicarAjuste();
    const el = visorRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => aplicarAjuste());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ajustar, aplicarAjuste]);

  const cambiarZoom = useCallback((delta: number) => {
    setAjustar(false);
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z + delta).toFixed(2)))));
  }, []);

  // Branding fijo del cliente (nombre, colores y ubicación).
  const branding = useMemo<CatalogPdfBranding>(
    () => ({
      nombreEmpresa: BRANDING.nombreEmpresa,
      logoUrl: '',
      primario: BRANDING.colores.primario,
      secundario: BRANDING.colores.secundario,
      ubicacion: BRANDING.ubicacion,
      tagline: CATALOG_TAGLINE,
      fecha,
    }),
    [fecha]
  );

  const accent = BRANDING.colores.secundario;
  /** Color de filetes y ornamentos (honey en catalogPdf.ts). */
  const honey = BRANDING.colores.primario;

  const [generando, setGenerando] = useState(false);

  /* --- Selección previa de productos --- */
  const [modalAbierto, setModalAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  /** Productos visibles agrupados por categoría, en el orden del libro. */
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, StoreProduct[]>();
    for (const pg of book) {
      if (pg.kind !== 'categoria') continue;
      const prev = mapa.get(pg.categoria) ?? [];
      mapa.set(pg.categoria, [...prev, ...pg.productos]);
    }
    return [...mapa.entries()];
  }, [book]);

  /**
   * Productos con los que se genera REALMENTE el PDF (solo los marcados).
   * El resumen de la vista previa lo usa para no prometer un número de páginas
   * que no corresponde al archivo descargado.
   */
  const elegidos = useMemo(
    () => porCategoria.flatMap(([, productos]) => productos).filter((p) => seleccion.has(p.id)),
    [porCategoria, seleccion]
  );
  const totalPagesGeneradas = useMemo(
    () => (elegidos.length > 0 ? catalogBookPages(elegidos).length : totalPages),
    [elegidos, totalPages]
  );

  /** Abrir el modal con los productos del filtro actual ya marcados. */
  const abrirSeleccion = useCallback(() => {
    setSeleccion(new Set(visibles.map((p) => p.id)));
    setModalAbierto(true);
  }, [visibles]);

  const alternar = useCallback((id: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const marcarGrupo = useCallback((productos: StoreProduct[], marcar: boolean) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      for (const p of productos) {
        if (marcar) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }, []);

  const marcadosDe = useCallback(
    (productos: StoreProduct[]) => productos.filter((p) => seleccion.has(p.id)).length,
    [seleccion]
  );

  const handleGenerar = async () => {
    if (generando) return;
    if (visibles.length === 0) {
      emitGlobalToast('No hay productos que catalogar', 'Activa productos o cambia el filtro de categoría', 'error');
      return;
    }
    if (seleccion.size === 0) {
      emitGlobalToast('No hay productos seleccionados', 'Marca al menos un producto para incluir en el catálogo', 'error');
      return;
    }
    setGenerando(true);
    try {
      // Sólo los marcados, conservando el orden del libro por categorías.
      // `elegidos` es el mismo memo que usa el resumen, así que el archivo
      // descargado y el contador de páginas no pueden discrepar.
      const archivo = await downloadCatalogPdf(elegidos, branding, options);
      setModalAbierto(false);
      emitGlobalToast('Catálogo descargado', archivo, 'success');
    } catch (err) {
      emitGlobalToast('No se pudo generar el PDF', (err as Error)?.message || String(err), 'error');
    } finally {
      setGenerando(false);
    }
  };

  if (adminStatus === 'loading' || !isAdmin) {
    return <LoadingScreen size="lg" label="Verificando acceso…" fullScreen />;
  }

  return (
    <div className="min-h-screen bg-[#1A140D] pb-28">
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-6">
        {/* ---- Cabecera ---- */}
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              saveUltimaVista('/seleccionar', user?.uid);
              navigate('/seleccionar');
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 font-display text-2xl font-black tracking-tight text-cream sm:text-3xl">
              <span>📖</span> Catálogo
            </h1>
            <p className="mt-0.5 truncate text-sm text-husk">
              {branding.nombreEmpresa} · A4 vertical · portada, prólogo y secciones por categoría
            </p>
          </div>

          <button
            onClick={abrirSeleccion}
            disabled={generando}
            className="flex items-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-bold text-ink shadow-lg shadow-honey/20 transition-colors hover:bg-honeysoft disabled:cursor-wait disabled:opacity-70"
          >
            {generando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generar PDF
              </>
            )}
          </button>
        </header>

        {modalAbierto && (
          <CatalogoSelectionModal
            porCategoria={porCategoria}
            seleccion={seleccion}
            alternar={alternar}
            marcarGrupo={marcarGrupo}
            marcadosDe={marcadosDe}
            total={seleccion.size}
            generando={generando}
            onClose={() => setModalAbierto(false)}
            onGenerar={handleGenerar}
          />
        )}

        {generando && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 rounded-xl border border-honey/40 bg-honey/10 px-4 py-2.5 text-sm text-honeysoft"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparando {seleccion.size} productos en {Math.max(totalPages, 1)} página
            {totalPages === 1 ? '' : 's'}…
          </motion.p>
        )}

        {/* ---- Filtros ---- */}
        <section className="card mb-6 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 lg:w-64 lg:flex-shrink-0">
            <Package className="h-4 w-4 flex-shrink-0 text-husk" />
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label="Filtrar por categoría"
              className={`${inputCls} w-full`}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-1">
            <Toggle
              checked={mostrarPrecios}
              onChange={setMostrarPrecios}
              label="Mostrar precios"
              hint="Imprime el precio de cada producto"
            />
            <Toggle
              checked={mostrarStock}
              onChange={setMostrarStock}
              label="Mostrar stock"
              hint="Añade las unidades disponibles"
            />
          </div>
        </section>

        {/* ---- Vista previa ---- */}
        <section className="card overflow-hidden">
          {/* Barra de control de la vista previa */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={paginaActual === 0 || totalPages === 0}
                aria-label="Página anterior"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[7.5rem] text-center text-sm font-semibold text-cream">
                {totalPages === 0 ? '—' : `Página ${paginaActual + 1} de ${totalPages}`}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPages - 1, p + 1))}
                disabled={paginaActual >= totalPages - 1 || totalPages === 0}
                aria-label="Página siguiente"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => cambiarZoom(-0.1)}
                aria-label="Alejar"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[3.25rem] text-center font-mono text-xs text-husk">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => cambiarZoom(0.1)}
                aria-label="Acercar"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setAjustar(true);
                  aplicarAjuste();
                }}
                aria-label="Ajustar al ancho"
                title="Ajustar al ancho"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Resumen */}
          <p className="border-b border-line px-3 py-2 text-xs text-husk">
            {elegidos.length > 0 ? (
              <>
                <span className="font-semibold text-honeysoft">
                  {elegidos.length} producto{elegidos.length === 1 ? '' : 's'} seleccionados
                </span>{' '}
                · {totalPagesGeneradas} página{totalPagesGeneradas === 1 ? '' : 's'}
              </>
            ) : (
              <>
                {visibles.length} producto{visibles.length === 1 ? '' : 's'} ·{' '}
                {Math.max(totalPages, 1)} página{Math.max(totalPages, 1) === 1 ? '' : 's'}
              </>
            )}{' '}
            · archivo <span className="font-mono text-honeysoft">{catalogFileName(branding)}</span>
          </p>

          {/* Hoja */}
          <div
            ref={visorRef}
            className="scrollbar-hide flex justify-center overflow-auto bg-[#2d2214] p-3"
            style={{ maxHeight: '78vh' }}
          >
            {visibles.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
                <BookOpen className="h-9 w-9 text-husk/60" />
                <p className="font-medium text-cream">No hay productos que catalogar</p>
                <p className="text-sm text-husk/70">
                  Activa productos en la tienda o elige otra categoría.
                </p>
              </div>
            ) : (
              <div
                className="relative flex-shrink-0 shadow-[0_18px_50px_rgba(0,0,0,.55)]"
                style={{ width: `${CATALOG_METRICS.pageW * zoom}mm`, height: `${CATALOG_METRICS.pageH * zoom}mm` }}
              >
                <div
                  className="absolute left-0 top-0 origin-top-left"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <CatalogPage
                    hoja={hojaActual}
                    metrics={CATALOG_METRICS}
                    options={options}
                    branding={branding}
                    accent={accent}
                    honey={honey}
                    pageIndex={paginaActual}
                    totalPages={totalPages}
                    totalCategoria={totalCategoriaActual}
                    totalProductos={visibles.length}
                    totalCategorias={totalCategoriasActual}
                    indice={indicePrevia}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
