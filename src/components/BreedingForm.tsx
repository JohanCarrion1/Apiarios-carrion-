import { useState } from 'react';
import { motion } from 'framer-motion';
import { backdropVariants, modalVariants } from '../lib/motion';
import { addDays, format, parseISO } from 'date-fns';
import type { Hive } from '../types/hive';
import type { BreedingLot, BreedingType, WithdrawalMethod } from '../types/breeding';
import { IconPlus, IconX } from '../ui';
import PhotoUploader from './PhotoUploader';
import type { PhotoData } from '../services/photos';
import { useScrollLock } from '../hooks/useScrollLock';

interface BreedingFormProps {
  hives: Hive[];
  nuclei: Hive[];
  onClose: () => void;
  onCreate: (lot: Omit<BreedingLot, 'id' | 'fechaCreacion' | 'estado' | 'estadoHistorial'>) => void;
}

const toDateStr = (date: Date) => format(date, 'yyyy-MM-dd');

export default function BreedingForm({ hives, nuclei, onClose, onCreate }: BreedingFormProps) {
  const allColonies = [...hives, ...nuclei];
  const [tipo, setTipo] = useState<BreedingType>('Traslarve');
  const [coloniaDonante, setColoniaDonante] = useState<string>('');
  const [coloniasReceptoras, setColoniasReceptoras] = useState<string[]>([]);
  // Arranca vacio a proposito: el 20 solo aparece en el placeholder y se
  // aplica como fallback al guardar. `''` es el unico valor no numerico
  // posible, asi que el input queda de verdad en blanco, sin el '0' forzado
  // que aparecia con un number puro al re-renderizar.
  const [cantidadPortacupulas, setCantidadPortacupulas] = useState<number | ''>('');
  const [fechaInicio, setFechaInicio] = useState<string>(toDateStr(new Date()));
  const [fechaEnjauladoEstimada, setFechaEnjauladoEstimada] = useState<string>(toDateStr(addDays(new Date(), 10)));
  const [metodoRetiro, setMetodoRetiro] = useState<WithdrawalMethod>('enjaular');
  const [notas, setNotas] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useScrollLock(true);

  const getColonyLabel = (id: string) => {
    const colony = allColonies.find(c => c.id === id);
    if (!colony) return '—';
    return `${colony.code}${colony.name ? ` · ${colony.name}` : ''}`;
  };

  const changeTipo = (nextTipo: BreedingType) => {
    setTipo(nextTipo);
    if (nextTipo === 'Traslarve') {
      setFechaEnjauladoEstimada(toDateStr(addDays(parseISO(fechaInicio), 10)));
    }
  };

  const changeFechaInicio = (value: string) => {
    setFechaInicio(value);
    if (!value) return;
    if (tipo === 'Traslarve') {
      setFechaEnjauladoEstimada(toDateStr(addDays(parseISO(value), 10)));
    }
  };

  const toggleReceptora = (id: string) => {
    setColoniasReceptoras(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length >= 5) {
        setErrors(['Máximo 5 colonias receptoras']);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmit = () => {
    // Fallback de guardado: si la caja quedo vacia se crea el lote con 20,
    // el valor recomendado. El placeholder y el texto de ayuda lo comunican.
    const cantidad = cantidadPortacupulas === '' ? 20 : cantidadPortacupulas;

    const errs: string[] = [];
    if (!coloniaDonante) errs.push('Selecciona una colonia donante');
    if (coloniasReceptoras.length < 1) errs.push('Selecciona al menos 1 colonia receptora');
    if (coloniasReceptoras.includes(coloniaDonante)) errs.push('La colonia donante no puede ser también receptora');
    if (cantidad < 10 || cantidad > 40) errs.push('Portacúpulas debe estar entre 10 y 40');
    if (!fechaInicio) errs.push('Ingresa la fecha de inicio');
    if (!fechaEnjauladoEstimada) errs.push('Ingresa la fecha estimada de enjaulado');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const fechaNacimientoEstimada = toDateStr(addDays(parseISO(fechaInicio), 13));

    onCreate({
      tipo,
      coloniaDonante,
      coloniasReceptoras,
      fechaInicio,
      cantidadPortacupulas: cantidad,
      fechaEnjauladoEstimada,
      fechaNacimientoEstimada,
      metodoRetiro,
      notas,
      fotos: photos,
    });
  };

  const inputCls = "w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream focus:border-honey/70";

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 touch-none"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative w-full max-w-md flex flex-col bg-[#1a140d] rounded-2xl shadow-2xl overflow-hidden max-h-[80dvh] md:max-h-[85vh] touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera fija: `flex-none` impide que la flexbox la aplaste y el
            `border-b` la separa del formulario. */}
        <div className="flex-none p-5 border-b border-yellow-900/30 flex justify-between items-center bg-[#1a140d]">
          <h3 className="font-display text-2xl font-bold text-cream">Nuevo Lote de Cría</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center">
            <IconX className="w-5 h-5 text-cream" />
          </button>
        </div>

        {/* Cuerpo scrolleable. El `min-h-0` es imprescindible: sin el, este
            hijo flex no baja de su altura de contenido y el `overflow-y-auto`
            se ignora, estirando la tarjeta mas alla de su max-h.
            `touch-auto` rehabilita el gesto de scroll dentro del backdrop
            `touch-none`. */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 touch-auto">

        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-lg border border-coral/50 bg-coral/10">
            {errors.map((error, idx) => (
              <p key={idx} className="text-sm text-coral">{error}</p>
            ))}
          </div>
        )}

        <div className="space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Tipo de reproducción</label>
            <div className="flex gap-2">
              {(['Traslarve', 'Nicot'] as BreedingType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => changeTipo(t)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors ${
                    tipo === t ? 'border-honey bg-honey/10 text-honey' : 'border-line text-husk hover:text-cream'
                  }`}
                >
                  {t === 'Traslarve' ? '🐝 Traslarve' : '🐝 Nicot'}
                </button>
              ))}
            </div>
          </div>

          {/* Colonia donante */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Colonia donante</label>
            <select
              value={coloniaDonante}
              onChange={(e) => setColoniaDonante(e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar colonia donante</option>
              {allColonies.map(colony => (
                <option key={colony.id} value={colony.id}>
                  {getColonyLabel(colony.id)}
                </option>
              ))}
            </select>
          </div>

          {/* Colonias receptoras */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Colonias receptoras ({coloniasReceptoras.length}/5)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {allColonies.map(colony => (
                <button
                  key={colony.id}
                  type="button"
                  onClick={() => toggleReceptora(colony.id)}
                  disabled={colony.id === coloniaDonante}
                  className={`rounded-xl border px-3 py-2 text-sm text-left transition-all ${
                    coloniasReceptoras.includes(colony.id)
                      ? 'border-honey bg-honey/10 text-honey'
                      : colony.id === coloniaDonante
                      ? 'border-line opacity-40 text-husk cursor-not-allowed'
                      : 'border-line text-husk hover:text-cream hover:border-honey/40'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                      coloniasReceptoras.includes(colony.id) ? 'border-honey bg-honey text-ink' : 'border-line'
                    }`}>
                      {coloniasReceptoras.includes(colony.id) && (
                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {colony.code}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Portacúpulas */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              ¿Cuántos portacúpulas tiene el bastidor?
            </label>
            <input
              type="number"
              min={10}
              max={40}
              value={cantidadPortacupulas}
              placeholder="20"
              onChange={(e) => {
                const raw = e.target.value;
                // Vacio: se respeta el '', sin forzar un 0.
                if (raw === '') {
                  setCantidadPortacupulas('');
                  return;
                }
                // Number() normaliza y elimina los ceros a la izquierda:
                // '020' -> 20. Con type="number" el navegador ya entrega una
                // cadena numerica valida o '', pero el guard de NaN impide que
                // un 'NaN' llegue a renderizarse dentro del input.
                const n = Number(raw);
                setCantidadPortacupulas(Number.isNaN(n) ? '' : n);
              }}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-husk">Mínimo 10 · Máximo 40 · Recomendado 20</p>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Fecha de inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => changeFechaInicio(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
                Fecha estimada de enjaulado
                {tipo === 'Traslarve' && <span className="ml-1 text-honey">(D+10)</span>}
              </label>
              <input
                type="date"
                value={fechaEnjauladoEstimada}
                onChange={(e) => setFechaEnjauladoEstimada(e.target.value)}
                disabled={tipo === 'Traslarve'}
                className={`${inputCls} ${tipo === 'Traslarve' ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {tipo === 'Traslarve' && (
                <p className="mt-1 text-[11px] text-husk">Calculada automáticamente (+10 días)</p>
              )}
              {tipo === 'Nicot' && (
                <p className="mt-1 text-[11px] text-husk">Configurable para Nicot</p>
              )}
            </div>
          </div>

          {/* Método de retiro */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Método de retiro</label>
            <div className="flex gap-2">
              {([['enjaular', 'Enjaular'], ['realeras', 'Retirar en realeras']] as [WithdrawalMethod, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMetodoRetiro(value)}
                  className={`flex-1 rounded-xl border py-2 text-sm transition-colors ${
                    metodoRetiro === value ? 'border-honey bg-honey/10 text-honey' : 'border-line text-husk hover:text-cream'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Notas <span className="normal-case text-husk/60">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones sobre el lote..."
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Fotos del lote */}
          <div className="border-t border-line pt-4">
            <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
          </div>

        </div>
        </div>

        {/* Pie fijo: crear/cancelar no viajan con el scroll del formulario. */}
        <div className="flex-none p-5 border-t border-yellow-900/30 bg-[#1a140d]">
          <div className="flex gap-2">
            <motion.button
              onClick={handleSubmit}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-honey py-2.5 text-sm font-semibold text-ink hover:bg-honeysoft"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <IconPlus className="h-4 w-4" />
              Crear lote
            </motion.button>
            <motion.button
              onClick={onClose}
              className="px-6 rounded-xl border border-line py-2.5 text-sm font-medium text-husk hover:bg-ink/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancelar
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}