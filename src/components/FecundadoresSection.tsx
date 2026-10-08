import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { uid } from '../data';
import { getNextNucleoCode } from '../services/transfers';
import { ENTITY_BORDER_COLORS, type Hive } from '../types/hive';
import type { BreedingLot } from '../types/breeding';
import type { Fecundador, FecundadorQueenState, FecundadorHistorialEntry } from '../types/fecundador';
import {
  FECUNDADOR_STATE_LABELS,
  FECUNDADOR_STATE_COLORS,
  FECUNDADOR_STATE_ORDER,
} from '../types/fecundador';
import { IconPlus, IconTrash, IconQueen } from '../ui';
import type { PhotoData } from '../services/photos';
import FecundadorForm, { type FecundadorFormData } from './FecundadorForm';
import FecundadorDetail from './FecundadorDetail';
import FecundadorInspectionModal, {
  type FecundadorInspectionDraft,
} from './FecundadorInspectionModal';
import ShowMoreButton from './ShowMoreButton';
import AnimatedTabs from './AnimatedTabs';
import { useScrollLock } from '../hooks/useScrollLock';
import { useClosingPanel } from '../hooks/useClosingPanel';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { backdropVariants, modalVariants } from '../lib/motion';

interface FecundadoresSectionProps {
  fecundadores: Fecundador[];
  breedingLots: BreedingLot[];
  nuclei: Hive[];
  onShowToast?: (title: string, desc?: string) => void;
  onAddCuadernoEntry?: (text: string) => void;
  onCreate: (f: Fecundador) => void;
  onUpdate: (f: Fecundador) => void;
  onDelete: (id: string) => void;
  onPromote: (fecundador: Fecundador) => void;
  onShowBreedingLot: (lotId: string) => void;
  apiaries?: { id: string; name?: string }[];
  currentApiaryId?: string;
  onTransferFecundador?: (fecundador: Fecundador, destApiaryId: string, motivo: string, fecha: string) => boolean;
}

type StateFilter = 'todas' | FecundadorQueenState;

const formatDay = (iso?: string) => (iso ? format(parseISO(iso), 'd MMM yyyy', { locale: es }) : '');

