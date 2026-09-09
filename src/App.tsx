import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  APIARY,
  uid,
  type Toast,
} from "./data";
import { useClock, useReveal } from "./hooks";
import {
  IconBee,
  IconCheck,
  IconClipboard,
  IconDrop,
  IconFlower,
  IconHex,
  IconPanel,
  IconPlus,
  IconSearch,
  IconSun,
  IconWind,
  IconChart,
  SectionHead,
} from "./ui";
import Overview from "./components/Overview";
import HiveComb from "./components/HiveComb";
import HiveDetail from "./components/HiveDetail";
import Production from "./components/Production";
import Panels from "./components/Panels";
import InspectionModal, { type InspectionDraft } from "./components/InspectionModal";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ResponsiveHeader } from "./components/ResponsiveHeader";
import { BottomNav } from "./components/BottomNav";
import { FadeInUp } from "./components/Animations";
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from "./utils/storage";
import type { Hive, Inspection, Task } from "./types/hive";
import AddHiveModal from "./components/AddHiveModal";
import StatsSection from "./components/StatsSection";
import CalendarSection from "./components/CalendarSection";
import WeatherWidget from "./components/WeatherWidget";
import SettingsModal, { type Settings } from "./components/SettingsModal";
import SettingsPage from "./components/SettingsPage";

import { IconCalendar } from "./ui";

const NAV = [
  { id: "panel", label: "Panel", icon: IconPanel },
  { id: "colmenas", label: "Colmenas", icon: IconHex },
  { id: "estadisticas", label: "Estadísticas", icon: IconChart },
  { id: "calendario", label: "Calendario", icon: IconCalendar },
  { id: "produccion", label: "Cosecha", icon: IconDrop },
  { id: "registro", label: "Cuaderno", icon: IconClipboard },
  { id: "tareas", label: "Tareas", icon: IconCheck },
] as const;

const SECTION_IDS = NAV.map((n) => n.id);

/* ---------- ambiente ---------- */

