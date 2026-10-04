// ============================================================
// FORMULARIO NUEVO / EDICIÓN DE CONTRATO DE POLINIZACIÓN (modal)
// ============================================================

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import {
  IconCalendar,
  IconCheck,
  IconFlower,
  IconNote,
  IconPackage,
  IconX,
} from '../ui';
import type { Hive } from '../types/hive';
import type {
  ContratoPolinizacion,
  PolinizacionEstado,
  PolinizacionInput,
} from '../types/polinizacion';
import {
  CULTIVOS_POLINIZACION,
  POLINIZACION_ESTADOS,
  POLINIZACION_ESTADO_LABELS,
  polinizacionTotal,
  formatSolesPolinizacion,
} from '../types/polinizacion';

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  /** Contrato a editar (null = nuevo). */
  current?: ContratoPolinizacion | null;
  hives: Hive[];
  /** Códigos de colmena ocupados por otros contratos activos. */
  hivesOcupadas: string[];
  /** Solo colmenas del campo actual (para excluirlas de la ocupadas). */
  onClose: () => void;
  onSave: (input: PolinizacionInput) => Promise<void>;
}

const labelCls =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-husk';
const inputCls =
  'w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/50 outline-none transition-colors focus:border-honey/70';

export default function PolinizacionForm({
  open,
  current,
  hives,
  hivesOcupadas,
  onClose,
  onSave,
}: Props) {
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [cultivo, setCultivo] = useState<string>(CULTIVOS_POLINIZACION[0]);
  const [cantidad, setCantidad] = useState('1');
  const [precio, setPrecio] = useState('0');
  const [fechaInicio, setFechaInicio] = useState(() => isoInDays(7));
  const [fechaFin, setFechaFin] = useState(() => isoInDays(60));
  const [ubicacion, setUbicacion] = useState('');
  const [estado, setEstado] = useState<PolinizacionEstado>('pendiente');
  const [notas, setNotas] = useState('');
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    if (current) {
      setClienteNombre(current.cliente.nombre);
      setClienteTelefono(current.cliente.telefono);
      setCultivo(current.cultivo);
      setCantidad(String(current.cantidadColmenas));
      setPrecio(String(current.precioPorColmena));
      setFechaInicio(current.fechaInicio);
      setFechaFin(current.fechaFin);
      setUbicacion(current.ubicacion);
      setEstado(current.estado);
      setNotas(current.notas);
      setSeleccion(current.colmenasAsignadas);
    } else {
      setClienteNombre('');
      setClienteTelefono('');
      setCultivo(CULTIVOS_POLINIZACION[0]);
      setCantidad('1');
      setPrecio('0');
      setFechaInicio(isoInDays(7));
      setFechaFin(isoInDays(60));
      setUbicacion('');
      setEstado('pendiente');
      setNotas('');
      setSeleccion([]);
    }
    setError(null);
  }, [open, current]);

  const nCantidad = Number(cantidad) || 0;
  const nPrecio = Number(precio) || 0;
  const total = polinizacionTotal(nCantidad, nPrecio);

  const toggleHive = (code: string) => {
    setSeleccion((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSaving(true);
      await onSave({
        clienteNombre,
        clienteTelefono,
        cultivo,
        cantidadColmenas: nCantidad,
        colmenasAsignadas: seleccion,
        fechaInicio,
        fechaFin,
        ubicacion,
        precioPorColmena: nPrecio,
        estado,
        notas,
      });
      onClose();
    } catch (err) {
      setError((err as Error)?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-pane p-6 sm:rounded-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-husk">
                  <IconFlower className="h-3 w-3" /> Contrato de polinización
                </p>
                <h3 className="font-display text-2xl font-bold text-cream">
                  {current ? `Editar ${current.id}` : 'Nuevo contrato'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-ink text-husk transition-colors hover:border-honey/60 hover:text-honey"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Cliente */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Nombre del cliente *</label>
                  <input
                    className={inputCls}
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Ej. Fondo Mi Tierra S.A.C."
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfono / WhatsApp</label>
                  <input
                    className={inputCls}
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="+51 9xx xxx xxx"
                  />
                </div>
              </div>

              {/* Cultivo + cantidad + precio */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Cultivo *</label>
                  <select
                    className={inputCls}
                    value={cultivo}
                    onChange={(e) => setCultivo(e.target.value)}
                  >
                    {CULTIVOS_POLINIZACION.map((c) => (
                      <option key={c} value={c} className="bg-ink text-cream">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Cantidad de colmenas *</label>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Precio por colmena (S/)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputCls}
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Fecha de inicio *</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Fecha de fin *</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </div>

              {/* Ubicación + estado */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Ubicación del predio</label>
                  <input
                    className={inputCls}
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Departamento, provincia, distrito"
                  />
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <select
                    className={inputCls}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as PolinizacionEstado)}
                  >
                    {POLINIZACION_ESTADOS.map((s) => (
                      <option key={s} value={s} className="bg-ink text-cream">
                        {POLINIZACION_ESTADO_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selección de colmenas */}
              <div>
                <label className={labelCls}>
                  Colmenas asignadas
                  <span className="ml-1 normal-case text-husk/60">
                    ({seleccion.length} seleccionadas)
                  </span>
                </label>
                <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-line bg-ink p-3">
                  {hives.length === 0 ? (
                    <p className="text-sm text-husk">No hay colmenas registradas.</p>
                  ) : (
                    hives.map((h) => {
                      const ocupada = hivesOcupadas.includes(h.code);
                      const activa = seleccion.includes(h.code);
                      return (
                        <button
                          key={h.code}
                          type="button"
                          disabled={ocupada}
                          onClick={() => toggleHive(h.code)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            activa
                              ? 'border-honey bg-honey text-ink'
                              : ocupada
                                ? 'cursor-not-allowed border-line bg-ink text-husk/40 line-through'
                                : 'border-line bg-ink text-husk hover:border-honey/40 hover:text-honey'
                          }`}
                          title={ocupada ? 'Ya está en otro contrato activo' : `${h.name} (${h.code})`}
                        >
                          {activa ? (
                            <IconCheck className="h-3 w-3" />
                          ) : (
                            <IconFlower className="h-3 w-3" />
                          )}
                          {h.name || h.code}
                        </button>
                      );
                    })
                  )}
                </div>
                <p className="mt-1.5 text-xs text-husk">
                  Las colmenas ya comprometidas en un contrato activo están bloqueadas.
                </p>
              </div>

              {/* Total resultante */}
              <div className="flex items-center justify-between rounded-xl border border-honey/30 bg-honey/10 px-4 py-3">
                <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-honey">
                  <IconPackage className="h-4 w-4" /> Total estimado
                </span>
                <span className="font-display text-xl font-bold text-honey">
                  {formatSolesPolinizacion(total)}
                </span>
              </div>

              {/* Notas */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1">
                    <IconNote className="h-3 w-3" /> Notas
                  </span>
                </label>
                <textarea
                  className={`${inputCls} min-h-[72px] resize-y`}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones del contrato…"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-line bg-ink px-5 py-2.5 text-sm font-semibold text-husk transition-colors hover:text-cream"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-honey px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-honey/90 disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink" />
                  ) : (
                    <>
                      <IconCalendar className="h-4 w-4" />
                      {current ? 'Guardar cambios' : 'Crear contrato'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
