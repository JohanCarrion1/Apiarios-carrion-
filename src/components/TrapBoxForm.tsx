// ============================================================
// FORMULARIO NUEVA / EDICIÓN DE CAJA TRAMPA (modal)
// ============================================================

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import { getCurrentPosition } from '../services/geolocation';
import TrapBoxMapModal from './TrapBoxMapModal';
import MapPicker, { type LatLng } from './MapPicker';
import { IconCheck, IconMapPin, IconNote, IconTrap, IconX } from '../ui';
import {
  TRAP_BOX_TYPES,
  TRAP_TYPE_DESCRIPTIONS,
  TRAP_TYPE_LABELS,
  addDaysISO,
  formatTrapCoords,
  parseCoords,
  parseDMS,
  toDMS,
  todayISO,
  type TrapBox,
  type TrapBoxInput,
  type TrapBoxType,
} from '../types/trapBox';

interface Props {
  open: boolean;
  /** Caja a editar (null = nueva). */
  current?: TrapBox | null;
  /** Apiarios del usuario para el selector "¿Dónde queda?". */
  apiaries: { id: string; name: string }[];
  /** Apiario activo (asociación por defecto / para "Nuevo lugar"). */
  apiaryId: string;
  apiaryName?: string;
  onClose: () => void;
  onSave: (input: TrapBoxInput) => Promise<void>;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'error') => void;
}

const labelCls =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-husk';
const inputCls =
  'w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/50 outline-none transition-colors focus:border-honey/70';

const DEFAULT_POS = { lat: -9.52371, lng: -77.55866 };

