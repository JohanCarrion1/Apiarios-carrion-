// ============================================================
// SECCIÓN DE CAJAS TRAMPA (lista + CRUD + renovación + capturas)
// ============================================================
// Componente autónomo: recibe `userId` y el apiario activo, gestiona sus
// propios modales (formulario, captura y mapa) y usa el listener en tiempo real
// de `trapBoxService`. La promoción a núcleo se delega en el dashboard mediante
// el callback opcional `onPromoteToNucleus`.

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCoordinates } from '../services/geolocation';
import {
  addTrapBox,
  deleteTrapBox,
  renewTrapBait,
  updateTrapBox,
  useTrapBoxes,
} from '../lib/trapBoxService';
import { SectionHead, IconPlus, IconMapPin, IconTrap, IconEdit, IconTrash, IconRefresh } from '../ui';
import TrapBoxForm from './TrapBoxForm';
import TrapBoxCaptureModal from './TrapBoxCaptureModal';
import {
  TRAP_STATUS_LABELS,
  addDaysISO,
  effectiveTrapStatus,
  isBaitExpired,
  type TrapBox,
  type TrapBoxInput,
  type TrapBoxType,
  type TrapCapture,
} from '../types/trapBox';

interface Props {
  userId: string;
  apiaryId: string;
  apiaryName?: string;
  apiaries?: { id: string; name: string }[];
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'error') => void;
  /** Crea un núcleo a partir de la captura y devuelve su código (o null). */
  onPromoteToNucleus?: (box: TrapBox, capture: TrapCapture) => string | null | undefined;
}

type Filtro = 'todas' | TrapBoxType;

const STATUS_CLASS: Record<string, string> = {
  available: 'bg-sage/20 text-sage',
  occupied: 'bg-honey/20 text-honey',
  bait_expired: 'bg-coral/20 text-coral',
};

const STATUS_DOT: Record<string, string> = {
  available: '#93cc68',
  occupied: '#ffa90a',
  bait_expired: '#f4552b',
};

