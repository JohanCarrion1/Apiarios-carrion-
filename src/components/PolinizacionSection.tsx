// ============================================================
// SECCIÓN DE POLINIZACIÓN (lista de contratos + CRUD + modales)
// ============================================================
// Componente autónomo: recibe `userId`, las colmenas del apiario actual
// (para nombres + bloqueo por ocupación) y un callback de toast.
// Gestiona sus propios modales (form / detalle) y usa el servicio
// polinizacionService (listener en tiempo real + CRUD + estado).

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Hive } from '../types/hive';
import type {
  ContratoPolinizacion,
  PolinizacionEstado,
  PolinizacionInput,
} from '../types/polinizacion';
import {
  POLINIZACION_ESTADOS,
  POLINIZACION_ESTADO_LABELS,
  formatSolesPolinizacion,
} from '../types/polinizacion';
import {
  usePolinizacion,
  savePolinizacion,
  deletePolinizacion,
  updatePolinizacionEstado,
} from '../lib/polinizacionService';
import { SectionHead, IconPlus, IconSearch, IconFlower } from '../ui';
import PolinizacionForm from './PolinizacionForm';
import PolinizacionDetail from './PolinizacionDetail';

interface Props {
  userId?: string;
  hives?: Hive[];
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'error') => void;
}

