import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays, parseISO, format, subMonths, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Hive } from '../types/hive';
import type { BreedingLot, BreedingStatus } from '../types/breeding';
import { BREEDING_STATUS_LABELS, BREEDING_STATUS_COLORS, BREEDING_TYPE_LABELS } from '../types/breeding';
import type { Queen } from '../types/queen';
import { IconPlus, IconQueen, IconTrash } from '../ui';
import BreedingForm from './BreedingForm';
import { QueenChronology } from './TechPanels';
import BreedingDetail from './BreedingDetail';
import { useScrollLock } from '../hooks/useScrollLock';
import { useClosingPanel } from '../hooks/useClosingPanel';
import { backdropVariants, modalVariants } from '../lib/motion';

interface BreedingSectionProps {
  hives: Hive[];
  nuclei: Hive[];
  breedingLots: BreedingLot[];
  onUpdateLots: (lots: BreedingLot[]) => void;
  onAddCalendarEvent: (event: { title: string; date: string; description: string }) => void;
  onDeleteCalendarEvent: (titlePattern: string) => void;
  onAddCuadernoEntry: (text: string) => void;
  onShowToast?: (title: string, desc?: string) => void;
  queens?: Queen[];
  focusLotId?: string | null;
  onConsumeFocusLot?: () => void;
  onAssignQueenFromLot?: (lotId: string, hiveId: string) => void;
}

const STATUS_FLOW: BreedingLot['estado'][] = ['enRealeras', 'enjauladas', 'nacidas', 'fecundando', 'aceptadas'];

const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy', { locale: es });

/* Tarjeta de KPI del resumen. Va fuera del componente para que React no
   desmonte y remonte los nodos en cada render. */
function Kpi({ label, value, sub, tone = 'text-cream' }: {
  label: string;
  value: string | number;
  sub: string;
  tone?: string;
}) {
  return (
    <div className="card p-4">
      <p className="tick-label">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-husk">{sub}</p>
    </div>
  );
}

