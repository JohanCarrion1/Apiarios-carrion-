import { motion, AnimatePresence } from 'framer-motion';
import { STATUS_COLORS, type Hive, type HiveStatus } from "../types/hive";
import { Pulse } from './Animations';

interface Props {
  hives: Hive[];
  selectedId: string;
  onSelect: (id: string) => void;
  filter: HiveStatus | "todas";
  onFilter: (f: HiveStatus | "todas") => void;
  query: string;
  onAdd: () => void;
}

function shortDays(date: string | null): string {
  if (!date) return "—";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d <= 0) return "hoy";
  if (d === 1) return "1d";
  return `${d}d`;
}

export default function HiveComb({ hives, selectedId, onSelect, filter, onFilter, query, onAdd }: Props) {
  const isDim = (h: Hive) =>
    (filter !== "todas" && h.status !== filter) ||
    (query.trim() !== "" && !h.code.toLowerCase().includes(query.trim().toLowerCase()));

  const chips: { key: HiveStatus | "todas"; label: string; n: number; color?: string }[] = [
    { key: "todas", label: "TODAS", n: hives.length, color: "#f0a41c" },
    { key: "saludable", label: "SALUDABLE", n: hives.filter((h) => h.status === "saludable").length, color: STATUS_COLORS.saludable },
    { key: "revision", label: "REVISIÓN", n: hives.filter((h) => h.status === "revision").length, color: STATUS_COLORS.revision },
    { key: "alerta", label: "ALERTA", n: hives.filter((h) => h.status === "alerta").length, color: STATUS_COLORS.alerta },
    { key: "sin_reina", label: "SIN REINA", n: hives.filter((h) => h.status === "sin_reina").length, color: STATUS_COLORS.sin_reina },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.7, y: 30 },
    visible: {
      opacity: 1, scale: 1, y: 0,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  };

  return (
    <div>
      {/* Filtros tipo pill */}
      <motion.div 
        className="mb-6 flex flex-wrap items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {chips.map((c) => {
          const active = filter === c.key;
          return (
            <motion.button
              key={c.key}
              onClick={() => onFilter(c.key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                active
                  ? "border-honey bg-honey text-ink shadow-[0_0_20px_rgba(240,164,28,.4)]"
                  : "border-line bg-pane text-husk hover:border-honey/60 hover:text-cream"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {c.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
              {c.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? "bg-ink/20" : "bg-ink"}`}>
                {c.n}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Mapa hexagonal profesional */}
      <motion.div 
        className="card relative overflow-hidden px-6 py-8 sm:px-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Botón flotante de agregar */}
        <motion.button
          onClick={onAdd}
          className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-honey text-ink shadow-[0_4px_20px_rgba(240,164,28,.5)] transition-all hover:shadow-[0_6px_30px_rgba(240,164,28,.7)]"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>

        {/* Grid hexagonal */}
        <motion.div 
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {hives.map((h) => {
            const color = STATUS_COLORS[h.status];
            const selected = h.id === selectedId;
            const isAlert = h.status === 'alerta';
            const isNoQueen = h.status === 'sin_reina';
            
            const hiveCell = (
              <motion.button
                key={h.id}
                variants={itemVariants}
                onClick={() => onSelect(h.id)}
                className={`hexclip relative aspect-[1/1.1547] transition-all duration-300 ${
                  isDim(h) ? "opacity-20 saturate-50" : "opacity-100"
                } ${selected ? "ring-4 ring-honey ring-offset-2 ring-offset-ink" : ""}`}
                style={{ 
                  background: selected 
                    ? `linear-gradient(135deg, #ffc961 0%, #f0a41c 100%)` 
                    : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
                }}
                whileHover={{ 
                  scale: 1.08, 
                  y: -6,
                  boxShadow: `0 8px 30px ${color}80`
                }}
                whileTap={{ scale: 0.95 }}
                layout
              >
                {/* Contenido interno */}
                <span className="absolute inset-[3px] hexclip flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-ink/90 to-ink" style={{ background: "#1b140c" }}>
                  {/* Icono de alerta o corona */}
                  {(isAlert || isNoQueen) && (
                    <div className="absolute top-2 right-2">
                      {isAlert && (
                        <svg className="h-3 w-3 text-coral" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 6v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
                        </svg>
                      )}
                      {isNoQueen && (
                        <svg className="h-3 w-3 text-mauve" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1l3 5 5-2-2 6 5 3-5 3 2 6-5-2-3 5-3-5-5 2 2-6-5-3 5-3-2-6 5 2z"/>
                        </svg>
                      )}
                    </div>
                  )}
                  
                  {/* Código de colmena */}
                  <span className="font-mono text-sm sm:text-base font-bold text-cream">{h.code}</span>
                  
                  {/* Días desde última inspección */}
                  <span className="font-mono text-[9px] sm:text-[10px] text-husk">
                    {shortDays(h.updatedAt)}
                  </span>
                </span>
              </motion.button>
            );

            // Si está en alerta, envolver con Pulse
            if (isAlert && !isDim(h)) {
              return <Pulse key={h.id}>{hiveCell}</Pulse>;
            }
            return hiveCell;
          })}
        </motion.div>
        
        {hives.length === 0 && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mx-auto mb-4 flex h-16 w-14 items-center justify-center hexclip bg-honey/20">
              <svg className="h-8 w-8 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-husk text-sm font-medium">No hay colmenas registradas</p>
            <p className="text-husk/60 text-xs mt-2">Haz click en el botón + para agregar tu primera colmena</p>
          </motion.div>
        )}
        
        <motion.p 
          className="relative mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-husk"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Toca una celda para ver detalles de la colmena
        </motion.p>
      </motion.div>
    </div>
  );
}
