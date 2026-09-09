import { motion } from 'framer-motion';
import { STATUS_COLORS, STATUS_ORDER, type Hive, type Task } from "../types/hive";
import { useCountUp, useReveal } from "../hooks";

function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useReveal();
  return (
    <motion.div
      ref={ref}
      className={`reveal ${inView ? "in" : ""} card p-6 ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
}

export default function Overview({ hives, tasks }: { hives: Hive[]; tasks: Task[] }) {
  const { ref, inView } = useReveal();
  const total = hives.length;
  const counts = STATUS_ORDER.map((s) => ({ s, n: hives.filter((h) => h.status === s).length }));
  const health = total > 0 ? Math.round((counts[0].n / total) * 100) : 0;
  const healthAnim = useCountUp(health, inView);
  const pending = tasks.filter((t) => !t.completed);
  const nextTask = pending.find((t) => t.priority === "alta") ?? pending[0];

  return (
    <motion.div 
      ref={ref}
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Estado del colmenar - Card principal */}
      <Card className="col-span-1 sm:col-span-1 lg:col-span-7" delay={0}>
        <motion.p className="tick-label" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          Estado del Colmenar
        </motion.p>
        
        {/* Porcentaje grande */}
        <motion.div className="mt-3 flex items-end gap-3" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 200 }}>
          <span className="font-display text-6xl font-black leading-none text-cream sm:text-7xl">{healthAnim}</span>
          <span className="font-display text-3xl font-bold text-honey">%</span>
          <span className="pb-1.5 text-sm text-husk">de colmenas en forma</span>
        </motion.div>

        {/* Barra de progreso */}
        <motion.div 
          className="mt-5 flex h-4 overflow-hidden rounded-full border border-line bg-ink"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ transformOrigin: 'left' }}
        >
          {counts.map(({ s, n }) => n > 0 && (
            <motion.div 
              key={s} 
              className="h-full transition-all duration-700"
              style={{ width: `${(n / total) * 100}%`, background: STATUS_COLORS[s] }}
              title={`${s === 'sin_reina' ? 'Sin reina' : s.charAt(0).toUpperCase() + s.slice(1)}: ${n}`}
            />
          ))}
        </motion.div>

        {/* Contadores por estado */}
        <motion.div 
          className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {counts.map(({ s, n }, index) => (
            <motion.div 
              key={s} 
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
            >
              <span className="h-3 w-3 rounded-[3px]" style={{ background: STATUS_COLORS[s] }} />
              <span className="text-xs text-husk">
                {s === 'sin_reina' ? 'Sin reina' : s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              <span className="ml-auto font-mono text-sm font-bold text-cream">{n}</span>
            </motion.div>
          ))}
        </motion.div>
      </Card>

      {/* Tareas pendientes */}
      <Card className="col-span-1 sm:col-span-1 lg:col-span-5" delay={0.1}>
        <motion.p className="tick-label" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          Tareas Pendientes
        </motion.p>
        
        <motion.div className="mt-3 flex items-end gap-2" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 200 }}>
          <span className="font-display text-5xl font-black leading-none text-cream">{pending.length}</span>
          <span className="pb-1 text-sm text-husk">tareas por completar</span>
        </motion.div>

        {/* Barra de progreso de tareas */}
        <motion.div 
          className="mt-4 h-2 overflow-hidden rounded-full bg-ink"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          style={{ transformOrigin: 'left' }}
        >
          <motion.div 
            className="h-full rounded-full bg-honey"
            style={{ width: `${tasks.length > 0 ? ((tasks.length - pending.length) / tasks.length) * 100 : 0}%` }}
          />
        </motion.div>

        {/* Próxima tarea */}
        {nextTask && (
          <motion.div 
            className="mt-4 rounded-lg border border-line bg-ink/50 p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Siguiente</p>
            <p className="text-sm text-cream truncate">{nextTask.title}</p>
            {nextTask.dueDate && (
              <p className="mt-1 font-mono text-[10px] uppercase text-honey">
                {new Date(nextTask.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}