export default function BreedingSection({
  hives, nuclei, breedingLots, onUpdateLots,
  onAddCalendarEvent, onDeleteCalendarEvent, onAddCuadernoEntry, onShowToast,
  queens = [],
  focusLotId,
  onConsumeFocusLot,
  onAssignQueenFromLot,
}: BreedingSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [detailLotId, setDetailLotId] = useState<string | null>(null);
  const [openStateMenuId, setOpenStateMenuId] = useState<string | null>(null);
  const [confirmDeleteLotId, setConfirmDeleteLotId] = useState<string | null>(null);
  const [assignLotId, setAssignLotId] = useState<string | null>(null);
  const [assignHiveId, setAssignHiveId] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<BreedingStatus | 'todas' | 'alerta'>('todas');
  const [orden, setOrden] = useState<'recientes' | 'hitos' | 'aceptacion'>('recientes');
  const allColonies = [...hives, ...nuclei];

  // Al reabrir un detalle se cancela cualquier cierre pendiente.
  const { cancelClosing } = useClosingPanel();

  const openDetail = (id: string) => {
    cancelClosing();
    setDetailLotId(id);
  };

  // Cierre inmediato: en superposición la animación de salida la gestiona
  // AnimatePresence, así que ya no hace falta el retardo de `beginClose`
  // (que estaba pensado para animar la altura del acordeón).
  const requestClose = () => setDetailLotId(null);

  useScrollLock(!!assignLotId || !!confirmDeleteLotId || !!detailLotId);

  useEffect(() => {
    if (!confirmDeleteLotId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmDeleteLotId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmDeleteLotId]);

  // Esc cierra la superposición del detalle.
  useEffect(() => {
    if (!detailLotId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailLotId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailLotId]);

  useEffect(() => {
    if (!openStateMenuId) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-state-menu]')) {
        setOpenStateMenuId(null);
      }
    };
    setTimeout(() => document.addEventListener('click', onClick), 0);
    return () => document.removeEventListener('click', onClick);
  }, [openStateMenuId]);

  const today = new Date();

  /* Un lote aceptado SIN reina asignada sigue siendo trabajo pendiente: se
     queda en la lista activa (y por eso sale del historial) hasta que se le
     asigne una reina. Antes desaparecía de la lista en cuanto pasaba a
     "aceptadas" y el botón de asignar, que vive en esta misma tarjeta, nunca
     llegaba a pintarse: solo se podía asignar desde el detalle. */
  const pendingAssign = useCallback(
    (l: BreedingLot) => l.estado === 'aceptadas' && !queens.some(q => q.loteId === l.id),
    [queens],
  );

  const activeLots = useMemo(() =>
    breedingLots
      .filter(l => l.estado !== 'perdidas' && (l.estado !== 'aceptadas' || pendingAssign(l)))
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()),
    [breedingLots, pendingAssign],
  );

  const historyLots = useMemo(() => {
    const threeMonthsAgo = subMonths(today, 3);
    return breedingLots
      .filter(l => (l.estado === 'perdidas' || (l.estado === 'aceptadas' && !pendingAssign(l))))
      .filter(l => isAfter(parseISO(l.fechaInicio), threeMonthsAgo))
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
  }, [breedingLots, pendingAssign, today]);

  const fecundandoCount = breedingLots.filter(l => l.estado === 'fecundando').length;

  const avgAcceptance = useMemo(() => {
    const withAcceptance = breedingLots.filter(l => l.acceptance);
    if (withAcceptance.length === 0) return null;
    const sum = withAcceptance.reduce((acc, l) => acc + (l.acceptance?.percentage ?? 0), 0);
    return Math.round(sum / withAcceptance.length);
  }, [breedingLots]);

  const getColonyLabel = (id: string) => {
    const colony = allColonies.find(c => c.id === id);
    return colony ? `${colony.code}${colony.name ? ` · ${colony.name}` : ''}` : '—';
  };

  const getLotLabel = (id: string) => {
    const lot = breedingLots.find(l => l.id === id);
    return lot
      ? `Lote ${id.slice(-6).toUpperCase()} · ${BREEDING_TYPE_LABELS[lot.tipo]}`
      : `Lote ${id.slice(-6).toUpperCase()}`;
  };

  const hasQueenFromLot = (lotId: string) => queens.some(q => q.loteId === lotId);

  const assignQueenFromLot = (lotId: string, hiveId: string) => {
    if (onAssignQueenFromLot) {
      onAssignQueenFromLot(lotId, hiveId);
    }
    setAssignLotId(null);
    setAssignHiveId('');
  };

  // Abrir directamente un lote del apiario (vinculado desde una reina)
  useEffect(() => {
    if (focusLotId) {
      openDetail(focusLotId);
      onConsumeFocusLot?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLotId]);

  const getLotAlert = (lot: BreedingLot) => {
    if (lot.estado === 'perdidas') return null;
    const daysUntilEnjaulado = differenceInDays(parseISO(lot.fechaEnjauladoEstimada), today);
    const daysUntilBirth = differenceInDays(parseISO(lot.fechaNacimientoEstimada), today);
    const isOverdueBirth = lot.estado !== 'nacidas' && lot.estado !== 'fecundando' && lot.estado !== 'aceptadas' && today > parseISO(lot.fechaNacimientoEstimada);

    if (isOverdueBirth) return { color: 'bg-coral/15 border-coral/40 text-coral', text: 'Atrasado' };
    if (daysUntilBirth >= 0 && daysUntilBirth <= 2) return { color: 'bg-sage/15 border-sage/40 text-sage', text: 'Nacimiento pronto' };
    if (daysUntilEnjaulado === 0) return { color: 'bg-honey/15 border-honey/40 text-honey', text: 'Día de enjaulado' };
    if (daysUntilEnjaulado === 1) return { color: 'bg-orange-400/15 border-orange-400/40 text-orange-400', text: 'Enjaulado mañana' };
    return null;
  };

  /* ------------------------------------------------------------------
     Resumen de la pestaña: qué necesita ojo ahora mismo.
     ------------------------------------------------------------------ */
  const needsAttention = (lot: BreedingLot) => {
    const daysElapsed = differenceInDays(today, parseISO(lot.fechaInicio));
    return (
      getLotAlert(lot) !== null ||
      (!lot.acceptance && daysElapsed >= 3) ||
      pendingAssign(lot)
    );
  };

  const reinasCriadas = queens.filter(q => q.loteId);
  const reinasActivas = reinasCriadas.filter(q => q.estado === 'activa').length;
  const alertasCount = activeLots.filter(needsAttention).length;
  const medidosCount = breedingLots.filter(l => l.acceptance).length;

  /* Próximos hitos del ciclo (enjaulado y nacimiento) de los lotes vivos,
     ordenados: lo atrasado aparece primero porque es lo que toca resolver. */
  const proximosHitos = useMemo(() => {
    const hitos: { lotId: string; fecha: string; etiqueta: string }[] = [];
    for (const lot of activeLots) {
      if (lot.estado === 'enRealeras') {
        hitos.push({ lotId: lot.id, fecha: lot.fechaEnjauladoEstimada, etiqueta: 'Enjaulado' });
      }
      if (lot.estado === 'enRealeras' || lot.estado === 'enjauladas') {
        hitos.push({ lotId: lot.id, fecha: lot.fechaNacimientoEstimada, etiqueta: 'Nacimiento' });
      }
    }
    return hitos.sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 4);
  }, [activeLots]);

  const hitoRelativo = (iso: string) => {
    const dias = differenceInDays(parseISO(iso), today);
    if (dias < 0) return { txt: `Atrasado ${Math.abs(dias)} d`, urgente: true };
    if (dias === 0) return { txt: 'Hoy', urgente: true };
    if (dias === 1) return { txt: 'Mañana', urgente: true };
    return { txt: `En ${dias} días`, urgente: false };
  };

  /* Siguiente hito pendiente de un lote, para ordenar la lista. '9999…' deja
     al final los que ya no tienen hito (fecundando / aceptadas). */
  const nextHitoIso = (lot: BreedingLot) => {
    const pendientes: string[] = [];
    if (lot.estado === 'enRealeras') pendientes.push(lot.fechaEnjauladoEstimada);
    if (lot.estado === 'enRealeras' || lot.estado === 'enjauladas') pendientes.push(lot.fechaNacimientoEstimada);
    const porVenir = pendientes.filter(f => !isAfter(today, parseISO(f)));
    return porVenir.sort()[0] ?? '9999-12-31';
  };

  /* Comparativa Traslarve vs Nicot: sin registro no hay media, y eso se
     muestra como '—' en vez de un 0% que confunde. */
  const porTipo = useMemo(() => (['Traslarve', 'Nicot'] as const).map((tipo) => {
    const lots = breedingLots.filter(l => l.tipo === tipo);
    const conRegistro = lots.filter(l => l.acceptance);
    const avg = conRegistro.length
      ? Math.round(conRegistro.reduce((acc, l) => acc + (l.acceptance?.percentage ?? 0), 0) / conRegistro.length)
      : null;
    return { tipo, total: lots.length, avg };
  }), [breedingLots]);

  const estadosPresentes = STATUS_FLOW.filter(s => activeLots.some(l => l.estado === s));

  /* Lista filtrada y ordenada que se pinta debajo. El orden por "próximos
     hitos" pone primero lo que toca; "mejor aceptación" sirve para comparar
     lotes ya cerrados sin abrir el detalle de cada uno. */
  const visibleLots = useMemo(() => {
    let list = activeLots;
    if (filtroEstado === 'alerta') list = list.filter(needsAttention);
    else if (filtroEstado !== 'todas') list = list.filter(l => l.estado === filtroEstado);
    if (orden === 'recientes') return list;
    const arr = [...list];
    if (orden === 'aceptacion') {
      arr.sort((a, b) => (b.acceptance?.percentage ?? -1) - (a.acceptance?.percentage ?? -1));
    } else {
      arr.sort((a, b) => nextHitoIso(a).localeCompare(nextHitoIso(b)));
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLots, filtroEstado, orden]);

  const handleCreate = (draft: Omit<BreedingLot, 'id' | 'fechaCreacion' | 'estado' | 'estadoHistorial'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    const newLot: BreedingLot = {
      ...draft,
      id,
      fechaCreacion: now,
      estado: 'enRealeras',
      estadoHistorial: [{ estado: 'enRealeras', fecha: now }],
    };
    onUpdateLots([newLot, ...breedingLots]);

    // Calendar events
    onAddCalendarEvent({
      title: `Enjaulado - Lote ${newLot.id.slice(-6).toUpperCase()}`,
      date: newLot.fechaEnjauladoEstimada,
      description: `Lote de cría ${newLot.tipo} con donante ${getColonyLabel(newLot.coloniaDonante)}`,
    });
    onAddCalendarEvent({
      title: `Nacimiento esperado - Lote ${newLot.id.slice(-6).toUpperCase()}`,
      date: newLot.fechaNacimientoEstimada,
      description: `Nacimiento estimado lote ${newLot.tipo}`,
    });

    // Notebook
    onAddCuadernoEntry(`Iniciado lote de cría de reinas (${newLot.tipo}) con colonia donante ${getColonyLabel(newLot.coloniaDonante)}`);

    setShowForm(false);
  };

  const handleUpdate = (lotId: string, updates: Partial<BreedingLot>) => {
    const lot = breedingLots.find(l => l.id === lotId);
    if (!lot) return;
    const now = new Date().toISOString();
    const newEstado = updates.estado;
    const newAcceptance = updates.acceptance;
    let estadoHistorial = lot.estadoHistorial;
    if (newEstado) {
      estadoHistorial = [...estadoHistorial, { estado: newEstado, fecha: now }];
    }
    if (newAcceptance) {
      estadoHistorial = [...estadoHistorial, {
        estado: 'aceptacion',
        fecha: now,
        descripcion: `Aceptadas: ${newAcceptance.acceptedCount}/${newAcceptance.totalCount} celdas (${newAcceptance.percentage}%)`,
      }];
    }
    const updated: BreedingLot = {
      ...lot,
      ...updates,
      estadoHistorial,
    };
    onUpdateLots(breedingLots.map(l => l.id === lotId ? updated : l));
    if (newEstado) {
      onAddCuadernoEntry(`Lote de cría cambiado a ${BREEDING_STATUS_LABELS[newEstado]}`);
    }
    if (newAcceptance) {
      onAddCuadernoEntry(`Lote ${lot.id.slice(-6).toUpperCase()}: aceptación de ${newAcceptance.acceptedCount}/${newAcceptance.totalCount} celdas (${newAcceptance.percentage}%)`);
      onShowToast?.(
        'Aceptación registrada',
        `${newAcceptance.acceptedCount}/${newAcceptance.totalCount} (${newAcceptance.percentage}%)`,
      );
    }
  };

  const handleDelete = (lotId: string) => {
    const lot = breedingLots.find(l => l.id === lotId);
    if (!lot) return;
    onUpdateLots(breedingLots.filter(l => l.id !== lotId));
    const suffix = lot.id.slice(-6).toUpperCase();
    onDeleteCalendarEvent(`Enjaulado - Lote ${suffix}`);
    onDeleteCalendarEvent(`Nacimiento esperado - Lote ${suffix}`);
  };

  const selectedLot = detailLotId ? breedingLots.find(l => l.id === detailLotId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="tick-label mb-2 flex items-center gap-2">
          <IconQueen className="h-3.5 w-3.5 text-honey" />
          Cría de reinas
        </p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">Cría de Reinas</h2>
        <p className="mt-1 font-mono text-xs text-husk">
          {activeLots.length} lotes activos{fecundandoCount > 0 ? ` · ${fecundandoCount} en fecundación` : ''}
          {alertasCount > 0 ? ` · ${alertasCount} requieren atención` : ''}
        </p>
      </div>

      {/* Resumen: lo que importa de un vistazo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Lotes activos" value={activeLots.length} sub={`${historyLots.length} en historial`} />
        <Kpi
          label="Aceptación media"
          value={avgAcceptance !== null ? `${avgAcceptance}%` : '—'}
          sub={avgAcceptance !== null ? `sobre ${medidosCount} registro${medidosCount !== 1 ? 's' : ''}` : 'sin registros todavía'}
        />
        <Kpi
          label="Reinas de cría"
          value={reinasCriadas.length}
          sub={reinasCriadas.length ? `${reinasActivas} activas hoy` : 'aún sin asignar'}
        />
        <Kpi
          label="Requiere atención"
          value={alertasCount}
          sub={alertasCount ? 'en la lista de abajo' : 'todo al día'}
          tone={alertasCount > 0 ? 'text-coral' : 'text-sage'}
        />
      </div>

      {/* Cronología biológica de la cría */}
      <QueenChronology lots={breedingLots} />

      {/* Agenda y comparativa por método */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="tick-label mb-3">Próximos hitos</p>
          {proximosHitos.length === 0 ? (
            <p className="text-xs text-husk">Sin enjaulados ni nacimientos programados.</p>
          ) : (
            <div className="space-y-1.5">
              {proximosHitos.map((hito, idx) => {
                const rel = hitoRelativo(hito.fecha);
                return (
                  <button
                    key={`${hito.lotId}-${hito.etiqueta}-${idx}`}
                    type="button"
                    onClick={() => openDetail(hito.lotId)}
                    className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-honey/50"
                  >
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold ${rel.urgente ? 'border-coral/40 bg-coral/15 text-coral' : 'border-honey/30 bg-honey/10 text-honey'}`}>
                      {rel.txt}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-cream">
                      {hito.etiqueta} · {getLotLabel(hito.lotId)}
                    </span>
                    <span className="hidden shrink-0 font-mono text-[10px] text-husk sm:block">
                      {formatDate(hito.fecha)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-4">
          <p className="tick-label mb-3">Rendimiento por método</p>
          <div className="space-y-1.5">
            {porTipo.map((t) => (
              <div key={t.tipo} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-cream">{BREEDING_TYPE_LABELS[t.tipo]}</p>
                  <p className="font-mono text-[11px] text-husk">
                    {t.total} lote{t.total !== 1 ? 's' : ''}{t.avg === null ? ' · sin datos' : ''}
                  </p>
                </div>
                <span className={`font-display text-xl font-bold ${t.avg === null ? 'text-husk' : t.avg >= 70 ? 'text-sage' : t.avg >= 40 ? 'text-honey' : 'text-coral'}`}>
                  {t.avg === null ? '—' : `${t.avg}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtro por estado y orden de la lista */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'todas' as const, label: 'Todos', n: activeLots.length },
          ...(alertasCount > 0 ? [{ id: 'alerta' as const, label: 'Con alerta', n: alertasCount }] : []),
          ...estadosPresentes.map(s => ({
            id: s,
            label: BREEDING_STATUS_LABELS[s],
            n: activeLots.filter(l => l.estado === s).length,
          })),
        ].map((chip) => {
          const activo = filtroEstado === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFiltroEstado(chip.id)}
              className={`rounded-full border px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors ${activo ? 'border-honey/60 bg-honey/15 text-honey' : 'border-line text-husk hover:text-cream'}`}
            >
              {chip.label} <span className="opacity-60">{chip.n}</span>
            </button>
          );
        })}
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as typeof orden)}
          className="ml-auto rounded-lg border border-line bg-ink px-3 py-1.5 text-[11px] font-semibold text-cream focus:border-honey/70"
          aria-label="Ordenar lotes"
        >
          <option value="recientes">Más recientes</option>
          <option value="hitos">Próximo hito</option>
          <option value="aceptacion">Mejor aceptación</option>
        </select>
      </div>

      {/* Lista de lotes activos */}
      {activeLots.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">👑</div>
          <p className="text-husk text-lg">No hay lotes de cría activos</p>
          <p className="text-xs text-husk/60 mt-2">Crea tu primer lote con el botón +</p>
        </div>
      ) : visibleLots.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-husk">Ningún lote coincide con el filtro</p>
          <button
            type="button"
            onClick={() => setFiltroEstado('todas')}
            className="mt-3 rounded-xl border border-line px-4 py-2 text-sm text-husk transition-colors hover:bg-ink/50"
          >
            Ver todos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleLots.map((lot, idx) => {
            const daysElapsed = differenceInDays(today, parseISO(lot.fechaInicio));
            const alert = getLotAlert(lot);
            const cicloIdx = STATUS_FLOW.indexOf(lot.estado);
            return (
              <motion.div
                key={lot.id}
                className="card p-4 sm:p-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Toda la zona de datos abre el detalle (como en el
                      historial); los botones de la derecha cortan la
                      propagación justo al lado. */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => openDetail(lot.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest"
                        style={{ color: BREEDING_STATUS_COLORS[lot.estado], background: BREEDING_STATUS_COLORS[lot.estado] + '1c', border: `1px solid ${BREEDING_STATUS_COLORS[lot.estado]}55` }}
                      >
                        {BREEDING_STATUS_LABELS[lot.estado]}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest bg-honey/15 text-honey border border-honey/40">
                        {BREEDING_TYPE_LABELS[lot.tipo]}
                      </span>
                      {alert && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border ${alert.color}`}>
                          {alert.text}
                        </span>
                      )}
                      {!lot.acceptance && daysElapsed >= 3 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openDetail(lot.id); }}
                          title="Registrar la aceptación desde el detalle del lote"
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border bg-orange-400/15 border-orange-400/40 text-orange-400 hover:bg-orange-400/25"
                        >
                          Revisar aceptación
                        </button>
                      )}
                    </div>
                    <p className="font-semibold text-cream text-sm">
                      Donante: {getColonyLabel(lot.coloniaDonante)}
                    </p>
                    <p className="text-xs text-husk mt-0.5">
                      {formatDate(lot.fechaInicio)} · {daysElapsed} días transcurridos · {lot.cantidadPortacupulas} portacúpulas
                    </p>
                    {/* Progreso del ciclo: en qué paso va el lote sin tener
                        que entrar al detalle. */}
                    {cicloIdx >= 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-1">
                          {STATUS_FLOW.map((s, i) => (
                            <span
                              key={s}
                              title={BREEDING_STATUS_LABELS[s]}
                              className={`h-1.5 flex-1 rounded-full ${i <= cicloIdx ? '' : 'bg-line'}`}
                              style={i <= cicloIdx ? { backgroundColor: BREEDING_STATUS_COLORS[lot.estado] } : undefined}
                            />
                          ))}
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-husk">
                          Paso {cicloIdx + 1} de {STATUS_FLOW.length} · {BREEDING_STATUS_LABELS[lot.estado]}
                          {pendingAssign(lot) ? ' · pendiente de asignar reina' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Cambiar estado */}
                    <div className="relative" data-state-menu>
                      <motion.button
                        onClick={() => setOpenStateMenuId(openStateMenuId === lot.id ? null : lot.id)}
                        className="rounded-lg border border-honey/40 bg-honey/10 px-3 py-1.5 text-[11px] font-semibold text-honey hover:bg-honey/20"
                        whileTap={{ scale: 0.95 }}
                      >
                        Cambiar estado ▾
                      </motion.button>
                      {openStateMenuId === lot.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute left-0 top-full mt-1 min-w-full w-max max-w-[min(256px,calc(100vw-2rem))] card p-2 z-40"
                          style={{ maxWidth: 'min(256px, calc(100vw - 2rem))' }}
                        >
                          {STATUS_FLOW
                            .filter(s => s !== lot.estado && s !== 'perdidas')
                            .map(s => (
                              <button
                                key={s}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdate(lot.id, { estado: s });
                                  setOpenStateMenuId(null);
                                }}
                                className="block w-full text-left whitespace-nowrap px-3 py-2 text-sm text-cream hover:bg-pane2 rounded-lg transition-colors"
                              >
                                {BREEDING_STATUS_LABELS[s]}
                              </button>
                            ))}
                        </motion.div>
                      )}
                    </div>
                    {/* Asignar a colmena cuando el lote está aceptado */}
                    {lot.estado === 'aceptadas' && !hasQueenFromLot(lot.id) && (
                      <motion.button
                        onClick={() => {
                          setAssignLotId(lot.id);
                          setAssignHiveId(lot.coloniasReceptoras[0] || '');
                        }}
                        className="rounded-lg border border-sage/40 bg-sage/10 px-3 py-1.5 text-[11px] font-semibold text-sage hover:bg-sage/20"
                        whileTap={{ scale: 0.95 }}
                        title="Asignar reina a colmena"
                      >
                        👑 Asignar a colmena
                      </motion.button>
                    )}
                    {/* Eliminar */}
                    <motion.button
                      onClick={() => setConfirmDeleteLotId(lot.id)}
                      className="rounded-lg border border-coral/30 px-3 py-1.5 text-[11px] font-semibold text-coral hover:bg-coral/10"
                      whileTap={{ scale: 0.95 }}
                      title="Eliminar lote"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </motion.button>
                    {/* Disparador del detalle. Antes era un <svg> suelto sin
                        onClick, dentro de un contenedor con stopPropagation, por
                        que no hacia nada. */}
                    <motion.button
                      type="button"
                      onClick={() => openDetail(lot.id)}
                      className="rounded-lg border border-line p-1.5 text-husk transition-colors hover:border-honey/50 hover:text-cream"
                      whileTap={{ scale: 0.95 }}
                      title="Ver detalle del lote"
                      aria-label={`Ver detalle del lote ${getLotLabel(lot.id)}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Historial */}
      {historyLots.length > 0 && (
        <div>
          <p className="tick-label mb-3 flex items-center gap-2">
            <IconQueen className="h-3 w-3 text-husk" />
            Historial de lotes
          </p>
          <div className="space-y-2">
            {historyLots.map((lot) => {
              const daysElapsed = differenceInDays(today, parseISO(lot.fechaInicio));
              return (
                <div key={lot.id} className="card p-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => openDetail(lot.id)}>
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: BREEDING_STATUS_COLORS[lot.estado] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold text-cream uppercase">{BREEDING_TYPE_LABELS[lot.tipo]}</span>
                        <span className="text-[10px] font-mono text-husk">{getColonyLabel(lot.coloniaDonante)}</span>
                      </div>
                      <p className="text-xs text-husk">
                        {formatDate(lot.fechaInicio)} · {daysElapsed} días · {BREEDING_STATUS_LABELS[lot.estado]}
                        {lot.acceptance ? ` · ${lot.acceptance.percentage}% aceptación` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <motion.button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-honey text-ink shadow-lg hover:bg-honeysoft"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <IconPlus className="h-6 w-6" />
      </motion.button>

      {/* Formulario */}
      <AnimatePresence>
        {showForm && (
          <BreedingForm
            hives={hives}
            nuclei={nuclei}
            onClose={() => setShowForm(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>

      {/* Detalle del lote: SUPERPOSICIÓN.
          Antes se desplegaba inline al final de la lista (accordion-grid) y
          empujaba el contenido hacia abajo. Ahora flota sobre la vista. El
          cierre sale por: la X del propio detalle, el fondo, o la tecla Esc. */}
      <AnimatePresence>
        {selectedLot && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 touch-none"
            onClick={requestClose}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md max-h-[80dvh] md:max-h-[85vh] bg-[#1a140d] rounded-2xl flex flex-col border border-yellow-900/30 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <BreedingDetail
                lot={selectedLot}
                hives={hives}
                nuclei={nuclei}
                breedingLots={breedingLots}
                closing={false}
                onClose={requestClose}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                queens={queens}
                onRequestAssign={(lotId) => {
                  setAssignLotId(lotId);
                  setAssignHiveId(selectedLot.coloniasReceptoras[0] || '');
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asignar reina a colmena desde un lote aceptado */}
      <AnimatePresence>
        {assignLotId && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
            onClick={() => setAssignLotId(null)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">👑</span>
                <div>
                  <h4 className="font-display text-xl font-bold text-cream">¿Asignar a colmena?</h4>
                  <p className="text-xs text-husk mt-0.5">
                    {getLotLabel(assignLotId)} · crear reina vinculada a este lote
                  </p>
                </div>
              </div>

              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Colmena / núcleo destino
              </label>
              <select
                value={assignHiveId}
                onChange={(e) => setAssignHiveId(e.target.value)}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70 mb-5"
              >
                <option value="">Seleccionar destino</option>
                {allColonies.map(colony => (
                  <option key={colony.id} value={colony.id}>
                    {getColonyLabel(colony.id)}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <motion.button
                  onClick={() => assignQueenFromLot(assignLotId, assignHiveId)}
                  disabled={!assignHiveId}
                  className="flex-1 rounded-xl bg-honey py-2.5 text-sm font-semibold text-ink hover:bg-honeysoft disabled:opacity-40 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Asignar reina
                </motion.button>
                <motion.button
                  onClick={() => setAssignLotId(null)}
                  className="flex-1 rounded-xl border border-line py-2.5 text-sm font-medium text-husk hover:bg-ink/50"
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

      {/* Confirmación de eliminación desde la lista */}
      <AnimatePresence>
        {confirmDeleteLotId && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            {/* Backdrop - tapa TODA la pantalla */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 bg-black/80 backdrop-blur-sm touch-none"
              onClick={() => setConfirmDeleteLotId(null)}
            />

            {/* Modal - centrado encima del backdrop */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card relative max-w-sm w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-display text-xl font-bold text-cream mb-2">¿Eliminar lote?</h4>
              <p className="text-sm text-husk mb-5">
                Esta acción no se puede deshacer. Los eventos del calendario asociados también se eliminarán.
              </p>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => {
                    handleDelete(confirmDeleteLotId);
                    setConfirmDeleteLotId(null);
                  }}
                  className="flex-1 rounded-xl bg-coral py-2 text-sm font-semibold text-white hover:bg-coral/90"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Eliminar
                </motion.button>
                <motion.button
                  onClick={() => setConfirmDeleteLotId(null)}
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