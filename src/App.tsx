import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  uid,
  type Toast,
} from "./data";
import { useClock, useReveal } from "./hooks";
import { loadHives, saveHives, loadNuclei, saveNuclei, loadInspections, saveInspections, loadTasks, saveTasks, loadHarvests } from './utils/storage';
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
  IconCalendar,
} from "./ui";
import Overview from "./components/Overview";
import DashboardPanel from "./components/Dashboard";
import HivesSection from "./components/HivesSection";
import Production from "./components/Production";
import NotebookSection from "./components/NotebookSection";
import SelectionScreen from "./components/SelectionScreen";
import StorePlaceholder from "./components/StorePlaceholder";
import TasksSection from "./components/TasksSection";
import InspectionModal, { type InspectionDraft } from "./components/InspectionModal";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ActiveApiaryProvider } from "./context/ActiveApiaryContext";

import { ResponsiveHeader } from "./components/ResponsiveHeader";
import { FadeInUp } from "./components/Animations";
import type { Hive, Inspection, Task } from "./types/hive";
import AddHiveModal from "./components/AddHiveModal";
import StatsSection from "./components/StatsSection";
import CalendarSection from "./components/CalendarSection";
import SettingsPage from "./components/SettingsPage";
import ApiaryFlow from "./components/ApiaryFlow";

const NAV = [
  { id: "panel", label: "Panel", icon: IconPanel },
  { id: "colmenas", label: "Colmenas", icon: IconHex },
  { id: "estadisticas", label: "Estadísticas", icon: IconChart },
  { id: "calendario", label: "Calendario", icon: IconCalendar },
  { id: "produccion", label: "Cosecha", icon: IconDrop },
  { id: "registro", label: "Cuaderno", icon: IconClipboard },
  { id: "tareas", label: "Tareas", icon: IconCheck },
] as const;

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

