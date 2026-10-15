import { useState, useMemo, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import { useHexGrid } from '../lib/useHexGrid';
import { motion } from 'framer-motion';
import {
  STATUS_COLORS,
  ENTITY_BORDER_COLORS,
  STATUS_HALO_COLORS,
  type Hive,
  type HiveStatus,
  type EntityType,
} from "../types/hive";
import { IconAlert, IconCrown } from '../ui';
import ShowMoreButton from './ShowMoreButton';
import AnimatedTabs from './AnimatedTabs';

interface Props {
  hives: Hive[];
  selectedId: string;
  onSelect: (id: string) => void;
  filter: HiveStatus | "todas" | "transferidas" | "polinizacion";
  onFilter: (f: HiveStatus | "todas" | "transferidas" | "polinizacion") => void;
  query: string;
  entityType?: EntityType;
  /**
   * Celdas que se pintan por bloque. La rejilla monta de golpe todas las
   * colmenas de la lista; con listas largas eso son cientos de `motion.div`.
   * Ver `ShowMoreButton`. Pon `Infinity` para desactivar la paginación.
   */
  pageSize?: number;
  /** Códigos de colmena asignados a contratos de polinización activos. */
  polinizacionCodes?: string[];
  favorites?: string[];
  onToggleFavorite?: (hiveId: string) => void;
  compareMode?: boolean;
  selectedForCompare?: string[];
  onToggleCompare?: (hiveId: string) => void;
  calculateHealth?: (hive: Hive) => number;
  title?: string;
  countLabel?: string;
  distributionLabel?: string;
  allChipLabel?: string;
  emptyStateText?: string;
  emptyStateFilteredText?: string;
  emptyStateInvitation?: string;
  helpText?: string;
  entitySingular?: string;
}

// Arrays vacíos compartidos: si se usan literales `[]` como valor por defecto,
// cada render crea una referencia nueva. Eso cambia la identidad de `isDim`,
// obliga a recomputar `visibleHives` y dispara el efecto que reinicia
// `visibleCount` a la primera página en cada render; el botón "Cargar más"
// se deshacía al instante en las secciones que no pasan estas props (Núcleos).
const EMPTY_CODES: string[] = [];
const EMPTY_FAVORITES: string[] = [];
const EMPTY_COMPARE: string[] = [];

function shortDays(date: string | null): string {
  if (!date) return "—";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d <= 0) return "hoy";
  if (d === 1) return "1d";
  return `${d}d`;
}

