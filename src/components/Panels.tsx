import { useState, type FormEvent } from "react";
import type { Hive, Inspection, Task } from "../types/hive";
import { IconCheck, IconClipboard, IconPlus } from "../ui";

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  alta: "#e4603f",
  media: "#f0a41c",
  baja: "#a3906a",
};

interface Props {
  inspections: Inspection[];
  hives: Hive[];
  tasks: Task[];
  onToggle: (id: string) => void;
  onAdd: (title: string) => void;
}

export default function Panels({ inspections, hives, tasks, onToggle, onAdd }: Props) {
  const [draft, setDraft] = useState("");
  const done = tasks.filter((t) => t.completed).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-honey">
            <IconClipboard className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold text-cream">Cuaderno de campo</h3>
            <p className="font-mono text-[10px] uppercase tracking-widest text-husk">{inspections.length} inspecciones</p>
          </div>
        </div>

        <div className="divide-y divide-line">
          {inspections.slice(0, 6).map((i) => (
            <article key={i.id} className="group flex gap-3.5 py-4 transition-colors first:pt-0 hover:bg-pane2/40">
              <span className="w-1 shrink-0 self-stretch rounded-full bg-honey" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-line bg-ink px-2 py-0.5 font-mono text-[11px] font-semibold text-cream">
                    {hives.find(h => h.id === i.hiveId)?.code || '—'}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                    {new Date(i.date).toLocaleDateString('es-ES')}
                  </span>
                  {i.queenSeen && (
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-sage">
                      reina vista
                    </span>
                  )}
                </div>
                {i.note && (
                  <p className="mt-1.5 truncate text-sm italic text-husk">"{i.note}"</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div id="tareas" className="card scroll-mt-32 p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-honey">
            <IconCheck className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1">
            <h3 className="font-display text-xl font-bold text-cream">Tareas del colmenar</h3>
            <p className="font-mono text-[10px] uppercase tracking-widest text-husk">
              {done}/{tasks.length} completadas
            </p>
          </div>
          <span className="font-display text-3xl font-black text-honey">
            {tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0}%
          </span>
        </div>

        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-ink">
          <div className="h-full rounded-full bg-honey transition-all duration-500" style={{ width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%` }} />
        </div>

        <ul className="divide-y divide-line">
          {tasks.map((t) => (
            <li key={t.id}>
              <button onClick={() => onToggle(t.id)} className="group flex w-full items-start gap-3.5 py-3.5 text-left">
                <span
                  className="hexclip mt-0.5 flex h-[22px] w-5 shrink-0 items-center justify-center transition-all duration-200 group-hover:scale-110"
                  style={{ background: t.completed ? "#f0a41c" : "#2d2214" }}
                >
                  {t.completed && <IconCheck className="h-3 w-3 text-ink" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium transition-all duration-300 ${t.completed ? "text-husk line-through" : "text-cream"}`}>
                    {t.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-husk">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_COLOR[t.priority] }} />
                      {t.priority}
                    </span>
                    {t.dueDate && (
                      <span className={new Date(t.dueDate) < new Date() && !t.completed ? "text-coral" : ""}>
                        {new Date(t.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Añadir tarea…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-cream placeholder:text-husk/60 transition-colors focus:border-honey/70"
          />
          <button
            type="submit"
            aria-label="Añadir tarea"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey text-ink transition-all hover:bg-honeysoft active:scale-95"
          >
            <IconPlus className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