export default function FecundadoresSection({
  fecundadores,
  breedingLots,
  nuclei,
  onShowToast,
  onAddCuadernoEntry,
  onCreate,
  onUpdate,
  onDelete,
  onPromote,
  onShowBreedingLot,
  apiaries = [],
  currentApiaryId,
  onTransferFecundador,
}: FecundadoresSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Fecundador | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StateFilter>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Id del fecundador cuya inspección se está registrando (abre el modal).
  const [inspectingId, setInspectingId] = useState<string | null>(null);

  // Panel de detalle con NODO ÚNICO: estado closing + clearTimeout al reabrir
  const { closingId, beginClose, cancelClosing } = useClosingPanel();

  const openDetail = (id: string) => {
    cancelClosing();
    setDetailId(id);
  };

  const requestClose = () => {
    if (!detailId) return;
    beginClose(detailId, () => setDetailId(null));
  };

  useScrollLock(!!promoteId || !!deleteId);

  // Columnas por fila, igual que los media queries de `.map-panal` en index.css:
  //   móvil            < 768px  -> 6/5
  //   escritorio/tablet >= 768px -> 9/8
  // Dos tramos y no tres: el corte intermedio de tablet (768-1024px -> 7)
  // hacía que cualquier ventana estrecha se quedara en 7 celdas y pareciera
  // un fallo. Ambos cortes usan exactamente 768 para que CSS y JS cuenten
  // siempre lo mismo.
  // Las filas impares llevan siempre una celda menos: eso es lo que produce el
  // desplazamiento de media celda del panal, y se mantiene en los dos tramos.
  // Si el CSS cuenta 9 celdas y el JS agrupa 6, la rejilla queda más estrecha
  // que el hueco reservado y aparecen huecos a los lados.
  const getCols = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    if (w < 768) return { even: 6, odd: 5 } as const;
    return { even: 9, odd: 8 } as const;
  };
  const [cols, setCols] = useState(getCols);
  // useEffect, no useMemo: con useMemo el valor de retorno (la función de
  // limpieza) se descarta, así que el listener de 'resize' nunca se daba de
  // baja y se acumulaba uno por cada montaje del componente.
  useEffect(() => {
    const onResize = () => setCols(getCols());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const active = useMemo(() => fecundadores.filter(f => f.estado === 'activo'), [fecundadores]);
  const promoted = useMemo(
    () => fecundadores.filter(f => f.estado === 'promovido').sort((a, b) => new Date(b.promotion?.fecha || b.updatedAt).getTime() - new Date(a.promotion?.fecha || a.updatedAt).getTime()),
    [fecundadores],
  );
  const enPuestaCount = active.filter(f => f.queenState === 'en_puesta').length;

  // El texto del buscador se difiere 200 ms (input inmediato, filtrado
  // diferido) para no recalcular ni reiniciar la página en cada tecla.
  const debouncedSearch = useDebouncedValue(searchQuery, 200);

  // Búsqueda "Buscar fecundador..." (filtra por código, nombre, ubicación o estado)
  const searchFiltered = useMemo(() => {
    if (!debouncedSearch.trim()) return active;
    const q = debouncedSearch.toLowerCase();
    return active.filter(
      f =>
        f.code.toLowerCase().includes(q) ||
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.location && f.location.toLowerCase().includes(q)) ||
        FECUNDADOR_STATE_LABELS[f.queenState].toLowerCase().includes(q),
    );
  }, [active, debouncedSearch]);

  const visibleFecundadores = useMemo(
    () => (filter === 'todas' ? searchFiltered : searchFiltered.filter(f => f.queenState === filter)),
    [searchFiltered, filter],
  );

  // Siguiente código F-XX disponible
  const nextCode = useMemo(() => {
    const numeros = fecundadores
      .map(f => {
        const m = f.code.match(/F-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0;
    return `F-${(maxNum + 1).toString().padStart(2, '0')}`;
  }, [fecundadores]);

  const nextNucleoCode = getNextNucleoCode(nuclei);

  // Paginación de render: igual que en el panal de colmenas/núcleos, solo se
  // montan las primeras `visibleCount` celdas. `visibleFecundadores` (lista
  // completa filtrada) sigue contando para los chips y el encabezado. Se
  // reinicia al primer bloque cuando cambia búsqueda, filtro o lista.
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [visibleFecundadores]);
  const shownFecundadores = useMemo(
    () => (visibleCount >= visibleFecundadores.length ? visibleFecundadores : visibleFecundadores.slice(0, visibleCount)),
    [visibleFecundadores, visibleCount]
  );

  // Agrupar fecundadores en filas alternadas: impares `even`, pares `odd` (izquierda a derecha)
  const rows = useMemo(() => {
    const { even, odd } = cols;
    const out: Fecundador[][] = [];
    let i = 0;
    while (i < shownFecundadores.length) {
      const n = out.length % 2 === 0 ? even : odd;
      out.push(shownFecundadores.slice(i, i + n));
      i += n;
    }
    return out;
  }, [shownFecundadores, cols]);

  const renderHex = (f: Fecundador) => {
    const stateColor = FECUNDADOR_STATE_COLORS[f.queenState];
    const selected = f.id === detailId;
    return (
      <motion.div
        key={f.id}
        className={`hex-cell st-${f.queenState} ${selected ? 'selected' : ''}`}
        style={{
          width: 'var(--hex-w)',
          height: 'var(--hex-h)',
          zIndex: selected ? 100 : 1,
          '--hex-border-color': ENTITY_BORDER_COLORS.fecundador,
          '--hex-status-halo': stateColor,
        } as CSSProperties}
        onClick={() => openDetail(f.id)}
        whileHover={{ scale: 1.05, zIndex: 100 }}
        whileTap={{ scale: 0.97 }}
        initial={false}
        animate={{ scale: selected ? 1.05 : 1 }}
        transition={{ type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Borde del color del TIPO (lila fecundador) */}
        <div className="hex-border" />
        {/* Relleno con degradado (borde de 3px visible) */}
        <div className="hex-fill" />
        {/* Contenido centrado: el ESTADO de la reina se indica dentro */}
        <div className="hex-content">
          <div className="hex-code" style={{ fontSize: 'max(calc(var(--hex-w) * 0.2), 11px)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.15 }}>
            {f.code}
          </div>
          <div className="hex-meta" style={{ fontSize: 'max(calc(var(--hex-w) * 0.12), 8px)', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1, color: stateColor }}>
            {FECUNDADOR_STATE_LABELS[f.queenState].split(' ')[0]}
          </div>
        </div>
      </motion.div>
    );
  };

  const getBreedingLotLabel = (id?: string) => {
    if (!id) return '—';
    const lot = breedingLots.find(l => l.id === id);
    return lot ? `Lote ${id.slice(-6).toUpperCase()} · ${lot.tipo}` : `Lote ${id.slice(-6).toUpperCase()}`;
  };

  const handleSave = (data: FecundadorFormData) => {
    const now = new Date().toISOString();
    if (editing) {
      const updated: Fecundador = {
        ...editing,
        ...data,
        updatedAt: now,
      };
      onUpdate(updated);
      onShowToast?.('Fecundador actualizado', data.code);
    } else {
      const nuevo: Fecundador = {
        id: uid(),
        ...data,
        estado: 'activo',
        historial: [{ id: uid(), fecha: now, tipo: 'creado' }],
        createdAt: now,
        updatedAt: now,
      };
      onCreate(nuevo);
      onAddCuadernoEntry?.(`Creado fecundador ${nuevo.code} (${FECUNDADOR_STATE_LABELS[nuevo.queenState]})${nuevo.breedingLotId ? ` vinculado a lote de cría` : ''}`);
      onShowToast?.('Fecundador creado', nuevo.code);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleAdvanceState = (id: string, state: FecundadorQueenState) => {
    const fec = fecundadores.find(f => f.id === id);
    if (!fec) return;
    const now = new Date().toISOString();
    const day = now.slice(0, 10);
    const updated: Fecundador = {
      ...fec,
      queenState: state,
      fechaNacimiento: state === 'virgen' ? day : fec.fechaNacimiento,
      fechaFecundacion: state === 'fecundada' ? day : fec.fechaFecundacion,
      fechaPuesta: state === 'en_puesta' ? day : fec.fechaPuesta,
      historial: [...fec.historial, { id: uid(), fecha: now, tipo: state }],
      updatedAt: now,
    };
    onUpdate(updated);
    onAddCuadernoEntry?.(`Fecundador ${fec.code}: reina pasa a ${FECUNDADOR_STATE_LABELS[state]}`);
    onShowToast?.('Reina avanzada', `${fec.code} · ${FECUNDADOR_STATE_LABELS[state]}`);
  };

  const handlePromote = () => {
    const fec = fecundadores.find(f => f.id === promoteId);
    if (!fec) return;
    onPromote(fec);
    setPromoteId(null);
  };

  const handleUpdateFotos = (id: string, fotos: PhotoData[]) => {
    const fec = fecundadores.find(f => f.id === id);
    if (!fec) return;
    onUpdate({ ...fec, fotos, updatedAt: new Date().toISOString() });
    onShowToast?.('Fotos actualizadas', fec.code);
  };

  const handleUpdatePhotos = (id: string, photos: string[]) => {
    const fec = fecundadores.find(f => f.id === id);
    if (!fec) return;
    onUpdate({ ...fec, photos, updatedAt: new Date().toISOString() });
    onShowToast?.('Fotos actualizadas', fec.code);
  };

  const handleRegisterInspection = (id: string) => {
    const fec = fecundadores.find(f => f.id === id);
    if (!fec) return;
    setInspectingId(fec.id);
  };

  // Guarda la inspección DEL FORMULARIO (no se guarda nada hasta que el usuario
  // pulsa "Guardar inspección"). Añade la entrada al historial del baby nuc,
  // actualiza el estado de la reina si cambió y, si se marcó, abre la
  // confirmación de promoción a núcleo.
  const handleSaveInspection = (draft: FecundadorInspectionDraft) => {
    const fec = fecundadores.find(f => f.id === inspectingId);
    if (!fec) return;

    const now = new Date().toISOString();
    const stateChanged = draft.queenState !== fec.queenState;

    const entries: FecundadorHistorialEntry[] = [
      {
        id: uid(),
        fecha: draft.fecha,
        tipo: 'inspeccion',
        descripcion: draft.observaciones || 'Revisión del baby nuc (manejo)',
        photos: draft.photos,
      },
    ];
    if (stateChanged) {
      entries.push({ id: uid(), fecha: now, tipo: draft.queenState });
    }

    const updated: Fecundador = {
      ...fec,
      queenState: draft.queenState,
      fechaNacimiento: stateChanged && draft.queenState === 'virgen' ? draft.fecha.slice(0, 10) : fec.fechaNacimiento,
      fechaFecundacion: stateChanged && draft.queenState === 'fecundada' ? draft.fecha.slice(0, 10) : fec.fechaFecundacion,
      fechaPuesta: stateChanged && draft.queenState === 'en_puesta' ? draft.fecha.slice(0, 10) : fec.fechaPuesta,
      proximaRevision: draft.proximaRevision || undefined,
      historial: [...fec.historial, ...entries],
      updatedAt: now,
    };

    onUpdate(updated);
    onAddCuadernoEntry?.(
      `Inspección registrada en fecundador ${fec.code}${stateChanged ? ` · reina en ${FECUNDADOR_STATE_LABELS[draft.queenState]}` : ''}${draft.proximaRevision ? ` · próxima revisión ${draft.proximaRevision}` : ''}`
    );
    setInspectingId(null);

    // Toast DESPUÉS de guardar.
    onShowToast?.('Inspección registrada', `${fec.code} · ${FECUNDADOR_STATE_LABELS[draft.queenState]}`);

    // Si se pidió promover (reina en puesta + activo), abrir la confirmación
    // existente para crear el núcleo.
    if (draft.promover && draft.queenState === 'en_puesta' && fec.estado === 'activo') {
      setPromoteId(fec.id);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    cancelClosing();
    const fec = fecundadores.find(f => f.id === deleteId);
    if (fec) {
      onAddCuadernoEntry?.(`Eliminado fecundador ${fec.code}`);
      onShowToast?.('Fecundador eliminado', fec.code);
    }
    onDelete(deleteId);
    setDeleteId(null);
    if (detailId === deleteId) setDetailId(null);
  };

  const selectedFecundador = detailId ? fecundadores.find(f => f.id === detailId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold text-cream">Fecundadores</h2>
          <p className="mt-1 font-mono text-xs text-husk">
            {active.length} activos · {enPuestaCount} en puesta · {promoted.length} promovidos a núcleo
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-mono text-cream">{searchFiltered.length} fecundador{searchFiltered.length !== 1 ? 'es' : ''}</p>
          </div>
          <button
            aria-label="Crear fecundador"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5A623] text-ink shadow-[0_2px_12px_rgba(245,166,35,.5)] transition-all hover:shadow-[0_4px_16px_rgba(245,166,35,.75)]"
          >
            <IconPlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-14 items-center justify-center hexclip bg-honey/20">
            <IconQueen className="h-8 w-8 text-honey" />
          </div>
          <p className="text-husk text-lg">No hay fecundadores activos</p>
          <p className="text-xs text-husk/60 mt-2">Crea tu primer baby nuc con el botón +</p>
          {promoted.length > 0 && (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-husk/50">
              {promoted.length} promovido{promoted.length !== 1 ? 's' : ''} en historial
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Buscador de fecundadores */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fecundador..."
              className="w-full rounded-xl border border-line bg-ink/50 pl-12 pr-12 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-husk/20 hover:bg-husk/40 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </motion.div>

          {/* Chips de filtro por estado de reina — indicador deslizante (misma animación que Tienda) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <AnimatedTabs
              className="flex flex-wrap items-center gap-1.5"
              ariaLabel="Filtrar por estado de reina"
              items={[
                { key: 'todas' as StateFilter, label: 'Todas' },
                ...FECUNDADOR_STATE_ORDER.map((s) => ({ key: s as StateFilter, label: FECUNDADOR_STATE_LABELS[s] })),
              ]}
              value={filter}
              onChange={(key) => setFilter((prev) => (prev === key && key !== 'todas' ? 'todas' : key))}
              renderTab={(item, isActive) => {
                if (item.key === 'todas') {
                  return (
                    <>
                      Todas
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none bg-ink/15">{active.length}</span>
                    </>
                  );
                }
                const s = item.key;
                const n = active.filter((f) => f.queenState === s).length;
                const color = FECUNDADOR_STATE_COLORS[s];
                return (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                    {FECUNDADOR_STATE_LABELS[s]}
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none"
                      style={isActive ? { background: 'rgba(0,0,0,.2)' } : { backgroundColor: color + '20', color }}
                    >
                      {n}
                    </span>
                  </>
                );
              }}
            />
          </motion.div>

          {/* Mapa hexagonal compacto (baby nucs · hexágonos al 70%) */}
          <div
            className="card map-panal map-fecundadores relative overflow-visible"
            style={{ padding: 10 }}
          >
            <div className="mapa-hex-container">
              {visibleFecundadores.length === 0 && (
                <div className="py-14 text-center">
                  <p className="text-husk text-sm">
                    {searchQuery.trim() || filter !== 'todas'
                      ? 'No hay fecundadores que coincidan con la búsqueda o el filtro.'
                      : 'No hay fecundadores en esta etapa.'}
                  </p>
                </div>
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
                  {row.map((f) => renderHex(f))}
                </div>
              ))}
            </div>
            <ShowMoreButton
              shown={shownFecundadores.length}
              total={visibleFecundadores.length}
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            />
            <p className="relative mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-husk">
              Toca un hexágono para ver el detalle del baby nuc
            </p>
          </div>
        </>
      )}

      {/* Historial de promovidos */}
      {promoted.length > 0 && (
        <div>
          <p className="tick-label mb-3 flex items-center gap-2">
            <IconQueen className="h-3 w-3 text-husk" />
            Historial de promociones
          </p>
          <div className="space-y-2">
            {promoted.map(f => (
              <div key={f.id} className="card p-4 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => openDetail(f.id)}>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: '#a3bf7f' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold text-cream uppercase">{f.code}</span>
                      {f.promotion?.nucleoCode && (
                        <span className="rounded-full border border-sage/40 bg-sage/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-sage">
                          → {f.promotion.nucleoCode}
                        </span>
                      )}
                      {f.breedingLotId && (
                        <span className="text-[10px] font-mono text-husk">{getBreedingLotLabel(f.breedingLotId)}</span>
                      )}
                    </div>
                    <p className="text-xs text-husk mt-0.5">
                      Promovido el {formatDay(f.promotion?.fecha?.slice(0, 10))}
                      {f.name ? ` · ${f.name}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón flotante - Eliminado: el "+" vive en el encabezado de la sección */}

      {/* Formulario crear/editar */}
      <AnimatePresence>
        {showForm && (
          <FecundadorForm
            breedingLots={breedingLots}
            nextCode={nextCode}
            existingCodes={fecundadores.map(f => f.code)}
            fecundador={editing}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Detalle: NODO ÚNICO, siempre en flujo normal (accordion-cell) */}
      <div className={`accordion-grid ${selectedFecundador && closingId !== selectedFecundador.id ? 'open' : ''}`}>
        {selectedFecundador && (
          <FecundadorDetail
            fecundador={selectedFecundador}
            breedingLots={breedingLots}
            nextNucleoCode={nextNucleoCode}
            getBreedingLotLabel={getBreedingLotLabel}
            apiaries={apiaries}
            currentApiaryId={currentApiaryId}
            closing={closingId === selectedFecundador.id}
            onClose={requestClose}
            onAdvanceState={handleAdvanceState}
            onEdit={() => {
              setEditing(selectedFecundador);
              setShowForm(true);
            }}
            onRequestPromote={() => setPromoteId(selectedFecundador.id)}
            onRequestDelete={() => setDeleteId(selectedFecundador.id)}
            onUpdateFotos={(fotos) => handleUpdateFotos(selectedFecundador.id, fotos)}
            photos={selectedFecundador.photos || []}
            onPhotosChange={(photos) => handleUpdatePhotos(selectedFecundador.id, photos)}
            onRegisterInspection={() => handleRegisterInspection(selectedFecundador.id)}
            onTransfer={onTransferFecundador}
            onShowBreedingLot={onShowBreedingLot}
            onShowToast={onShowToast}
          />
        )}
      </div>

      {/* Modal de inspección del baby nuc: se abre con "+ Registrar inspección" */}
      <FecundadorInspectionModal
        open={inspectingId !== null}
        fecundador={inspectingId ? fecundadores.find((f) => f.id === inspectingId) ?? null : null}
        nextNucleoCode={nextNucleoCode}
        onClose={() => setInspectingId(null)}
        onSubmit={handleSaveInspection}
      />

      {/* Confirmar promoción */}
      <AnimatePresence>
        {promoteId && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none" onClick={() => setPromoteId(null)} />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-xl font-bold text-cream mb-2">¿Promover a núcleo?</h4>
              <p className="text-sm text-husk mb-5">
                El fecundador se marcará como <b className="text-sage">promovido</b> y se creará el núcleo{' '}
                <b className="text-cream">{nextNucleoCode}</b>. Se conservará su historial aquí y se registrará en el cuaderno.
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={handlePromote}
                  className="flex-1 rounded-xl bg-sage py-2 text-sm font-semibold text-ink hover:opacity-90"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Promover
                </motion.button>
                <motion.button
                  onClick={() => setPromoteId(null)}
                  className="flex-1 rounded-xl border border-line py-2 text-sm font-medium text-husk hover:bg-ink/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmar eliminación */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none" onClick={() => setDeleteId(null)} />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-xl font-bold text-cream mb-2 flex items-center gap-2">
                <IconTrash className="h-5 w-5 text-coral" />
                ¿Eliminar fecundador?
              </h4>
              <p className="text-sm text-husk mb-5">
                Esta acción no se puede deshacer. Se eliminará el baby nuc y su historial se perderá.
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-coral py-2 text-sm font-semibold text-white hover:bg-coral/90"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Eliminar
                </motion.button>
                <motion.button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 rounded-xl border border-line py-2 text-sm font-medium text-husk hover:bg-ink/50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}