export default function CajasTrampaSection({
  userId,
  apiaryId,
  apiaryName,
  apiaries = [],
  onShowToast,
  onPromoteToNucleus,
}: Props) {
  const { trapBoxes, loading, error } = useTrapBoxes(userId, apiaryId);

  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [formOpen, setFormOpen] = useState(false);
  const [current, setCurrent] = useState<TrapBox | null>(null);
  const [captureBox, setCaptureBox] = useState<TrapBox | null>(null);

  const toast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
    onShowToast?.(title, desc, type);
  };

  const opcionesApiario = useMemo(() => {
    const list = [...apiaries];
    if (apiaryId && !list.some((a) => a.id === apiaryId)) {
      list.unshift({ id: apiaryId, name: apiaryName || 'Apiario actual' });
    }
    return list;
  }, [apiaries, apiaryId, apiaryName]);

  const filtradas = useMemo(
    () => trapBoxes.filter((b) => filtro === 'todas' || b.type === filtro),
    [trapBoxes, filtro]
  );

  const counts = useMemo(
    () => ({
      todas: trapBoxes.length,
      APIS: trapBoxes.filter((b) => b.type === 'APIS').length,
      MELI: trapBoxes.filter((b) => b.type === 'MELI').length,
    }),
    [trapBoxes]
  );

  const vencidas = trapBoxes.filter((b) => isBaitExpired(b)).length;

  const guardar = async (input: TrapBoxInput) => {
    if (!userId) throw new Error('No se pudo determinar el usuario de la sesión.');
    if (current) {
      await updateTrapBox(current.id, {
        apiaryId: input.apiaryId,
        name: input.name.trim(),
        type: input.type,
        location: input.location,
        installedDate: input.installedDate,
        nextBaitCheck: input.nextBaitCheck,
        notes: input.notes.trim(),
      });
      toast('Caja trampa actualizada.');
    } else {
      await addTrapBox(userId, input);
      toast('Caja trampa registrada.');
    }
  };

  const eliminar = async (box: TrapBox) => {
    if (!window.confirm(`¿Eliminar la caja trampa "${box.name}"?`)) return;
    try {
      await deleteTrapBox(box.id);
      toast('Caja trampa eliminada.');
    } catch (err) {
      toast('No se pudo eliminar', (err as Error)?.message || String(err), 'error');
    }
  };

  const renovar = async (box: TrapBox) => {
    try {
      await renewTrapBait(box.id);
      toast('Atrayente renovado.', `Próxima revisión: ${addDaysISO(30)}`);
    } catch (err) {
      toast('No se pudo renovar', (err as Error)?.message || String(err), 'error');
    }
  };

  const registrarCaptura = async (capture: TrapCapture, promote: boolean) => {
    if (!captureBox) return;
    const nueva: TrapCapture = { ...capture };
    if (promote && onPromoteToNucleus) {
      const code = onPromoteToNucleus(captureBox, capture);
      if (code) nueva.promotedToNucleus = code;
    }
    await updateTrapBox(captureBox.id, {
      captures: [...(captureBox.captures || []), nueva],
      status: 'available',
    });
    toast('Captura registrada.', `${captureBox.name} · caja disponible`);
  };

  return (
    <div>
      <SectionHead
        kicker="Captura de enjambres en el monte"
        title="Cajas Trampa"
        right={
          <span className="flex items-center gap-2 text-husk">
            <IconTrap className="h-5 w-5 text-honey" />
            <span className="font-mono text-xs">
              {counts.todas} {counts.todas === 1 ? 'caja' : 'cajas'}
            </span>
          </span>
        }
      />

      <p className="-mt-4 mb-6 max-w-2xl text-sm text-husk">
        Marca cajas trampa repartidas en el monte, controla la renovación del atrayente y la
        captura de enjambres.
      </p>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(['todas', 'APIS', 'MELI'] as Filtro[]).map((f) => {
          const activo = filtro === f;
          return (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                activo
                  ? 'border-honey bg-honey text-ink'
                  : 'border-line bg-ink text-husk hover:border-honey/50 hover:text-honey'
              }`}
            >
              {f === 'todas' ? 'Todas' : f}
              <span className={`ml-1.5 ${activo ? 'text-ink/70' : 'text-husk/60'}`}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Aviso de atrayentes vencidos */}
      {vencidas > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
          <IconRefresh className="h-4 w-4" />
          {vencidas} {vencidas === 1 ? 'caja tiene' : 'cajas tienen'} el atrayente vencido.
        </div>
      )}

      {/* Botón principal */}
      <button
        onClick={() => {
          setCurrent(null);
          setFormOpen(true);
        }}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-honey px-5 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-honey/90"
      >
        <IconPlus className="h-4 w-4" /> Añadir lugar
      </button>

      {/* Lista */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-honey/30 border-t-honey" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-coral/40 bg-coral/10 p-8 text-center">
          <p className="mb-1 text-coral">No se pudieron cargar las cajas trampa.</p>
          <p className="whitespace-pre-wrap break-words font-mono text-xs text-husk">{error}</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-ink p-10 text-center">
          <IconMapPin className="mx-auto mb-3 h-10 w-10 text-husk/40" />
          <p className="font-display text-lg font-semibold text-husk">
            {trapBoxes.length === 0 ? 'Sin lugares registrados' : 'Sin cajas para este filtro'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-husk/70">
            {trapBoxes.length === 0
              ? 'Empieza añadiendo un lugar — puede ser un apiario existente o un punto nuevo en el monte.'
              : 'Prueba cambiando el tipo de caja (APIS / MELI).'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {filtradas.map((box) => {
              const status = effectiveTrapStatus(box);
              const vencido = isBaitExpired(box);
              return (
                <motion.div
                  key={box.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-line bg-pane p-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                        box.type === 'MELI'
                          ? 'border-flower/40 bg-flower/15 text-flower'
                          : 'border-honey/40 bg-honey/15 text-honey'
                      }`}
                    >
                      <IconTrap className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-husk">
                          {box.id}
                        </span>
                        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-husk">
                          {box.type}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            STATUS_CLASS[status]
                          }`}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: STATUS_DOT[status] }}
                          />
                          {TRAP_STATUS_LABELS[status]}
                        </span>
                      </div>

                      <p className="mt-1 truncate font-display text-lg font-bold text-cream">
                        {box.name}
                      </p>
                      <p className="flex items-center gap-1.5 truncate font-mono text-xs text-husk">
                        <IconMapPin className="h-3 w-3 shrink-0" />
                        {formatCoordinates(box.location.lat, box.location.lng)}
                      </p>
                      {box.location.dms && (
                        <p className="truncate font-mono text-[11px] text-husk/70">
                          {box.location.dms}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-husk">
                        <span>
                          Atrayente:{' '}
                          <b className={vencido ? 'text-coral' : 'text-cream'}>
                            {box.nextBaitCheck || '—'}
                          </b>
                        </span>
                        <span>Última revisión: {box.lastBaitCheck || '—'}</span>
                        {box.captures?.length > 0 && (
                          <span className="text-honey">
                            {box.captures.length} captura{box.captures.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => {
                          setCurrent(box);
                          setFormOpen(true);
                        }}
                        title="Editar"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(box)}
                        title="Eliminar"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink text-husk transition-colors hover:border-coral/60 hover:text-coral"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    <button
                      onClick={() => renovar(box)}
                      className="flex items-center gap-1.5 rounded-lg border border-honey/40 bg-honey/10 px-3 py-2 text-xs font-bold text-honey transition-colors hover:bg-honey/20"
                    >
                      <IconRefresh className="h-3.5 w-3.5" /> Renovar atrayente
                    </button>
                    <button
                      onClick={() => setCaptureBox(box)}
                      className="flex items-center gap-1.5 rounded-lg border border-line bg-ink px-3 py-2 text-xs font-bold text-husk transition-colors hover:border-honey/50 hover:text-honey"
                    >
                      <IconPlus className="h-3.5 w-3.5" /> Registrar enjambre
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modales */}
      <TrapBoxForm
        open={formOpen}
        current={current}
        apiaries={opcionesApiario}
        apiaryId={apiaryId}
        apiaryName={apiaryName}
        onClose={() => {
          setFormOpen(false);
          setCurrent(null);
        }}
        onSave={guardar}
        onShowToast={onShowToast}
      />
      <TrapBoxCaptureModal
        open={!!captureBox}
        box={captureBox}
        onClose={() => setCaptureBox(null)}
        onSubmit={registrarCaptura}
      />
    </div>
  );
}