function Ambient() {
  return (
    <>
      <svg className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.05]" aria-hidden="true">
        <defs>
          <pattern id="hexes" width="28" height="49" patternUnits="userSpaceOnUse" patternTransform="scale(2.4)">
            <path d="M13.99 9.25l13 7.5v15l-13 7.5-13-7.5v-15z" fill="none" stroke="#f0a41c" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexes)" />
      </svg>
      <div className="glow-a pointer-events-none fixed -left-44 -top-44 z-0 h-[36rem] w-[36rem] rounded-full opacity-[0.13]" style={{ background: "radial-gradient(circle, #f0a41c 0%, transparent 65%)" }} />
      <div className="glow-b pointer-events-none fixed -bottom-52 -right-40 z-0 h-[40rem] w-[40rem] rounded-full opacity-[0.1]" style={{ background: "radial-gradient(circle, #b97d15 0%, transparent 65%)" }} />
      {[
        { top: "14%", dur: "46s", delay: "-8s", cls: "h-5 w-5 opacity-30" },
        { top: "44%", dur: "60s", delay: "-31s", cls: "h-4 w-4 opacity-25" },
        { top: "72%", dur: "52s", delay: "-19s", cls: "h-6 w-6 opacity-20" },
      ].map((b, i) => (
        <div key={i} className="bee-fly pointer-events-none fixed left-0 z-0" style={{ top: b.top, ["--dur" as string]: b.dur, animationDelay: b.delay }}>
          <div className="bee-bob">
            <IconBee className={`text-honey ${b.cls}`} />
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- cabecera de página ---------- */

function IntroHead({ temp, wind, activity }: { temp: number; wind: number; activity: number }) {
  const now = useClock();
  const { ref, inView } = useReveal();
  const dateCap = (() => {
    const s = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.header 
      ref={ref}
      className={`reveal ${inView ? "in" : ""} flex flex-col sm:flex-row flex-wrap items-start sm:items-end justify-between gap-6`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div>
        <motion.p 
          className="tick-label mb-3 flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <IconFlower className="h-3.5 w-3.5 text-honey" />
          {APIARY.name} · {APIARY.place}
        </motion.p>
        <motion.h1 
          className="font-display text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-black leading-[1.03] tracking-tight text-cream"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          El colmenar,
          <br />
          <em className="text-honey">bajo control.</em>
        </motion.h1>
      </div>

      <motion.div 
        className="card flex items-center gap-3 sm:gap-5 px-4 sm:px-5 py-3 sm:py-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
      >
        <div>
          <p className="tick-label">{dateCap}</p>
          <p className="mt-1 font-mono text-xl sm:text-2xl font-bold leading-none text-cream">
            {time}
            <span className="ml-1 text-xs font-normal text-husk">h</span>
          </p>
        </div>
        <div className="hidden h-11 w-px bg-line sm:block" />
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-semibold text-cream">
            <IconSun className="h-4 w-4 text-honey" />
            {temp.toFixed(1)}°
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-semibold text-cream">
            <IconWind className="h-4 w-4 text-husk" />
            {wind}
            <span className="text-[10px] font-normal text-husk">km/h</span>
          </span>
        </div>
        <div className="hidden h-11 w-px bg-line sm:block" />
        <div className="hidden items-center gap-3 sm:flex">
          <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#392c19" strokeWidth="4" />
            <motion.circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="#f0a41c"
              strokeWidth="4"
              strokeLinecap="round"
              pathLength={100}
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${activity} 100` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </svg>
          <div>
            <p className="font-display text-xl font-black leading-none text-cream">{activity}%</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-husk">actividad de vuelo</p>
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
}

/* ---------- app ---------- */

export default function App() {
  return (
    <SettingsProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </AuthProvider>
      </LanguageProvider>
    </SettingsProvider>
  );
}

function Dashboard() {
  const { user } = useAuth();
  
  // Cargar datos desde localStorage
  const [hives, setHives] = useState<Hive[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [filter, setFilter] = useState<"saludable" | "revision" | "alerta" | "sin_reina" | "todas">("todas");
  const [query, setQuery] = useState("");
  const [modalHive, setModalHive] = useState<string | null>(null);
  const [showAddHiveModal, setShowAddHiveModal] = useState(false);
  const [editingHive, setEditingHive] = useState<Hive | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [active, setActive] = useState("panel");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    location: {
      name: 'Huaraz, Áncash',
      latitude: -9.5278,
      longitude: -77.5278,
    },
    photos: {
      enabled: true,
      quality: 'medium',
      maxPhotos: 5,
    },
  });

  const [temp, setTemp] = useState(22.4);
  const [wind, setWind] = useState(11);

  // Cargar datos al montar
  useEffect(() => {
    const savedHives = loadFromStorage<Hive[]>(STORAGE_KEYS.HIVES) || [];
    const savedInspections = loadFromStorage<Inspection[]>(STORAGE_KEYS.INSPECTIONS) || [];
    const savedTasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS) || [];
    const savedSettings = loadFromStorage<typeof settings>('panal_settings');
    
    setHives(savedHives);
    setInspections(savedInspections);
    setTasks(savedTasks);
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  // Guardar datos cuando cambian
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.HIVES, hives);
  }, [hives]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.INSPECTIONS, inspections);
  }, [inspections]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    saveToStorage('panal_settings', settings);
  }, [settings]);

  // Seleccionar primera colmena cuando se cargan
  useEffect(() => {
    if (hives.length > 0 && !selectedId) {
      setSelectedId(hives[0].id);
    }
  }, [hives, selectedId]);

  useEffect(() => {
    const id = setInterval(() => {
      setTemp((t) => +Math.min(24.5, Math.max(20.5, t + (Math.random() - 0.5) * 0.6)).toFixed(1));
      setWind((w) => Math.round(Math.min(16, Math.max(7, w + (Math.random() - 0.5) * 3))));
    }, 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const activity = Math.min(98, Math.max(5, Math.round(20 + (temp - 15) * 8 - wind * 1.4)));
  const alerts = hives.filter((h) => h.status === "alerta").length;
  const pending = tasks.filter((t) => !t.completed).length;
  const selectedHive = hives.find((h) => h.id === selectedId);

  const pushToast = (title: string, desc?: string) => {
    const t: Toast = { id: uid(), title, desc };
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3600);
  };

  // Funciones CRUD para colmenas
  const addHive = (hive: Omit<Hive, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newHive: Hive = {
      ...hive,
      id: uid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHives(prev => [...prev, newHive]);
    pushToast("Colmena agregada", `${hive.code} - ${hive.name || 'Sin nombre'}`);
  };

  const updateHive = (id: string, updates: Partial<Hive>) => {
    setHives(prev => prev.map(h => 
      h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h
    ));
    pushToast("Colmena actualizada");
  };

  const deleteHive = (id: string) => {
    setHives(prev => prev.filter(h => h.id !== id));
    if (selectedId === id) {
      setSelectedId(hives.length > 1 ? hives.find(h => h.id !== id)?.id || "" : "");
    }
    pushToast("Colmena eliminada");
  };

  const handleInspection = (d: InspectionDraft) => {
    const inspection: Inspection = {
      id: uid(),
      hiveId: d.hiveId,
      date: new Date().toISOString(),
      queenSeen: d.queenSeen,
      brood: d.brood,
      honey: d.honey,
      varroa: d.varroa,
      calm: d.calm,
      note: d.note,
    };
    setInspections(prev => [inspection, ...prev]);
    setModalHive(null);
    pushToast("Inspección registrada", `${d.hiveId} · ${d.queenSeen ? "reina vista" : "sin ver reina"} · varroa ${d.varroa.toFixed(1)}%`);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const handleAddTask = (title: string) => {
    const newTask: Task = {
      id: uid(),
      title,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'media',
      completed: false,
    };
    setTasks(prev => [newTask, ...prev]);
    pushToast("Tarea añadida", title);
  };

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const openAlerts = () => {
    setFilter("alerta");
    jumpTo("colmenas");
  };

  return (
    <div className="relative min-h-screen pb-20 lg:pb-0">
      <Ambient />

      {/* Header Responsive */}
      <ResponsiveHeader onNavigate={jumpTo} onSettings={() => setShowSettingsPage(true)} />

      {/* contenido */}
      <div className="relative z-10">
        <main className="mx-auto max-w-6xl space-y-12 sm:space-y-16 md:space-y-20 px-4 pb-10 pt-6 sm:px-6 sm:pt-8 md:pt-10">
          <FadeInUp>
            <IntroHead temp={temp} wind={wind} activity={activity} />
          </FadeInUp>

          {/* Widget de Clima */}
          <FadeInUp delay={0.1}>
            <WeatherWidget location={settings.location} />
          </FadeInUp>

          {/* Botón de Ajustes */}
          <div className="flex justify-end">
            <motion.button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>⚙️</span>
              <span>Ajustes</span>
            </motion.button>
          </div>

          <motion.section 
            id="panel" 
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <Overview hives={hives} tasks={tasks} />
          </motion.section>

          <motion.section 
            id="colmenas" 
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <SectionHead
              kicker="Mapa del bancal"
              title="Colmenas"
              right={
                <p className="text-right font-mono text-xs leading-relaxed text-husk">
                  {hives.length} colonias
                  <br />
                  distribución por calles
                </p>
              }
            />
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <HiveComb hives={hives} selectedId={selectedId} onSelect={setSelectedId} filter={filter} onFilter={setFilter} query={query} onAdd={() => setShowAddHiveModal(true)} />
              </div>
              <div className="lg:col-span-4">
                {selectedHive && (
                  <HiveDetail 
                    hive={selectedHive} 
                    inspections={inspections.filter(i => i.hiveId === selectedId)} 
                    onInspect={setModalHive}
                    onEdit={(hive) => setEditingHive(hive)}
                    onDelete={(id) => {
                      if (confirm('¿Estás seguro de que deseas eliminar esta colmena?')) {
                        deleteHive(id);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </motion.section>

          <motion.section 
            id="estadisticas" 
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <SectionHead
              kicker="Análisis y métricas"
              title="Estadísticas"
              right={<p className="font-mono text-xs text-husk">datos en tiempo real</p>}
            />
            <StatsSection hives={hives} inspections={inspections} />
          </motion.section>

          <motion.section 
            id="calendario" 
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <SectionHead
              kicker="Planificación y eventos"
              title="Calendario"
              right={<p className="font-mono text-xs text-husk">gestiona tus actividades</p>}
            />
            <CalendarSection hives={hives} tasks={tasks} />
          </motion.section>

          <motion.section 
            id="produccion" 
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <SectionHead
              kicker="Báscula y alzas"
              title="Cosecha de miel"
              right={<p className="font-mono text-xs text-husk">registro de producción</p>}
            />
            <Production hivesCount={hives.length} />
          </motion.section>

          <motion.section 
            id="registro" 
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <SectionHead
              kicker="Diario del apicultor"
              title="Cuaderno y tareas"
              right={<p className="font-mono text-xs text-husk">datos guardados localmente</p>}
            />
            <Panels inspections={inspections} hives={hives} tasks={tasks} onToggle={toggleTask} onAdd={handleAddTask} />
          </motion.section>

          <motion.footer 
            className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 border-t border-line pt-8 text-xs text-husk"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="flex items-center gap-2">
              <span className="hexclip flex h-6 w-5 items-center justify-center bg-honey/90 text-ink">
                <IconBee className="h-3.5 w-3.5" />
              </span>
              <b className="font-display text-sm tracking-wider text-cream">PANAL</b> — cuaderno apícola digital
            </span>
            <span className="font-mono">{APIARY.coords}</span>
            <span>
              {hives.length} colmenas · {APIARY.season}
            </span>
          </motion.footer>
        </main>
      </div>

      {/* Bottom Navigation (móvil) */}
      <BottomNav activeSection={active} onNavigate={jumpTo} />

      {/* Modal de inspección */}
      <InspectionModal
        open={modalHive !== null}
        hives={hives}
        initialHive={modalHive ?? selectedId}
        onClose={() => setModalHive(null)}
        onSubmit={handleInspection}
      />

      {/* Modal de agregar/editar colmena */}
      <AddHiveModal
        open={showAddHiveModal || editingHive !== null}
        hive={editingHive}
        existingCodes={hives.map(h => h.code)}
        onClose={() => {
          setShowAddHiveModal(false);
          setEditingHive(null);
        }}
        onSave={(hive) => {
          if (editingHive) {
            updateHive(editingHive.id, hive);
          } else {
            addHive(hive as Omit<Hive, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setShowAddHiveModal(false);
          setEditingHive(null);
        }}
      />

      {/* Modal de ajustes */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSettingsChange={(newSettings) => setSettings(newSettings)}
      />

      {/* Página completa de ajustes */}
      {showSettingsPage && (
        <SettingsPage onClose={() => setShowSettingsPage(false)} />
      )}

      {/* toasts */}
      <div className="fixed bottom-24 lg:bottom-5 right-5 z-[60] flex w-72 flex-col gap-2">
        {toasts.map((t) => (
          <motion.div 
            key={t.id} 
            className="toast-in card flex items-start gap-3 border-honey/40 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)]"
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-honey text-ink">
              <IconCheck className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cream">{t.title}</p>
              {t.desc && <p className="mt-0.5 truncate font-mono text-[11px] text-husk">{t.desc}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
