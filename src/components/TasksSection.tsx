import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useScrollLock } from "../hooks/useScrollLock";
import type { Task, Hive } from "../types/hive";
import { IconCheck, IconPlus, IconCalendar } from "../ui";
import TaskForm, { type TaskFormData } from "./TaskForm";

interface Props {
  tasks: Task[];
  hives: Hive[];
  onToggle: (id: string) => void;
  onSaveTask: (data: TaskFormData) => boolean | void;
  onDelete: (id: string) => void;
}

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  alta: "#e4603f",
  media: "#f0a41c",
  baja: "#a3906a",
};

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export default function TasksSection({ tasks, hives, onToggle, onSaveTask, onDelete }: Props) {
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [sortBy, setSortBy] = useState<"date" | "priority">("priority");
  const [showTaskForm, setShowTaskForm] = useState(false);

  useScrollLock(showTaskForm);

  const openTaskForm = () => {
    console.log('[TASK] Abriendo formulario de nueva tarea');
    setShowTaskForm(true);
  };

  const closeTaskForm = () => {
    console.log('[TASK] Cerrando formulario de nueva tarea');
    setShowTaskForm(false);
  };

  const handleSaveTask = useCallback((data: TaskFormData) => {
    console.log('[TASK] Guardando tarea con datos:', data);
    const ok = onSaveTask(data);
    if (ok !== false) {
      setShowTaskForm(false);
      setDraft("");
    }
  }, [onSaveTask]);

  useEffect(() => {
    if (!showTaskForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[TASK] Escape: cerrando formulario');
        setShowTaskForm(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTaskForm]);

  const done = tasks.filter((t) => t.completed).length;
  const pending = tasks.filter((t) => !t.completed);

  const handleQuickTask = () => {
    const title = draft.trim();
    if (!title) return;
    const ok = onSaveTask({
      title,
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'media',
      tipo: 'simple',
    });
    if (ok !== false) setDraft("");
  };

  const handleDelete = (id: string) => {
    console.log('🗑️ [TASKS] Eliminando tarea:', id);
    onDelete(id);
  };

  // Filtrar tareas
  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  // Ordenar tareas
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Primero las no completadas
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    
    if (sortBy === "priority") {
      const priorityOrder = { alta: 0, media: 1, baja: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // Ordenar por fecha
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  const formatDueDate = (dateStr: string | null): string => {
    if (!dateStr) return "Sin fecha";
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    if (diff === -1) return "Ayer";
    if (diff < 0) return `Hace ${Math.abs(diff)} días`;
    if (diff <= 7) return `En ${diff} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const isOverdue = (dateStr: string | null): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Total Tareas</p>
          <p className="font-display text-3xl font-black text-cream">{tasks.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Pendientes</p>
          <p className="font-display text-3xl font-black text-honey">{pending.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Completadas</p>
          <p className="font-display text-3xl font-black text-sage">{done}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Progreso</p>
          <p className="font-display text-3xl font-black text-cream">
            {tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Barra de progreso general */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold text-cream">Progreso General</h3>
          <span className="font-display text-2xl font-black text-honey">
            {tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-ink">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-honey to-honeysoft"
            initial={{ width: 0 }}
            animate={{ width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3">
        {/* Filtros */}
        <div className="flex rounded-xl border border-line overflow-hidden">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "all" ? "bg-honey text-ink" : "bg-ink/50 text-husk hover:text-cream"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "pending" ? "bg-honey text-ink" : "bg-ink/50 text-husk hover:text-cream"
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === "completed" ? "bg-honey text-ink" : "bg-ink/50 text-husk hover:text-cream"
            }`}
          >
            Completadas
          </button>
        </div>

        {/* Ordenamiento */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "date" | "priority")}
          className="rounded-xl border border-line bg-ink/50 px-4 py-2 text-sm text-cream focus:border-honey/70"
        >
          <option value="priority">Ordenar: Prioridad</option>
          <option value="date">Ordenar: Fecha</option>
        </select>
      </div>

      {/* Lista de tareas */}
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-honey">
            <IconCheck className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h3 className="font-display text-xl font-bold text-cream">Tareas del Colmenar</h3>
            <p className="font-mono text-[10px] uppercase tracking-widest text-husk">
              {done}/{tasks.length} completadas
            </p>
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-husk">No hay tareas</p>
            <p className="text-xs text-husk mt-2">
              {filter === "pending" ? "No hay tareas pendientes" : 
               filter === "completed" ? "No hay tareas completadas" : 
               "Agrega tu primera tarea"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {sortedTasks.map((task) => (
              <li key={task.id}>
                <div className="group flex w-full items-start gap-3.5 py-3.5">
                  <button
                    onClick={() => onToggle(task.id)}
                    className="flex flex-1 items-start gap-3.5 text-left hover:bg-pane2/40 transition-colors rounded-lg px-2 -mx-2"
                  >
                    <span
                      className="hexclip mt-0.5 flex h-[22px] w-5 shrink-0 items-center justify-center transition-all duration-200 group-hover:scale-110"
                      style={{ background: task.completed ? "#f0a41c" : "#2d2214" }}
                    >
                      {task.completed && <IconCheck className="h-3 w-3 text-ink" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-medium transition-all duration-300 ${
                        task.completed ? "text-husk line-through" : "text-cream"
                      }`}>
                        {task.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-husk">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_COLOR[task.priority] }} />
                          {PRIORITY_LABEL[task.priority]}
                        </span>
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${
                            !task.completed && isOverdue(task.dueDate) ? "text-coral" : ""
                          }`}>
                            <IconCalendar className="h-3 w-3" />
                            {formatDueDate(task.dueDate)}
                            {!task.completed && isOverdue(task.dueDate) && " ⚠️"}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  <motion.button
                    onClick={() => handleDelete(task.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-husk hover:text-coral hover:bg-coral/10 transition-all opacity-0 group-hover:opacity-100"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Eliminar tarea"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </motion.button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulario para agregar tarea */}
      <div className="card p-6">
        <div className="mb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-cream">Agregar Nueva Tarea</h3>
            <p className="font-mono text-[10px] uppercase tracking-widest text-husk">
              Crea una nueva tarea para tu colmenar
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickTask(); } }}
            placeholder="Ej: Revisar colmena C-03, Aplicar tratamiento varroa..."
            className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-husk/60 transition-colors focus:border-honey/70 focus:shadow-[0_0_0_3px_rgba(240,164,28,.12)]"
          />
          <motion.button
            type="button"
            onClick={openTaskForm}
            aria-label="Crear nueva tarea"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-honey text-ink transition-all hover:bg-honeysoft active:scale-95"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <IconPlus className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Modal de nueva tarea */}
      {showTaskForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 touch-none">
          <div className="absolute inset-0 bg-black/80" onClick={closeTaskForm} />
          <div
            className="relative flex w-full max-w-md max-h-[80vh] flex-col overflow-hidden rounded-2xl border shadow-2xl touch-auto"
            style={{ backgroundColor: '#2A2118', borderColor: 'rgba(245,158,11,0.3)' }}
          >
            <TaskForm
              hives={hives}
              onClose={closeTaskForm}
              onSave={handleSaveTask}
              initialTitle={draft}
            />
          </div>
        </div>
      )}
    </div>
  );
}