function IntroHead({ temp, wind, activity, apiaryName, apiaryLocation }: { temp: number; wind: number; activity: number; apiaryName: string; apiaryLocation: string }) {
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
          {apiaryName || 'Sin apiario seleccionado'}{apiaryLocation ? ` · ${apiaryLocation}` : ''}
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
  console.log('🟣 [APP] App renderizado');
  
  return (
    <BrowserRouter>
      <SettingsProvider>
        <LanguageProvider>
          <AuthProvider>
            <ActiveApiaryProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/seleccionar"
                element={
                  <ProtectedRoute>
                    <SelectionScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tienda"
                element={
                  <ProtectedRoute>
                    <StorePlaceholder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apiarios"
                element={
                  <ProtectedRoute>
                    <ApiaryFlow />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apiarios/:id"
                element={
                  <ProtectedRoute>
                    <ApiaryFlow />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardWrapper />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/:id"
                element={
                  <ProtectedRoute>
                    <DashboardWrapper />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/seleccionar" replace />} />
              <Route path="*" element={<Navigate to="/seleccionar" replace />} />
            </Routes>
            </ActiveApiaryProvider>
          </AuthProvider>
        </LanguageProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

function DashboardWrapper() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return <Navigate to="/apiarios" replace />;
  }
  return <Dashboard apiaryId={id} />;
}

function Dashboard({ apiaryId }: { apiaryId: string }) {
  console.log('🟣 [DASHBOARD] Dashboard renderizado');
  const { user } = useAuth();
  const navigate = useNavigate();
  console.log('🟣 [DASHBOARD] User en Dashboard:', user ? user.uid : 'null');
  console.log('🟣 [DASHBOARD] Apiario ID:', apiaryId);
  
  // Cargar datos del apiario
  const [apiaryName, setApiaryName] = useState<string>('');
  const [apiaryLocation, setApiaryLocation] = useState<string>('');
  const [apiaries, setApiaries] = useState<any[]>([]);
  
  // Cargar datos desde localStorage (separados por usuario Y apiario)
  const [hives, setHives] = useState<Hive[]>([]);
  const [nuclei, setNuclei] = useState<Hive[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Estados para colmenas
  const [selectedId, setSelectedId] = useState<string>("");
  const [filter, setFilter] = useState<"saludable" | "revision" | "alerta" | "sin_reina" | "todas">("todas");
  const [query, setQuery] = useState("");
  const [modalHive, setModalHive] = useState<string | null>(null);
  const [showAddHiveModal, setShowAddHiveModal] = useState(false);
  const [editingHive, setEditingHive] = useState<Hive | null>(null);

  // Estados para núcleos
  const [selectedNucleusId, setSelectedNucleusId] = useState<string | null>(null);
  const [modalNucleus, setModalNucleus] = useState<string | null>(null);
  const [showAddNucleusModal, setShowAddNucleusModal] = useState(false);
  const [editingNucleus, setEditingNucleus] = useState<Hive | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeSection, setActiveSection] = useState<"panel" | "colmenas" | "estadisticas" | "calendario" | "produccion" | "registro" | "tareas">("panel");
  const [showSettingsPage, setShowSettingsPage] = useState(false);

  const [temp, setTemp] = useState(22.4);
  const [wind, setWind] = useState(11);

  // Cargar datos del apiario
  useEffect(() => {
    if (user && apiaryId) {
      // Guardar el apiario actual como último activo
      localStorage.setItem('lastActiveApiarioId', apiaryId);
      
      const apiariesKey = `apiarios_${user.uid}`;
      const apiariesJson = localStorage.getItem(apiariesKey);
      if (apiariesJson) {
        const apiariesList = JSON.parse(apiariesJson);
        setApiaries(apiariesList);
        const apiary = apiariesList.find((a: any) => a.id === apiaryId);
        if (apiary) {
          setApiaryName(apiary.name || '');
          setApiaryLocation(apiary.location || '');
        }
      }
    }
  }, [user, apiaryId]);
  
  // Función para cambiar de apiario
  const handleChangeApiary = () => {
    navigate('/apiarios');
  };

  // Cargar datos al montar o cuando cambia el usuario o apiario
  useEffect(() => {
    console.log('🟣 [DASHBOARD] useEffect de carga de datos ejecutado');
    console.log('🟣 [DASHBOARD] User:', user ? user.uid : 'null');
    console.log('🟣 [DASHBOARD] Apiario activo:', apiaryId);
    
    if (user && apiaryId) {
      console.log('🟣 [DASHBOARD] Cargando datos desde localStorage...');
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      
      const loadedHives = loadHives(storageKeySuffix);
      const loadedNuclei = loadNuclei(storageKeySuffix);
      const loadedInspections = loadInspections(storageKeySuffix);
      const loadedTasks = loadTasks(storageKeySuffix);
      
      console.log('🟣 [DASHBOARD] Datos cargados:', {
        hives: loadedHives.length,
        nuclei: loadedNuclei.length,
        inspections: loadedInspections.length,
        tasks: loadedTasks.length
      });
      
      setHives(loadedHives);
      setNuclei(loadedNuclei);
      setInspections(loadedInspections);
      setTasks(loadedTasks);
    } else {
      // Si no hay apiario activo, limpiar datos
      setHives([]);
      setNuclei([]);
      setInspections([]);
      setTasks([]);
    }
  }, [user, apiaryId]);

  // Guardar datos cuando cambian
  useEffect(() => {
    if (user && apiaryId) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveHives(hives, storageKeySuffix);
    }
  }, [hives, user, apiaryId]);

  useEffect(() => {
    if (user && apiaryId) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveNuclei(nuclei, storageKeySuffix);
    }
  }, [nuclei, user, apiaryId]);

  useEffect(() => {
    if (user && apiaryId) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveInspections(inspections, storageKeySuffix);
    }
  }, [inspections, user, apiaryId]);

  useEffect(() => {
    if (user && apiaryId) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveTasks(tasks, storageKeySuffix);
    }
  }, [tasks, user, apiaryId]);

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

  const activity = Math.min(98, Math.max(5, Math.round(20 + (temp - 15) * 8 - wind * 1.4)));
  const selectedHive = hives.find((h) => h.id === selectedId);
  const pending = tasks.filter((t) => !t.completed).length;

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
    pushToast("Colmena agregada", `${newHive.code} - ${newHive.name || 'Sin nombre'}`);
  };

  const updateHive = (id: string, updates: Partial<Hive>) => {
    setHives(prev => prev.map(h => 
      h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h
    ));
    pushToast("Colmena actualizada");
  };

  const deleteHive = (id: string) => {
    setHives(prev => prev.filter(h => h.id !== id));
    setInspections(prev => prev.filter(i => i.hiveId !== id));
    setTasks(prev => prev.filter(t => t.hiveId !== id));
    
    if (selectedId === id) {
      const remainingHives = hives.filter(h => h.id !== id);
      setSelectedId(remainingHives.length > 0 ? remainingHives[0].id : "");
    }
    pushToast("Colmena eliminada");
  };

  // Funciones CRUD para núcleos
  const addNucleus = (nucleus: Omit<Hive, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNucleus: Hive = {
      ...nucleus,
      id: uid(),
      entityType: 'nucleo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNuclei(prev => [...prev, newNucleus]);
    pushToast("Núcleo agregado", `${newNucleus.code} - ${newNucleus.name || 'Sin nombre'}`);
  };

  const updateNucleus = (id: string, updates: Partial<Hive>) => {
    setNuclei(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    ));
    pushToast("Núcleo actualizado");
  };

  const deleteNucleus = (id: string) => {
    setNuclei(prev => prev.filter(n => n.id !== id));
    setInspections(prev => prev.filter(i => i.hiveId !== id));
    setTasks(prev => prev.filter(t => t.hiveId !== id));
    
    if (selectedNucleusId === id) {
      const remainingNuclei = nuclei.filter(n => n.id !== id);
      setSelectedNucleusId(remainingNuclei.length > 0 ? remainingNuclei[0].id : null);
    }
    pushToast("Núcleo eliminado");
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

  const handleInspectNucleus = (id: string) => {
    setModalNucleus(id);
    pushToast("Inspección de núcleo", `${id}`);
  };

  const handleAddNucleus = () => {
    setShowAddNucleusModal(true);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const handleAddTask = (title: string) => {
    console.log('✅ [APP] Agregando tarea:', title);
    const newTask: Task = {
      id: uid(),
      title,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'media',
      completed: false,
    };
    setTasks(prev => [newTask, ...prev]);
    console.log('✅ [APP] Tarea agregada al estado, total tareas:', tasks.length + 1);
    pushToast("Tarea añadida", title);
  };

  const handleDeleteTask = (id: string) => {
    console.log('🗑️ [APP] Eliminando tarea:', id);
    setTasks(prev => prev.filter(t => t.id !== id));
    console.log('🗑️ [APP] Tarea eliminada del estado, total tareas:', tasks.length - 1);
    pushToast("Tarea eliminada");
  };

  const jumpTo = (id: string) => {
    setActiveSection(id as typeof activeSection);
  };

  return (
    <div className="relative min-h-screen pb-20 lg:pb-0">
      <Ambient />

      {/* Header Responsive */}
      <ResponsiveHeader 
        onNavigate={jumpTo} 
        onSettings={() => setShowSettingsPage(true)}
        onHome={() => navigate('/seleccionar')}
        activeSection={activeSection}
      />

      {/* contenido */}
      <div className="relative z-10">
        <main className="mx-auto max-w-6xl space-y-12 sm:space-y-16 md:space-y-20 px-4 pb-10 pt-6 sm:px-6 sm:pt-8 md:pt-10">
          <FadeInUp>
            <IntroHead temp={temp} wind={wind} activity={activity} apiaryName={apiaryName} apiaryLocation={apiaryLocation} />
          </FadeInUp>

          {/* Renderizado condicional de secciones */}
          <AnimatePresence mode="wait">
            {activeSection === 'panel' && (
              <motion.section
                key="panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DashboardPanel 
                  hives={hives} 
                  tasks={tasks}
                  inspections={inspections}
                  onNavigate={(section) => setActiveSection(section as typeof activeSection)}
                  onAddHive={() => setShowAddHiveModal(true)}
                  onAddInspection={() => setModalHive(selectedId || hives[0]?.id || null)}
                  onAddTask={() => {
                    setActiveSection('tareas');
                  }}
                  weather={{
                    temperature: 22,
                    condition: 'Parcialmente nublado',
                    rainProbability: 30
                  }}
                  apiaryName={apiaryName}
                  apiaryLocation={apiaryLocation}
                  onChangeApiary={handleChangeApiary}
                  apiaries={apiaries}
                  currentApiaryId={apiaryId}
                  onSelectApiary={(id) => {
                    if (id) {
                      navigate(`/dashboard/${id}`);
                    } else {
                      navigate('/apiarios');
                    }
                  }}
                />
              </motion.section>
            )}

            {activeSection === 'colmenas' && (
              <motion.section
                key="colmenas"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionHead
                  kicker="Mapa del bancal"
                  title="Colmenas y Núcleos"
                  right={
                    <p className="text-right font-mono text-xs leading-relaxed text-husk">
                      {hives.length} colmenas · {nuclei.length} núcleos
                      <br />
                      ambos visibles
                    </p>
                  }
                />
                <HivesSection
                  hives={hives}
                  nuclei={nuclei}
                  selectedHiveId={selectedId}
                  selectedNucleusId={selectedNucleusId}
                  onSelectHive={setSelectedId}
                  onSelectNucleus={setSelectedNucleusId}
                  onAddHive={() => setShowAddHiveModal(true)}
                  onAddNucleus={handleAddNucleus}
                  onEditHive={(hive: Hive) => setEditingHive(hive)}
                  onEditNucleus={(nucleus: Hive) => setEditingNucleus(nucleus)}
                  onDeleteHive={deleteHive}
                  onDeleteNucleus={deleteNucleus}
                  onInspectHive={(id) => setModalHive(id)}
                  onInspectNucleus={handleInspectNucleus}
                  onShowToast={pushToast}
                />
              </motion.section>
            )}

            {activeSection === 'estadisticas' && (
              <motion.section
                key="estadisticas"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionHead
                  kicker="Análisis y métricas"
                  title="Estadísticas"
                  right={<p className="font-mono text-xs text-husk">datos en tiempo real</p>}
                />
                <StatsSection />
              </motion.section>
            )}

            {activeSection === 'calendario' && (
              <motion.section
                key="calendario"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionHead
                  kicker="Planificación y eventos"
                  title="Calendario"
                  right={<p className="font-mono text-xs text-husk">gestiona tus actividades</p>}
                />
                <CalendarSection hives={hives} />
              </motion.section>
            )}

            {activeSection === 'produccion' && (
              <motion.section
                key="produccion"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionHead
                  kicker="Báscula y alzas"
                  title="Cosecha de miel"
                  right={<p className="font-mono text-xs text-husk">registro de producción</p>}
                />
                <Production hives={hives} />
              </motion.section>
            )}

            {activeSection === 'registro' && (
              <motion.section
                key="registro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionHead
                  kicker="Diario del apicultor"
                  title="Cuaderno de Campo"
                  right={<p className="font-mono text-xs text-husk">inspecciones registradas</p>}
                />
                <NotebookSection hives={hives} />
              </motion.section>
            )}

            {activeSection === 'tareas' && (
              <motion.section
                key="tareas"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionHead
                  kicker="Gestión de pendientes"
                  title="Tareas"
                  right={<p className="font-mono text-xs text-husk">{pending} pendientes</p>}
                />
                <TasksSection tasks={tasks} onToggle={toggleTask} onAdd={handleAddTask} onDelete={handleDeleteTask} />
              </motion.section>
            )}
          </AnimatePresence>

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
            <span className="font-mono">
              {apiaryLocation || 'Sin ubicación'}
            </span>
            <span>
              {hives.length} colmenas · {nuclei.length} núcleos
            </span>
          </motion.footer>
        </main>
      </div>

      {/* Modal de inspección de colmena */}
      <InspectionModal
        open={modalHive !== null}
        hives={hives}
        initialHive={modalHive ?? selectedId}
        onClose={() => setModalHive(null)}
        onSubmit={handleInspection}
      />

      {/* Modal de inspección de núcleo */}
      <InspectionModal
        open={modalNucleus !== null}
        hives={nuclei}
        initialHive={modalNucleus ?? (selectedNucleusId || '')}
        onClose={() => setModalNucleus(null)}
        onSubmit={handleInspection}
      />

      {/* Modal de agregar/editar colmena */}
      <AddHiveModal
        open={showAddHiveModal || editingHive !== null}
        hive={editingHive}
        existingCodes={hives.map(h => h.code)}
        entityType="colmena"
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

      {/* Modal de agregar/editar núcleo */}
      <AddHiveModal
        open={showAddNucleusModal || editingNucleus !== null}
        hive={editingNucleus}
        existingCodes={nuclei.map(n => n.code)}
        entityType="nucleo"
        onClose={() => {
          setShowAddNucleusModal(false);
          setEditingNucleus(null);
        }}
        onSave={(nucleus) => {
          if (editingNucleus) {
            updateNucleus(editingNucleus.id, nucleus);
          } else {
            addNucleus(nucleus as Omit<Hive, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setShowAddNucleusModal(false);
          setEditingNucleus(null);
        }}
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