export default function HiveComb({ 
  hives, 
  selectedId, 
  onSelect, 
  filter, 
  onFilter, 
  query, 
  entityType = 'colmena',
  pageSize = 50,
  polinizacionCodes = EMPTY_CODES,
  favorites = EMPTY_FAVORITES,
  onToggleFavorite,
  compareMode = false,
  selectedForCompare = EMPTY_COMPARE,
  onToggleCompare,
  calculateHealth,
  countLabel = 'colonias',
  distributionLabel = 'distribución por calles',
  allChipLabel = 'TODAS',
  emptyStateText = 'No hay colmenas registradas',
  emptyStateFilteredText = 'No hay colmenas con este filtro',
  emptyStateInvitation = '',
  helpText = 'Toca una celda para ver detalles de la colmena',
  entitySingular = 'colmena',
}: Props) {
  // Columnas por fila, igual que los media queries de `.map-panal` en index.css:
  //   móvil            < 768px  -> 6/5
  //   tablet/escritorio >= 768px -> 9/8
  //   escritorio ancho  >= 1280px -> 11/10
  // Las filas impares llevan siempre una celda menos: eso es lo que produce el
  // desplazamiento de media celda del panal. Cada tramo debe coincidir EXACTO
  // con su media query de CSS: si el CSS cuenta 11 celdas y el JS agrupa 9, la
  // rejilla queda más estrecha que el hueco reservado y sobran huecos a lados.
  // Columnas según el ancho REAL del recuadro (ver lib/useHexGrid).
  const { ref: gridRef, cols } = useHexGrid<HTMLDivElement>();

  const isDim = useCallback(
    (h: Hive) =>
      (filter === "transferidas" ? !h.transferida :
        filter === "polinizacion" ? !polinizacionCodes.includes(h.code) :
        (filter !== "todas" && h.status !== filter)) ||
      (query.trim() !== "" && !h.code.toLowerCase().includes(query.trim().toLowerCase())),
    [filter, query, polinizacionCodes]
  );

  // Calcular estadísticas para los chips
  const healthyCount = hives.filter(h => h.status === 'saludable').length;
  const revisionCount = hives.filter(h => h.status === 'revision').length;
  const alertCount = hives.filter(h => h.status === 'alerta').length;
  const noQueenCount = hives.filter(h => h.status === 'sin_reina').length;
  const transferredCount = hives.filter(h => h.transferida === true).length;
  const polinizacionCount = hives.filter(h => polinizacionCodes.includes(h.code)).length;

  const chips: { key: HiveStatus | "todas" | "transferidas" | "polinizacion"; label: string; n: number; color?: string }[] = [
    { key: "todas", label: allChipLabel, n: hives.length, color: "#f0a41c" },
    { key: "saludable", label: "SALUDABLE", n: healthyCount, color: STATUS_COLORS.saludable },
    { key: "revision", label: "REVISIÓN", n: revisionCount, color: STATUS_COLORS.revision },
    { key: "alerta", label: "ALERTA", n: alertCount, color: STATUS_COLORS.alerta },
    { key: "sin_reina", label: "SIN REINA", n: noQueenCount, color: STATUS_COLORS.sin_reina },
    { key: "transferidas", label: "TRANSFERIDAS", n: transferredCount, color: "#8fa3bf" },
  ];

  if (entityType === 'colmena') {
    chips.push({ key: "polinizacion", label: "EN POLINIZACIÓN", n: polinizacionCount, color: "#7fa572" });
  }

  // Filtrar colmenas visibles. `polinizacionCodes` faltaba en las
  // dependencias: al cambiar el filtro de polinización (que llega como prop
  // desde App) la rejilla seguía mostrando las celdas del conjunto anterior.
  const visibleHives = useMemo(() => hives.filter((h) => !isDim(h)), [hives, isDim]);

  // Paginación de render: solo se montan las primeras `visibleCount` celdas.
  // La lista filtrada completa (`visibleHives`) sigue alimentando los chips y
  // el total; lo que se recorta es el DOM. Se reinicia a la primera página
  // cuando cambia el conjunto filtrado (filtro, búsqueda o entidad).
  const [visibleCount, setVisibleCount] = useState(pageSize);
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [visibleHives, pageSize]);

  const shownHives = useMemo(
    () => (visibleCount >= visibleHives.length ? visibleHives : visibleHives.slice(0, visibleCount)),
    [visibleHives, visibleCount]
  );

  // Agrupar hexágonos en filas alternadas: impares `even`, pares `odd` (izquierda a derecha)
  const rows = useMemo(() => {
    const { even, odd } = cols;
    const out: Hive[][] = [];
    let i = 0;
    while (i < shownHives.length) {
      const n = out.length % 2 === 0 ? even : odd;
      out.push(shownHives.slice(i, i + n));
      i += n;
    }
    return out;
  }, [shownHives, cols]);

  const renderHex = (hive: Hive) => {
    const selected = hive.id === selectedId;
    const borderColor = entityType === 'nucleo' ? ENTITY_BORDER_COLORS.nucleo : ENTITY_BORDER_COLORS.colmena;
    const stateClass = hive.transferida ? 'st-transferida' : `st-${hive.status}`;

    const cell = (
      <motion.div
        key={hive.id}
        className={`hex-cell ${stateClass} ${selected ? 'selected' : ''}`}
        style={{
          width: 'var(--hex-w)',
          height: 'var(--hex-h)',
          zIndex: selected ? 100 : 1,
          '--hex-border-color': borderColor,
          '--hex-status-halo': STATUS_HALO_COLORS[hive.status],
        } as CSSProperties}
        aria-label={`${hive.code} · ${entitySingular}`}
        onClick={() => {
          if (compareMode && onToggleCompare) {
            onToggleCompare(hive.id);
          } else {
            onSelect(hive.id);
          }
        }}
        whileHover={{ scale: 1.05, zIndex: 100 }}
        whileTap={{ scale: 0.97 }}
        initial={false}
        animate={{ scale: selected ? 1.05 : 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Borde del color del TIPO (dorado colmena / cobre núcleo) */}
        <div className="hex-border" />
        {/* Relleno con degradado (borde de 3px visible) */}
        <div className="hex-fill" />
        {/* Contenido centrado: ícono de ESTADO arriba del código */}
        <div className="hex-content">
          <div
            style={{
              height: 'calc(var(--hex-w) * 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
              lineHeight: 1,
            }}
          >
            {hive.status === 'revision' && (
              <span
                style={{
                  width: 'calc(var(--hex-w) * 0.15)',
                  height: 'calc(var(--hex-w) * 0.15)',
                  borderRadius: '50%',
                  background: STATUS_HALO_COLORS.revision,
                  boxShadow: `0 0 8px ${STATUS_HALO_COLORS.revision}`,
                }}
              />
            )}
            {hive.status === 'alerta' && (
              <span style={{ color: STATUS_HALO_COLORS.alerta, display: 'flex' }}>
                <IconAlert className="hex-status-icon" />
              </span>
            )}
            {hive.status === 'sin_reina' && (
              <span style={{ color: STATUS_HALO_COLORS.sin_reina, display: 'flex' }}>
                <IconCrown className="hex-status-icon" />
              </span>
            )}
          </div>
          <div className="hex-code" style={{ fontSize: 'calc(var(--hex-w) * 0.2)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.15 }}>
            {hive.code}
          </div>
          <div className="hex-meta" style={{ fontSize: 'calc(var(--hex-w) * 0.13)', opacity: 0.9, fontWeight: 600, lineHeight: 1 }}>
            {shortDays(hive.updatedAt)}
          </div>
        </div>
      </motion.div>
    );

    return cell;
  };

  return (
    <div>
      {/* Filtros tipo pill — indicador deslizante (misma animación que Tienda) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <AnimatedTabs
          className="mb-6 flex flex-wrap items-center gap-1.5 lg:flex-nowrap"
          ariaLabel="Filtrar por estado"
          items={chips}
          value={filter}
          onChange={onFilter}
          hoverScale={1.03}
          renderTab={(item, active) => {
            const c = chips.find((x) => x.key === item.key)!;
            return (
              <>
                {c.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />}
                {c.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${active ? 'bg-ink/20 text-ink' : ''}`}
                  style={!active && c.color ? {
                    background: `${c.color}20`,
                    color: c.color,
                    border: `1px solid ${c.color}40`,
                  } : {}}
                >
                  {c.n}
                </span>
              </>
            );
          }}
        />
      </motion.div>

      {/* Mapa hexagonal compacto (panal: 6/5 móvil, 9/8 tablet y escritorio,
          con offset en las filas pares y solape vertical) */}
      <div
        ref={gridRef}
        className="card map-panal relative overflow-visible"
        style={{ padding: 10 }}
      >
        {/* Botón flotante de agregar - Eliminado: el "+" vive en el encabezado de sección */}

        {/* Contenedor del panal - centrado definido en index.css (.mapa-hex-container) */}
        <div className="mapa-hex-container">
          {visibleHives.length === 0 && (
            <motion.div 
              className="text-center py-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mx-auto mb-4 flex h-16 w-14 items-center justify-center hexclip bg-honey/20">
                <svg className="h-8 w-8 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-husk text-sm font-medium">
                {filter === "todas" ? emptyStateText : emptyStateFilteredText}
              </p>
              {emptyStateInvitation && (
                <p className="text-husk/70 text-sm mt-2">{emptyStateInvitation}</p>
              )}
            </motion.div>
          )}

          {/* Filas del panal: offset por paridad lo define index.css (.fila:nth-child(even)) */}
          {rows.map((row, ri) => (
            <div
              key={ri}
              className="fila"
              style={{
                zIndex: rows.length - ri,
                '--hex-row-delay': `${ri * 90}ms`,
              } as CSSProperties}
            >
              {row.map((hive) => renderHex(hive))}
            </div>
          ))}
        </div>

        <ShowMoreButton
          shown={shownHives.length}
          total={visibleHives.length}
          onClick={() => setVisibleCount((c) => c + pageSize)}
        />

        <motion.p 
          className="relative mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-husk"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {helpText}
        </motion.p>
      </div>
    </div>
  );
}
