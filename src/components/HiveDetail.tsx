import { motion } from 'framer-motion';
import { STATUS_COLORS, type Hive, type Inspection } from "../types/hive";
import { IconCrown, IconPlus, IconNote, IconX } from "../ui";

interface Props {
  hive: Hive;
  inspections: Inspection[];
  onInspect: (id: string) => void;
  onEdit: (hive: Hive) => void;
  onDelete: (id: string) => void;
}

function daysAgo(date: string): string {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'hace 1 día';
  return `hace ${d} días`;
}

export default function HiveDetail({ hive, inspections, onInspect, onEdit, onDelete }: Props) {
  const color = STATUS_COLORS[hive.status];
  const history = inspections.slice(0, 3);
  const statusLabel = hive.status === 'sin_reina' ? 'SIN REINA' : hive.status.toUpperCase();

  return (
    <motion.aside 
      className="lg:sticky lg:top-28"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <motion.div 
        key={hive.id}
        className="card relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Barra superior de color */}
        <motion.div 
          className="h-2"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ transformOrigin: 'left', background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
        />

        <div className="p-6">
          {/* Header con código y estado */}
          <motion.div 
            className="flex items-start justify-between gap-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div>
              <p className="tick-label mb-1">Colmena</p>
              <motion.h3 
                className="font-display text-5xl font-black tracking-tight text-cream"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {hive.code}
              </motion.h3>
              {hive.name && (
                <p className="mt-1 text-sm text-husk italic">{hive.name}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span 
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                style={{ color, background: color + "20", border: `2px solid ${color}` }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {statusLabel}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                REV. {daysAgo(hive.updatedAt).toUpperCase()}
              </span>
            </div>
          </motion.div>

          {/* Información de reina */}
          {hive.queenYear && (
            <motion.div 
              className="mb-4 flex items-center gap-3 rounded-xl border border-honey/40 bg-honey/10 px-4 py-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <IconCrown className="h-5 w-5 text-honey" />
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-cream">Reina {hive.queenYear}</span>
                {hive.queenMarkColor && hive.queenMarkColor !== 'sin_marca' && (
                  <>
                    <span className="text-husk">•</span>
                    <span className="flex items-center gap-1.5 text-husk">
                      marcada
                      <span 
                        className="h-3 w-3 rounded-full border-2 border-ink" 
                        style={{ 
                          background: hive.queenMarkColor === 'verde' ? '#7fb069' :
                                     hive.queenMarkColor === 'amarillo' ? '#ffc961' :
                                     hive.queenMarkColor === 'azul' ? '#6fa8dc' :
                                     hive.queenMarkColor === 'rojo' ? '#e4603f' :
                                     hive.queenMarkColor === 'blanco' ? '#e8e4da' : '#666'
                        }} 
                      />
                      {hive.queenMarkColor}
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Ubicación */}
          {hive.location && (
            <motion.p 
              className="mb-4 text-sm text-husk"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              📍 {hive.location}
            </motion.p>
          )}

          {/* Notas */}
          {hive.notes && (
            <motion.div
              className="mb-4 rounded-lg border border-line bg-ink/50 p-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Notas</p>
              <p className="text-sm italic leading-relaxed text-husk">"{hive.notes}"</p>
            </motion.div>
          )}

          {/* Historial de inspecciones */}
          {history.length > 0 && (
            <motion.div 
              className="mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="tick-label mb-2">Últimas Inspecciones</p>
              <div className="space-y-2">
                {history.map((i, index) => (
                  <motion.div 
                    key={i.id} 
                    className="flex items-center gap-3 rounded-lg border border-line bg-ink/60 px-3 py-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                      {new Date(i.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    {i.queenSeen && (
                      <span className="text-[10px] text-sage">✓ Reina</span>
                    )}
                    <span className="ml-auto truncate text-xs text-husk">{i.note || 'Sin notas'}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Botones de acción */}
          <motion.div 
            className="flex gap-2 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={() => onEdit(hive)}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-husk hover:text-cream hover:border-honey/50 transition-colors flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <IconNote className="h-3.5 w-3.5" />
              Editar
            </motion.button>
            <motion.button
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas eliminar esta colmena? Esta acción no se puede deshacer.')) {
                  onDelete(hive.id);
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-coral/30 px-3 py-2 text-xs font-medium text-coral hover:bg-coral/10 transition-colors flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <IconX className="h-3.5 w-3.5" />
              Eliminar
            </motion.button>
          </motion.div>

          {/* Botón grande de inspección */}
          <motion.button
            onClick={() => onInspect(hive.id)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-honey py-3.5 font-semibold text-ink transition-all duration-200 hover:bg-honeysoft hover:shadow-[0_8px_28px_rgba(240,164,28,.4)] active:scale-[0.98]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <IconPlus className="h-5 w-5" />
            Registrar Inspección
          </motion.button>
        </div>
      </motion.div>
    </motion.aside>
  );
}