export default function TrapBoxForm({
  open,
  current,
  apiaries,
  apiaryId,
  apiaryName,
  onClose,
  onSave,
  onShowToast,
}: Props) {
  const [lugarId, setLugarId] = useState(apiaryId);
  const [name, setName] = useState('');
  const [type, setType] = useState<TrapBoxType>('APIS');
  const [coordsText, setCoordsText] = useState('');
  const [dmsText, setDmsText] = useState('');
  const [installedDate, setInstalledDate] = useState(() => todayISO());
  const [nextBaitCheck, setNextBaitCheck] = useState(() => addDaysISO(30));
  const [notes, setNotes] = useState('');
  const [mapPos, setMapPos] = useState(DEFAULT_POS);
  const [mapOpen, setMapOpen] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    if (current) {
      setLugarId(current.apiaryId || apiaryId);
      setName(current.name);
      setType(current.type);
      setCoordsText(formatTrapCoords(current.location.lat, current.location.lng));
      setDmsText(current.location.dms || toDMS(current.location.lat, current.location.lng));
      setInstalledDate(current.installedDate);
      setNextBaitCheck(current.nextBaitCheck);
      setNotes(current.notes || '');
      setMapPos({ lat: current.location.lat, lng: current.location.lng });
    } else {
      setLugarId(apiaryId);
      setName('');
      setType('APIS');
      setCoordsText('');
      setDmsText('');
      setInstalledDate(todayISO());
      setNextBaitCheck(addDaysISO(30));
      setNotes('');
      setMapPos(DEFAULT_POS);
    }
    setError(null);
  }, [open, current, apiaryId]);

  const onLugarChange = (v: string) => {
    setLugarId(v);
    if (v !== '__new__') {
      const a = apiaries.find((x) => x.id === v);
      if (a) setName(a.name);
    }
  };

  const applyCoords = (lat: number, lng: number) => {
    setCoordsText(formatTrapCoords(lat, lng));
    setDmsText(toDMS(lat, lng));
    setMapPos({ lat, lng });
  };

  const onCoordsChange = (v: string) => {
    setCoordsText(v);
    const p = parseCoords(v);
    if (p) {
      setDmsText(toDMS(p.lat, p.lng));
      setMapPos(p);
    }
  };

  const onDmsChange = (v: string) => {
    setDmsText(v);
    const p = parseDMS(v);
    if (p) {
      setCoordsText(formatTrapCoords(p.lat, p.lng));
      setMapPos(p);
    }
  };

  const handleMapPickerSelect = (c: LatLng) => {
    applyCoords(c.lat, c.lng);
  };

  const handleGPS = async () => {
    try {
      setGpsLoading(true);
      const pos = await getCurrentPosition();
      applyCoords(pos.coords.latitude, pos.coords.longitude);
      setShowMapPicker(true);
      onShowToast?.('Coordenadas capturadas.');
    } catch (err) {
      const msg = (err as { message?: string } | undefined)?.message || 'Inténtalo de nuevo.';
      onShowToast?.('No se pudo obtener la ubicación', msg, 'error');
    } finally {
      setGpsLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseCoords(coordsText);
    if (!parsed) {
      setError('Marca la ubicación de la caja trampa (coordenadas, GPS o mapa).');
      return;
    }
    try {
      setSaving(true);
      await onSave({
        apiaryId: lugarId === '__new__' ? apiaryId : lugarId,
        name,
        type,
        location: {
          lat: parsed.lat,
          lng: parsed.lng,
          ...(dmsText.trim() ? { dms: dmsText.trim() } : {}),
        },
        installedDate,
        nextBaitCheck,
        notes,
      });
      onClose();
    } catch (err) {
      setError((err as Error)?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
                    <IconTrap className="h-3 w-3" /> Caja trampa
                  </p>
                  <h3 className="font-display text-2xl font-bold text-cream">
                    {current ? `Editar ${current.id}` : 'Añadir lugar'}
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
                {/* Lugar */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>¿Dónde queda esta caja trampa?</label>
                    <select
                      className={inputCls}
                      value={lugarId}
                      onChange={(e) => onLugarChange(e.target.value)}
                    >
                      <option value="__new__" className="bg-ink text-cream">
                        Nuevo lugar
                      </option>
                      {apiaries.map((a) => (
                        <option key={a.id} value={a.id} className="bg-ink text-cream">
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Nombre del lugar *</label>
                    <input
                      className={inputCls}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Loma del monte"
                    />
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className={labelCls}>Tipo</label>
                  <div className="grid grid-cols-2 gap-3">
                    {TRAP_BOX_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors ${
                          type === t
                            ? 'border-honey bg-honey/15'
                            : 'border-line bg-ink hover:border-honey/40'
                        }`}
                      >
                        <span
                          className={`font-display text-lg font-bold ${
                            type === t ? 'text-honey' : 'text-cream'
                          }`}
                        >
                          {TRAP_TYPE_LABELS[t]}
                        </span>
                        <span className="text-[11px] text-husk">{TRAP_TYPE_DESCRIPTIONS[t]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ubicación */}
                <div>
                  <label className={labelCls}>Ubicación (coordenadas)</label>
                  <input
                    className={inputCls}
                    value={coordsText}
                    onChange={(e) => onCoordsChange(e.target.value)}
                    placeholder="-12.0464, -77.0428"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGPS}
                      disabled={gpsLoading}
                      className="flex items-center gap-2 rounded-xl border border-honey/40 bg-honey/10 px-3.5 py-2 text-xs font-bold text-honey transition-colors hover:bg-honey/20 disabled:opacity-60"
                    >
                      <IconMapPin className="h-3.5 w-3.5" />
                      {gpsLoading ? 'Capturando…' : 'GPS'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMapPicker((v) => !v);
                        setMapOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-line bg-ink px-3.5 py-2 text-xs font-bold text-husk transition-colors hover:border-honey/50 hover:text-honey"
                    >
                      <IconMapPin className="h-3.5 w-3.5" /> Marcar en el mapa
                    </button>
                  </div>

                  {showMapPicker && (
                    <MapPicker
                      className="mt-3"
                      coordinates={mapPos}
                      onLocationSelect={handleMapPickerSelect}
                      helpText="Arrastra el marcador o toca el mapa para afinar la ubicación."
                    />
                  )}

                  <input
                    className={`${inputCls} mt-2`}
                    value={dmsText}
                    onChange={(e) => onDmsChange(e.target.value)}
                    placeholder={`12°02'47.0"S 77°02'34.1"W`}
                  />
                  <p className="mt-1.5 text-xs text-husk">
                    El campo DMS es opcional: al escribir coordenadas decimales se completa solo.
                  </p>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Fecha de instalación</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={installedDate}
                      onChange={(e) => setInstalledDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Próxima revisión del atrayente</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={nextBaitCheck}
                      onChange={(e) => setNextBaitCheck(e.target.value)}
                    />
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className={labelCls}>
                    <span className="flex items-center gap-1">
                      <IconNote className="h-3 w-3" /> Notas / observaciones
                    </span>
                  </label>
                  <textarea
                    className={`${inputCls} min-h-[72px] resize-y`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Accesos, vegetación, referencia del punto…"
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
                        <IconCheck className="h-4 w-4" />
                        {current ? 'Guardar cambios' : 'Guardar'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TrapBoxMapModal
        open={mapOpen}
        lat={mapPos.lat}
        lng={mapPos.lng}
        onClose={() => setMapOpen(false)}
        onConfirm={(lat, lng) => applyCoords(lat, lng)}
      />
    </>
  );
}