export default function PolinizacionSection({ userId, hives = [], onShowToast }: Props) {
  const { contratos, loading, error } = usePolinizacion(userId);

  const [filtro, setFiltro] = useState<PolinizacionEstado | 'todas'>('todas');
  const [query, setQuery] = useState('');

  // Modales.
  const [formOpen, setFormOpen] = useState(false);
  const [current, setCurrent] = useState<ContratoPolinizacion | null>(null);
  const [detalle, setDetalle] = useState<ContratoPolinizacion | null>(null);

  const toast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
    onShowToast?.(title, desc, type);
  };

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...contratos]
      .sort((a, b) => (a.id < b.id ? 1 : -1))
      .filter((c) => {
        if (filtro !== 'todas' && c.estado !== filtro) return false;
        if (!q) return true;
        const hay = `${c.cliente?.nombre || ''} ${c.cultivo || ''} ${c.ubicacion || ''}`.toLowerCase();
        return hay.includes(q);
      });
  }, [contratos, filtro, query]);

  const cantidadActivas = contratos.filter((c) => c.estado === 'activo').length;
  const colmenasEnPolinizacion = new Set(
    contratos.filter((c) => c.estado === 'activo').flatMap((c) => c.colmenasAsignadas || [])
  ).size;

  const guardar = async (input: PolinizacionInput, id?: string) => {
    if (!userId) throw new Error('No se pudo determinar el usuario de la sesión.');
    await savePolinizacion(userId, input, id);
    toast(id ? 'Contrato actualizado' : 'Contrato creado', id ? undefined : `Nuevo contrato de polinización creado.`);
  };

  const eliminar = async (id: string) => {
    await deletePolinizacion(id);
    toast('Contrato eliminado');
    setDetalle(null);
  };

  const cambioEstado = (id: string, estado: PolinizacionEstado) => {
    updatePolinizacionEstado(id, estado).then(() => {
      toast('Estado actualizado');
      setDetalle((d) => (d ? { ...d, estado } : d));
    });
  };

  return (
    <div>
      <SectionHead
        kicker="Alquiler de colmenas para cultivos"
        title="Contratos de Polinización"
        right={
          <button
            onClick={() => {
              setCurrent(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honey/90"
          >
            <IconPlus className="h-4 w-4" /> Nuevo contrato
          </button>
        }
      />

      {/* Barra de búsqueda + estados */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-husk" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, cultivo, ubicación…"
            className="w-full rounded-xl border border-line bg-ink px-10 py-3 text-sm text-cream placeholder:text-husk/50 outline-none transition-colors focus:border-honey/70"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['todas' as const, ...POLINIZACION_ESTADOS].map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filtro === s
                  ? 'border-honey bg-honey text-ink'
                  : 'border-line bg-ink text-husk hover:border-honey/50 hover:text-honey'
              }`}
            >
              {s === 'todas' ? 'Todas' : POLINIZACION_ESTADO_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen rápido */}
      {cantidadActivas > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-flower/30 bg-flower/10 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-flower">
            <IconFlower className="h-4 w-4" /> {cantidadActivas} contratos activos
          </span>
          <span className="text-sm text-husk">
            {colmenasEnPolinizacion} colmenas en polinización
          </span>
        </div>
      )}

      {/* Lista de contratos */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-honey/30 border-t-honey" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-coral/40 bg-coral/10 p-8 text-center">
          <p className="mb-1 text-coral">No se pudieron cargar los contratos.</p>
          <p className="whitespace-pre-wrap break-words font-mono text-xs text-husk">{error}</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-ink p-10 text-center">
          <IconFlower className="mx-auto mb-3 h-10 w-10 text-husk/40" />
          <p className="font-display text-lg font-semibold text-husk">
            {contratos.length === 0 ? 'Aún no hay contratos de polinización' : 'Sin resultados para el filtro'}
          </p>
          <p className="mt-1 text-sm text-husk/70">
            {contratos.length === 0
              ? 'Crea tu primer contrato de alquiler de colmenas para cultivos como palto, arándano o manzana.'
              : 'Prueba con otra búsqueda o cambia el estado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {filtrados.map((c) => (
              <motion.button
                key={c.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onClick={() => setDetalle(c)}
                className="flex w-full items-center gap-4 rounded-2xl border border-line bg-pane p-4 text-left transition-colors hover:border-honey/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-flower/40 bg-flower/15 text-flower">
                  <IconFlower className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-husk">{c.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        c.estado === 'activo'
                          ? 'bg-flower/20 text-flower'
                          : c.estado === 'pendiente'
                            ? 'bg-honey/20 text-honey'
                            : c.estado === 'completado'
                              ? 'bg-sage/20 text-sage'
                              : 'bg-coral/20 text-coral'
                      }`}
                    >
                      {POLINIZACION_ESTADO_LABELS[c.estado]}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-display text-lg font-bold text-cream">
                    {c.cliente?.nombre || 'Sin cliente'}
                  </p>
                  <p className="truncate text-xs text-husk">
                    {c.cultivo} · {c.cantidadColmenas} colmenas · {c.fechaInicio} → {c.fechaFin}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-display text-lg font-bold text-honey">
                    {formatSolesPolinizacion(c.total)}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-husk">Polinización</span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modales */}
      <PolinizacionForm
        open={formOpen}
        current={current}
        hives={hives}
        hivesOcupadas={
          contratos
            .filter((c) => c.estado === 'activo' && c.id !== current?.id)
            .flatMap((c) => c.colmenasAsignadas || []) || []
        }
        onClose={() => {
          setFormOpen(false);
          setCurrent(null);
        }}
        onSave={async (input) => {
          // El listado se refresca solo por onSnapshot, asi que aqui solo hace
          // falta cerrar el modal. Si la escritura falla se avisa y se mantiene
          // abierto para no perder lo que el usuario escribio.
          try {
            await guardar(input, current?.id);
            setFormOpen(false);
            setCurrent(null);
          } catch (error) {
            console.error('[POLINIZACION] Error al guardar:', error);
            toast('No se pudo guardar', (error as Error)?.message || String(error), 'error');
          }
        }}
      />
      <PolinizacionDetail
        open={!!detalle}
        contrato={detalle}
        hives={hives}
        onClose={() => setDetalle(null)}
        onEdit={(c) => {
          setDetalle(null);
          setCurrent(c);
          setFormOpen(true);
        }}
        onDelete={eliminar}
        onEstado={cambioEstado}
      />
    </div>
  );
}
