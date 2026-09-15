import { useEffect, useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  uid,
  type Toast,
} from "./data";
import { useClock, useReveal, useWeather } from "./hooks";
import { getWeatherDescription } from "./services/weather";
import { loadHives, saveHives, loadNuclei, saveNuclei, loadInspections, saveInspections, loadTasks, saveTasks, loadHarvests, saveHarvests, loadEvents, saveEvents, loadBreedingLots, saveBreedingLots, loadCuadernoEntries, saveCuadernoEntries, loadQueens, saveQueens, loadQueenHistory, saveQueenHistory, loadInventory, saveInventory, loadApiaries, saveLastActiveApiaryId, loadLastActiveApiaryId, onDataRestored } from './utils/storage';
import { formatHour } from './utils/formatTime';
import type { Queen, QueenChange, QueenChangeReason } from './types/queen';
import { getQueenAlert, queenColorForYear } from './types/queen';
import type { InventoryItem } from './types/inventory';
import { inventoryDisponible, isStockBajo } from './types/inventory';
import InventorySection from './components/InventorySection';
import QueenForm from './components/QueenForm';
import type { QueenFormData } from './components/QueenForm';
import QueenLostModal from './components/QueenLostModal';
import { IconBee,
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
  IconQueen,
  IconPackage,
  IconLayers,
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
import type { TaskFormData } from "./components/TaskForm";
import InspectionModal, { type InspectionDraft } from "./components/InspectionModal";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ActiveApiaryProvider } from "./context/ActiveApiaryContext";

import { ResponsiveHeader } from "./components/ResponsiveHeader";
import { FadeInUp } from "./components/Animations";
import { InstallPrompt, PWAUpdateToast } from "./components/InstallPrompt";
import type { Hive, Inspection, Task } from "./types/hive";
import type { CalendarEvent, Notification } from "./types/calendar";
import type { RecurringTask, FloweringEntry } from "./types/reminders";
import { computeReminders } from "./utils/reminders";
import {
  loadRecurringTasks,
  saveRecurringTasks,
  loadFloweringEntries,
  saveFloweringEntries,
  loadNotifications,
  saveNotifications,
} from "./utils/storage";
import AddHiveModal from "./components/AddHiveModal";
import StatsSection from "./components/StatsSection";
import CalendarSection from "./components/CalendarSection";
import SettingsPage from "./components/SettingsPage";
import CreateApiaryModal from "./components/CreateApiaryModal";
import ManageApiariesModal from "./components/ManageApiariesModal";
import { updateApiary, deleteApiary, type Apiary } from "./services/apiaryService";
import BreedingSection from "./components/BreedingSection";
import TransferHistorySection from "./components/TransferHistorySection";
import { convertNucleoToColmena, transferHiveToApiary, transferNucleoToApiary, getNextHiveCode } from "./services/transfers";
import type { BreedingLot, CuadernoEntry } from "./types/breeding";
import { differenceInDays } from "date-fns";

const NAV = [
  { id: "panel", label: "Panel", icon: IconPanel },
  { id: "colmenas", label: "Colmenas", icon: IconHex },
  { id: "cria", label: "Cría", icon: IconQueen },
  { id: "estadisticas", label: "Estadísticas", icon: IconChart },
  { id: "calendario", label: "Calendario", icon: IconCalendar },
  { id: "produccion", label: "Cosecha", icon: IconDrop },
  { id: "registro", label: "Cuaderno", icon: IconClipboard },
  { id: "tareas", label: "Tareas", icon: IconCheck },
  { id: "inventario", label: "Inventario", icon: IconPackage },
  { id: "transferencias", label: "Transferencias", icon: IconLayers },
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

function IntroHead({ temp, wind, activity, apiaryName, apiaryLocation }: { temp: number | null; wind: number | null; activity: number; apiaryName: string; apiaryLocation: string }) {
  const now = useClock();
  const { ref, inView } = useReveal();
  const dateCap = (() => {
    const s = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const time = formatHour(now);

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
          </p>
        </div>
        <div className="hidden h-11 w-px bg-line sm:block" />
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-semibold text-cream">
            <IconSun className="h-4 w-4 text-honey" />
            {temp !== null ? temp.toFixed(1) : '--'}°
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-semibold text-cream">
            <IconWind className="h-4 w-4 text-husk" />
            {wind !== null ? wind : '--'}
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
                    <ApiariosRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apiarios/:id"
                element={
                  <ProtectedRoute>
                    <ApiariosRedirect />
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
              <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <InstallPrompt />
            <PWAUpdateToast />
            </ActiveApiaryProvider>
          </AuthProvider>
        </LanguageProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

function DashboardWrapper() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<
    | { kind: 'dashboard'; apiaryId: string }
    | { kind: 'redirect'; to: string }
    | { kind: 'onboarding' }
    | null
  >(null);

  useEffect(() => {
    if (!user) return;

    const apiaries = loadApiaries(user.uid);

    if (id) {
      const exists = apiaries.find((a: any) => a.id === id);
      if (exists) {
        setResolved({ kind: 'dashboard', apiaryId: id });
      } else if (apiaries.length > 0) {
        setResolved({ kind: 'redirect', to: '/dashboard' });
      } else {
        setResolved({ kind: 'onboarding' });
      }
      return;
    }

    if (apiaries.length === 0) {
      setResolved({ kind: 'onboarding' });
      return;
    }

    // Entrar directo al último apiario usado (o al primero si no existe/borrado)
    const lastActiveId = loadLastActiveApiaryId(user.uid);
    const lastApiary = apiaries.find((a: any) => a.id === lastActiveId);
    const target = lastApiary ? lastApiary.id : apiaries[0].id;
    saveLastActiveApiaryId(target, user.uid);
    setResolved({ kind: 'redirect', to: `/dashboard/${target}` });
  }, [user, id]);

  if (!user) return null;

  if (resolved === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <p className="text-husk font-mono text-sm">Cargando apiario...</p>
      </div>
    );
  }

  if (resolved.kind === 'redirect') {
    return <Navigate to={resolved.to} replace />;
  }

  if (resolved.kind === 'onboarding') {
    return (
      <CreateApiaryModal
        open
        variant="screen"
        title="Crea tu primer apiario"
        subtitle="Comienza registrando tu primer apiario para gestionar sus colmenas en el dashboard."
        submitLabel="Crear y entrar al dashboard"
        onCreated={(newId) => navigate(`/dashboard/${newId}`)}
      />
    );
  }

  return <Dashboard apiaryId={resolved.apiaryId} />;
}

// La pantalla "Mis Apiarios" deja de ser ruta de entrada: cualquier visita
// manual a /apiarios redirige al dashboard.
function ApiariosRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/dashboard/${id}` : '/dashboard'} replace />;
}

/* ---------- ruteo de inicio ---------- */

// Puerta de entrada tras el login/recarga. Lleva SIEMPRE directo al panel
// del último apiario usado (o al onboarding si no hay apiarios). La pantalla
// "Mis Apiarios" (/apiarios) queda eliminada como entrada: si se escribe a
// mano, /apiarios redirige al dashboard.
function HomeRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return; // aún no autenticado
    navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return null;
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
  const [harvests, setHarvests] = useState<any[]>([]);
  const [breedingLots, setBreedingLots] = useState<BreedingLot[]>([]);
  const [cuadernoEntries, setCuadernoEntries] = useState<CuadernoEntry[]>([]);
  const [queens, setQueens] = useState<Queen[]>([]);
  const [queenHistory, setQueenHistory] = useState<QueenChange[]>([]);

  // Calendario: eventos, tareas recurrentes y floración (compartidos entre secciones)
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [floweringEntries, setFloweringEntries] = useState<FloweringEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotifications());

  // Inventario de material, herramientas e insumos (compartido entre apiarios)
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Alcance de datos ya hidratado (uid:apiary). Hasta que no se carga el apiario
  // actual NO se persiste nada: evita que un useEffect de montaje sobrescriba
  // el almacenamiento con arrays vacíos y borre los datos del usuario.
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const scopeKey =
    user && apiaryId ? `${user.uid}:${apiaryId}` : null;

  const { settings } = useSettings();
  const notificationCfg = settings.notifications;
  const alertDaysBefore =
    typeof notificationCfg.daysBefore === 'number' && notificationCfg.daysBefore > 0
      ? notificationCfg.daysBefore
      : 3;
  const enabledKinds = {
    inspections: notificationCfg.kinds?.inspections ?? true,
    harvests: notificationCfg.kinds?.harvests ?? true,
    breeding: notificationCfg.kinds?.breeding ?? true,
    flowering: notificationCfg.kinds?.flowering ?? true,
    tasks: notificationCfg.kinds?.tasks ?? true,
  };

  // Recordatorios calculados (campanita + widget del panel)
  const reminders = useMemo(
    () =>
      computeReminders({
        events,
        breedingLots,
        recurringTasks,
        floweringEntries,
        hives,
        daysBefore: alertDaysBefore,
        enabledKinds,
      }),
    [events, breedingLots, recurringTasks, floweringEntries, hives, alertDaysBefore, enabledKinds]
  );

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
  const [activeSection, setActiveSection] = useState<"panel" | "colmenas" | "cria" | "estadisticas" | "calendario" | "produccion" | "registro" | "tareas" | "inventario" | "transferencias">("panel");
  const [showSettingsPage, setShowSettingsPage] = useState(false);

  // Estados para reinas
  const [queenModal, setQueenModal] = useState<{
    open: boolean;
    hive: Hive | null;
    queen: Queen | null;
    mode: 'create' | 'edit' | 'change';
  }>({ open: false, hive: null, queen: null, mode: 'create' });
  const [lostQueen, setLostQueen] = useState<Queen | null>(null);
  const [criaFocusLotId, setCriaFocusLotId] = useState<string | null>(null);

  const [temp, setTemp] = useState<number | null>(null);
  const [wind, setWind] = useState<number | null>(null);

  // Gestión de apiarios desde el dropdown del dashboard
  const [showCreateApiaryModal, setShowCreateApiaryModal] = useState(false);
  const [showManageApiariesModal, setShowManageApiariesModal] = useState(false);

  // Cargar datos del apiario
  useEffect(() => {
    if (user && apiaryId) {
      // Guardar el apiario actual como último activo
      saveLastActiveApiaryId(apiaryId);

      const apiariesList = loadApiaries(user.uid);
      setApiaries(apiariesList);
      const apiary = apiariesList.find((a: any) => a.id === apiaryId);
      if (apiary) {
        setApiaryName(apiary.name || '');
        setApiaryLocation(apiary.location || '');
      }
    }
  }, [user, apiaryId]);
  
  // Función para gestionar los apiarios (editar/eliminar) desde el dropdown
  const handleChangeApiary = () => {
    setShowManageApiariesModal(true);
  };

  // Crear un apiario desde el dropdown: al crearlo se activa automáticamente
  // y se guarda como lastActiveApiaryId (lo hace CreateApiaryModal).
  const handleApiaryCreated = (newId: string) => {
    setShowCreateApiaryModal(false);
    navigate(`/dashboard/${newId}`);
  };

  const handleUpdateApiary = async (apiaryIdToUpdate: string, updates: Partial<Apiary>) => {
    if (!user) return;
    try {
      await updateApiary(user.uid, apiaryIdToUpdate, updates);
      setApiaries(loadApiaries(user.uid));
      pushToast('Apiario actualizado');
    } catch (error) {
      console.error('[APIARY] Error al actualizar:', error);
      pushToast('Error al actualizar el apiario', 'error');
    }
  };

  const handleDeleteApiary = async (apiaryIdToDelete: string) => {
    if (!user) return;
    try {
      await deleteApiary(user.uid, apiaryIdToDelete);
      if (apiaryIdToDelete === apiaryId) {
        // Se eliminó el apiario activo: entrar al siguiente disponible.
        saveLastActiveApiaryId(null, user.uid);
        navigate('/dashboard');
      } else {
        setApiaries(loadApiaries(user.uid));
        pushToast('Apiario eliminado');
      }
    } catch (error) {
      console.error('[APIARY] Error al eliminar:', error);
      pushToast('Error al eliminar el apiario', 'error');
    }
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
      const loadedHarvestsData = loadHarvests(storageKeySuffix);
      const loadedBreedingLots = loadBreedingLots(user.uid, apiaryId);
      const loadedCuadernoEntries = loadCuadernoEntries(user.uid, apiaryId);
      const loadedQueens = loadQueens(user.uid, apiaryId);
      const loadedQueenHistory = loadQueenHistory(user.uid, apiaryId);
      const loadedEvents = loadEvents();
      const loadedRecurringTasks = loadRecurringTasks();
      const loadedFloweringEntries = loadFloweringEntries();
      const loadedInventory = loadInventory(user.uid);
      
      console.log('🟣 [DASHBOARD] Datos cargados:', {
        hives: loadedHives.length,
        nuclei: loadedNuclei.length,
        inspections: loadedInspections.length,
        tasks: loadedTasks.length,
        harvests: loadedHarvestsData.length,
        breedingLots: loadedBreedingLots.length,
        queens: loadedQueens.length,
      });
      
      setHives(loadedHives);
      setNuclei(loadedNuclei);
      setInspections(loadedInspections);
      setTasks(loadedTasks);
      setHarvests(loadedHarvestsData);
      setBreedingLots(loadedBreedingLots);
      setCuadernoEntries(loadedCuadernoEntries);
      setQueens(loadedQueens);
      setQueenHistory(loadedQueenHistory);
      setEvents(loadedEvents);
      setRecurringTasks(loadedRecurringTasks);
      setFloweringEntries(loadedFloweringEntries);
      setInventory(loadedInventory);
      setLoadedScope(scopeKey);
    } else {
      // Si no hay apiario activo, limpiar estados (sin tocar storage)
      setHives([]);
      setNuclei([]);
      setInspections([]);
      setTasks([]);
      setHarvests([]);
      setBreedingLots([]);
      setCuadernoEntries([]);
      setQueens([]);
      setQueenHistory([]);
      setEvents([]);
      setRecurringTasks([]);
      setFloweringEntries([]);
      setInventory([]);
      setLoadedScope(null);
    }
  }, [user, apiaryId]);

  // Guardar datos cuando cambian (solo tras hidratar el apiario actual)
  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveHives(hives, storageKeySuffix);
    }
  }, [hives, user, apiaryId, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveNuclei(nuclei, storageKeySuffix);
    }
  }, [nuclei, user, apiaryId, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveInspections(inspections, storageKeySuffix);
    }
  }, [inspections, user, apiaryId, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveTasks(tasks, storageKeySuffix);
    }
  }, [tasks, user, apiaryId, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveHarvests(harvests, storageKeySuffix);
    }
  }, [harvests, user, apiaryId, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveBreedingLots(breedingLots, user.uid, apiaryId);
    }
  }, [breedingLots, user, apiaryId, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveCuadernoEntries(cuadernoEntries, user.uid, apiaryId);
    }
  }, [cuadernoEntries, user, apiaryId, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveQueens(queens, user.uid, apiaryId);
    }
  }, [queens, user, apiaryId, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveQueenHistory(queenHistory, user.uid, apiaryId);
    }
  }, [queenHistory, user, apiaryId, scopeKey, loadedScope]);

  // Guardar inventario (solo por usuario, compartido entre apiarios)
  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveInventory(inventory, user.uid);
    }
  }, [inventory, user, scopeKey, loadedScope]);

  // Guardar calendario (eventos, tareas recurrentes, floración, notificaciones)
  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveEvents(events);
    }
  }, [events, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveRecurringTasks(recurringTasks);
    }
  }, [recurringTasks, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveFloweringEntries(floweringEntries);
    }
  }, [floweringEntries, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveNotifications(notifications);
    }
  }, [notifications, scopeKey, loadedScope]);

  // Aviso con toast cuando se restauran datos desde un backup
  useEffect(() => {
    return onDataRestored((info) => {
      pushToast(`Datos restaurados desde backup del ${info.date}`, info.entity);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar recordatorios calculados con la lista persistente de notificaciones
  useEffect(() => {
    if (!user) return;
    setNotifications(prev => {
      const existing = new Set(prev.map(n => n.id));
      const newNotifs: Notification[] = reminders.flatMap(r => {
        const id = `${r.kind}_${r.dateKey}_${r.title}_${r.eventId || ''}`;
        if (existing.has(id)) return [];
        const type: Notification['type'] =
          r.kind === 'inspection'
            ? 'inspection_reminder'
            : r.kind === 'treatment'
            ? 'treatment'
            : r.kind === 'harvest'
            ? 'harvest'
            : 'alert';
        return [{
          id,
          type,
          title: r.title,
          description: r.description || '',
          eventId: r.eventId,
          read: false,
          createdAt: new Date().toISOString(),
        }];
      });
      if (newNotifs.length === 0) return prev;
      return [...newNotifs, ...prev].slice(0, 50);
    });
  }, [reminders, user]);

  // Alertas de stock bajo → notificaciones en la campanita
  useEffect(() => {
    if (!user) return;
    const lowItems = inventory.filter(isStockBajo);
    setNotifications(prev => {
      const stockIds = new Set(lowItems.map(i => `stock_${i.id}`));
      // Quitar notificaciones de stock de ítems que ya no están bajos
      const kept = prev.filter(n => !(n.id.startsWith('stock_') && !stockIds.has(n.id)));
      const existing = new Set(kept.map(n => n.id));
      const newNotifs: Notification[] = lowItems.flatMap(i => {
        const id = `stock_${i.id}`;
        if (existing.has(id)) return [];
        const disp = inventoryDisponible(i);
        return [{
          id,
          type: 'stock_alert' as const,
          title: `Stock bajo: ${i.nombre}`,
          description: `${disp} ${i.unidad} restantes`,
          read: false,
          createdAt: new Date().toISOString(),
        }];
      });
      if (newNotifs.length === 0 && kept.length === prev.length) return prev;
      return [...newNotifs, ...kept].slice(0, 50);
    });
  }, [inventory, user]);

  // Inventario: ítems críticos para el widget del panel
  const inventoryLowStockCount = useMemo(() => inventory.filter(isStockBajo).length, [inventory]);
  const inventoryAlerts = useMemo(
    () => [...inventory].filter(isStockBajo).sort((a, b) => inventoryDisponible(a) - inventoryDisponible(b)).slice(0, 5),
    [inventory]
  );

  // Seleccionar primera colmena cuando se cargan
  useEffect(() => {
    if (hives.length > 0 && !selectedId) {
      setSelectedId(hives[0].id);
    }
  }, [hives, selectedId]);

  // Clima en tiempo real basado en la ubicación GPS real del dispositivo
  const apiaryCoords = useMemo(() => {
    const apiary = apiaries.find((a: any) => a.id === apiaryId);
    return apiary?.coordinates ? { lat: apiary.coordinates.lat, lng: apiary.coordinates.lng } : null;
  }, [apiaries, apiaryId]);

  const {
    weather: realWeather,
    loading: weatherLoading,
    error: weatherError,
    lastUpdated: weatherLastUpdated,
    usingCache: weatherUsingCache,
    retry: retryWeather,
  } = useWeather(user?.uid, apiaryId, apiaryCoords);

  useEffect(() => {
    if (realWeather) {
      setTemp(realWeather.current.temperature);
      setWind(realWeather.current.windSpeed);
    }
  }, [realWeather]);

  const activity = Math.min(98, Math.max(5, Math.round(20 + ((temp ?? 15) - 15) * 8 - (wind ?? 8) * 1.4)));
  const selectedHive = hives.find((h) => h.id === selectedId);
  const nextHiveCode = getNextHiveCode(hives);
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
    setQueens(prev => prev.filter(q => q.hiveId !== id));
    setQueenHistory(prev => prev.filter(h => h.hiveId !== id));
    
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
    setQueens(prev => prev.filter(q => q.hiveId !== id));
    setQueenHistory(prev => prev.filter(h => h.hiveId !== id));
    
    if (selectedNucleusId === id) {
      const remainingNuclei = nuclei.filter(n => n.id !== id);
      setSelectedNucleusId(remainingNuclei.length > 0 ? remainingNuclei[0].id : null);
    }
    pushToast("Núcleo eliminado");
  };

  // FUNCIONALIDAD 1: Convertir núcleo en colmena
  const handleConvertNucleus = (nucleus: Hive) => {
    if (!user || !apiaryId) return;
    try {
      const res = convertNucleoToColmena({
        userId: user.uid,
        apiaryId,
        apiaryName,
        nucleusId: nucleus.id,
      });

      setNuclei(prev => prev.filter(n => n.id !== nucleus.id));
      setHives(prev => [...prev, res.newHive]);
      setInspections(prev => prev.map(i => (i.hiveId === nucleus.id ? { ...i, hiveId: res.newHive.id } : i)));
      setQueens(prev => prev.map(q => (q.hiveId === nucleus.id ? { ...q, hiveId: res.newHive.id } : q)));
      setQueenHistory(prev => prev.map(h => (h.hiveId === nucleus.id ? { ...h, hiveId: res.newHive.id } : h)));
      setCuadernoEntries(prev => [res.cuadernoEntry, ...prev]);

      if (selectedNucleusId === nucleus.id) {
        const remainingNuclei = nuclei.filter(n => n.id !== nucleus.id);
        setSelectedNucleusId(remainingNuclei.length > 0 ? remainingNuclei[0].id : null);
      }

      pushToast('Núcleo convertido en colmena', `${res.nucleusCode} → ${res.newHiveCode}`);
      if (!res.hasQueen) {
        pushToast('La nueva colmena no tiene reina registrada', '⚠️ Regístrala pronto');
      }
    } catch (error) {
      console.error('[TRANSFERS] Error al convertir núcleo:', error);
      pushToast('Error al convertir el núcleo', 'error');
    }
  };

  // FUNCIONALIDAD 2 y 3: Transferir núcleo/colmena a otro apiario
  const handleTransfer = (hive: Hive, destApiaryId: string, motivo: string, fecha: string) => {
    if (!user || !apiaryId) return;
    const dest = apiaries.find((a: any) => a.id === destApiaryId);
    if (!dest) {
      pushToast('Apiario de destino no encontrado', 'error');
      return;
    }
    const src = apiaries.find((a: any) => a.id === apiaryId);
    const kind = hive.entityType === 'nucleo' ? 'nucleus' : 'hive';

    try {
      const res = kind === 'hive'
        ? transferHiveToApiary({
          userId: user.uid,
          sourceApiaryId: apiaryId,
          sourceApiaryName: src?.name || apiaryName,
          destApiaryId,
          destApiaryName: dest.name || 'Apiario',
          entityId: hive.id,
          motivo: (motivo || '').trim() || undefined,
          fecha,
        })
        : transferNucleoToApiary({
          userId: user.uid,
          sourceApiaryId: apiaryId,
          sourceApiaryName: src?.name || apiaryName,
          destApiaryId,
          destApiaryName: dest.name || 'Apiario',
          entityId: hive.id,
          motivo: (motivo || '').trim() || undefined,
          fecha,
        });

      if (kind === 'hive') {
        setHives(prev => prev.filter(h => h.id !== hive.id));
        if (selectedId === hive.id) {
          const remaining = hives.filter(h => h.id !== hive.id);
          setSelectedId(remaining.length > 0 ? remaining[0].id : "");
        }
      } else {
        setNuclei(prev => prev.filter(n => n.id !== hive.id));
        if (selectedNucleusId === hive.id) {
          const remaining = nuclei.filter(n => n.id !== hive.id);
          setSelectedNucleusId(remaining.length > 0 ? remaining[0].id : null);
        }
      }

      setInspections(prev => prev.filter(i => i.hiveId !== hive.id));
      setQueens(prev => prev.filter(q => q.hiveId !== hive.id));
      setQueenHistory(prev => prev.filter(h => h.hiveId !== hive.id));
      setCuadernoEntries(prev => [res.cuadernoEntry, ...prev]);

      pushToast('Transferencia completada', `${res.code} → ${dest.name || 'Apiario'}`);
    } catch (error) {
      console.error('[TRANSFERS] Error al transferir:', error);
      pushToast('Error al transferir', 'error');
    }
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
      fotos: d.photos,
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

  const handleSaveTask = (data: TaskFormData) => {
    console.log('[TASK] handleSaveTask: entrada con datos:', data);
    try {
      const title = data.title.trim();
      if (!title) {
        console.log('[TASK] Validación fallida: el título está vacío');
        pushToast("Error al crear la tarea", "El título es obligatorio");
        return false;
      }
      console.log('[TASK] Validación correcta, creando tarea:', title);

      const newTask: Task = {
        id: uid(),
        title,
        description: data.description?.trim() || undefined,
        dueDate: data.dueDate,
        priority: data.priority,
        tipo: data.tipo,
        recurrencia: data.tipo === 'recurrente' ? data.recurrencia : undefined,
        colmenaId: data.colmenaId || undefined,
        hiveId: data.colmenaId || undefined,
        asignado: data.asignado?.trim() || undefined,
        estado: 'pendiente',
        completed: false,
        createdAt: new Date().toISOString(),
      };

      setTasks(prev => {
        const next = [newTask, ...prev];
        console.log('[TASK] Tarea guardada en estado, total:', next.length);
        return next;
      });

      if (newTask.colmenaId) {
        const colony = allColonies.find(c => c.id === newTask.colmenaId);
        addCuadernoEntry(`📋 Nueva tarea creada para ${colony ? `colmena ${colony.code}` : 'una colmena'}: ${title}`);
      }

      pushToast("Tarea creada", title);
      return true;
    } catch (error) {
      console.error('[TASK] Error al crear la tarea:', error);
      pushToast("Error al crear la tarea", String(error));
      return false;
    }
  };

  // Integración con Calendario: crear/eliminar eventos de cría
  const addCalendarEvent = (eventData: { title: string; date: string; description: string }) => {
    const newEvent: CalendarEvent = {
      id: uid(),
      type: 'task',
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      priority: 'high',
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setEvents(prev => (prev.some(e => e.id === newEvent.id) ? prev : [...prev, newEvent]));
  };

  const deleteCalendarEvent = (pattern: string) => {
    setEvents(prev => prev.filter(e => e.title !== pattern));
  };

  // Campanita de notificaciones
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = () => {
    setActiveSection('calendario');
  };

  // Integración con Cuaderno: registro automático
  const addCuadernoEntry = (text: string) => {
    const entry: CuadernoEntry = {
      id: uid(),
      date: new Date().toISOString(),
      text,
      type: 'breeding',
    };
    setCuadernoEntries(prev => [entry, ...prev]);
  };

  // ============================================
  // REINAS: seguimiento por colmena/núcleo
  // ============================================
  const allColonies = [...hives, ...nuclei];
  const getHiveCode = (hiveId: string) => allColonies.find(h => h.id === hiveId)?.code ?? '';

  const getColonyLabel = (id: string) => {
    const colony = allColonies.find(c => c.id === id);
    return colony ? `${colony.code}${colony.name ? ` · ${colony.name}` : ''}` : '—';
  };

  const getLotLabel = (id: string) => {
    const lot = breedingLots.find(l => l.id === id);
    return lot
      ? `Lote ${id.slice(-6).toUpperCase()} · ${lot.tipo}`
      : `Lote ${id.slice(-6).toUpperCase()}`;
  };

  const handleOpenRegisterQueen = (hive: Hive) => {
    setQueenModal({ open: true, hive, queen: null, mode: 'create' });
  };

  const handleOpenEditQueen = (queen: Queen) => {
    const hive = allColonies.find(h => h.id === queen.hiveId) ?? null;
    setQueenModal({ open: true, hive, queen, mode: 'edit' });
  };

  const handleOpenChangeQueen = (queen: Queen, hive: Hive) => {
    setQueenModal({ open: true, hive, queen, mode: 'change' });
  };

  const handleCloseQueenModal = () => {
    setQueenModal(prev => ({ ...prev, open: false }));
  };

  const handleQueenSubmit = (data: QueenFormData, reason?: QueenChangeReason) => {
    const { queen, mode, hive } = queenModal;
    const now = new Date().toISOString();
    const hiveId = queen?.hiveId || hive?.id;
    if (!hiveId) {
      handleCloseQueenModal();
      return;
    }

    if (mode === 'edit' && queen) {
      setQueens(prev => prev.map(q => q.id === queen.id ? { ...q, ...data } : q));
      pushToast('Reina actualizada', getHiveCode(hiveId));
    } else {
      const newQueen: Queen = {
        id: uid(),
        hiveId,
        ...data,
        estado: 'activa',
        createdAt: now,
      };
      if (mode === 'change' && queen) {
        setQueens(prev => [
          newQueen,
          ...prev.map(q => q.id === queen.id ? ({ ...q, estado: 'cambiada', fechaCambio: now } as Queen) : q),
        ]);
        setQueenHistory(prev => [{
          id: uid(),
          hiveId,
          queenId: newQueen.id,
          fecha: now,
          razon: reason ?? 'recambio',
        }, ...prev]);
        pushToast('Cambio de reina registrado', getHiveCode(hiveId));
      } else {
        setQueens(prev => [newQueen, ...prev]);
        pushToast(mode === 'change' ? 'Cambio de reina registrado' : 'Reina registrada', getHiveCode(hiveId));
      }
    }

    handleCloseQueenModal();
  };

  const handleMarkQueenLost = (queen: Queen, nota: string) => {
    const now = new Date().toISOString();
    setQueens(prev => prev.map(q => q.id === queen.id
      ? { ...q, estado: 'perdida', fechaCambio: now, notas: nota ? nota : q.notas }
      : q
    ));
    setQueenHistory(prev => [{
      id: uid(),
      hiveId: queen.hiveId,
      queenId: queen.id,
      fecha: now,
      razon: 'perdida',
      nota: nota || undefined,
    }, ...prev]);
    pushToast('Reina marcada como perdida', getHiveCode(queen.hiveId));
    setLostQueen(null);
  };

  const handleAssignQueenFromLot = (lotId: string, hiveId: string) => {
    const lot = breedingLots.find(l => l.id === lotId);
    if (!lot) return;
    const now = new Date().toISOString();
    const newQueen: Queen = {
      id: uid(),
      hiveId,
      fechaNacimiento: now.split('T')[0],
      origen: 'lote',
      loteId: lotId,
      colorAño: queenColorForYear(new Date().getFullYear()),
      caracteristicas: [],
      notas: 'Reina asignada desde lote de cría',
      estado: 'activa',
      createdAt: now,
    };
    setQueens(prev => [newQueen, ...prev]);
    pushToast('Reina asignada a colmena', getHiveCode(hiveId));
  };

  // Alertas de cría para el panel principal
  const breedingAlertCount = breedingLots.filter((lot) => {
    if (lot.estado !== 'enRealeras' && lot.estado !== 'enjauladas') return false;
    const days = differenceInDays(new Date(lot.fechaEnjauladoEstimada), new Date());
    return days >= 0 && days <= 1;
  }).length;

  // Colmenas con reinas viejas (> 12 semanas) para el panel principal
  const oldQueenCount = queens.filter(q => q.estado === 'activa' && getQueenAlert(q)?.nivel === 'vieja').length;

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
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllNotificationsAsRead}
        onNotificationClick={handleNotificationClick}
        inventoryAlertsCount={inventoryLowStockCount}
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
                  weather={realWeather ? {
                    temperature: realWeather.current.temperature,
                    wind: realWeather.current.windSpeed,
                    condition: getWeatherDescription(realWeather.current.weatherCode),
                    rainProbability: realWeather.daily[0]?.precipitationProbability ?? 0,
                    weatherCode: realWeather.current.weatherCode,
                    isDay: realWeather.current.isDay,
                  } : undefined}
                  weatherLoading={weatherLoading}
                  weatherError={weatherError}
                  weatherLastUpdated={weatherLastUpdated}
                  weatherUsingCache={weatherUsingCache}
                  onRetryWeather={retryWeather}
                  breedingAlerts={{
                    lotesProximosEnjaulado: breedingAlertCount,
                    onNavigate: () => setActiveSection('cria'),
                  }}
queenAlerts={{
                  reinasViejas: oldQueenCount,
                  onNavigate: () => setActiveSection('colmenas'),
                }}
                inventoryAlerts={inventoryAlerts}
                apiaryName={apiaryName}
                  apiaryLocation={apiaryLocation}
                  onChangeApiary={handleChangeApiary}
                  onCreateApiary={() => setShowCreateApiaryModal(true)}
                  onManageApiaries={() => setShowManageApiariesModal(true)}
                  apiaries={apiaries}
                  currentApiaryId={apiaryId}
                  onSelectApiary={(id) => {
                    if (id) {
                      // Recordar el apiario elegido (clave documentada en FLUJO-COMPLEMENTO.md)
                      saveLastActiveApiaryId(id, user?.uid);
                      navigate(`/dashboard/${id}`);
                    } else {
                      navigate('/dashboard');
                    }
                  }}
                  reminders={reminders}
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
                  onUpdateHivePhotos={(id, fotos) => updateHive(id, { fotos })}
                  onUpdateNucleusPhotos={(id, fotos) => updateNucleus(id, { fotos })}
                  inspections={inspections}
                  nextHiveCode={nextHiveCode}
                  queens={queens}
                  queenHistory={queenHistory}
                  onRegisterQueen={handleOpenRegisterQueen}
                  onEditQueen={handleOpenEditQueen}
                  onChangeQueen={handleOpenChangeQueen}
                  onMarkQueenLost={setLostQueen}
                  breedingLots={breedingLots}
                  onShowQueenLot={(loteId) => {
                    setCriaFocusLotId(loteId);
                    setActiveSection('cria');
                  }}
                  apiaries={apiaries}
                  currentApiaryId={apiaryId}
                  onConvertNucleus={handleConvertNucleus}
                  onTransfer={handleTransfer}
                />
              </motion.section>
            )}

            {activeSection === 'cria' && (
              <motion.section
                key="cria"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BreedingSection
                  hives={hives}
                  nuclei={nuclei}
                  breedingLots={breedingLots}
                  onUpdateLots={setBreedingLots}
                  onAddCalendarEvent={addCalendarEvent}
                  onDeleteCalendarEvent={deleteCalendarEvent}
                  onAddCuadernoEntry={addCuadernoEntry}
                  onShowToast={pushToast}
                  queens={queens}
                  focusLotId={criaFocusLotId}
                  onConsumeFocusLot={() => setCriaFocusLotId(null)}
                  onAssignQueenFromLot={handleAssignQueenFromLot}
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
                <StatsSection
                  hives={hives}
                  nuclei={nuclei}
                  inspections={inspections}
                  tasks={tasks}
                  harvests={harvests}
                  breedingLots={breedingLots}
                  storageSuffix={user && apiaryId ? `_${user.uid}_${apiaryId}` : ''}
                />
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
                <CalendarSection
                  hives={hives}
                  events={events}
                  onEventsChange={setEvents}
                  recurringTasks={recurringTasks}
                  onRecurringTasksChange={setRecurringTasks}
                  floweringEntries={floweringEntries}
                  onFloweringEntriesChange={setFloweringEntries}
                  breedingLots={breedingLots}
                  apiaries={apiaries}
                  apiaryName={apiaryName}
                />
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
                <Production hives={hives} suffix={user && apiaryId ? `_${user.uid}_${apiaryId}` : ''} />
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
                <NotebookSection hives={hives} cuadernoEntries={cuadernoEntries} />
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
                <TasksSection tasks={tasks} hives={allColonies} onToggle={toggleTask} onAdd={handleAddTask} onSaveTask={handleSaveTask} onDelete={handleDeleteTask} />
              </motion.section>
            )}

            {activeSection === 'inventario' && (
              <motion.section
                key="inventario"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <InventorySection items={inventory} onChange={setInventory} onShowToast={pushToast} />
              </motion.section>
            )}

            {activeSection === 'transferencias' && (
              <motion.section
                key="transferencias"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SectionHead
                  kicker="Movimientos entre apiarios y promociones"
                  title="Historial de Transferencias"
                  right={<p className="font-mono text-xs text-husk">registros automáticos</p>}
                />
                <TransferHistorySection userId={user?.uid || ''} apiaries={apiaries} onShowToast={pushToast} />
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

      {/* Modal de reina: registrar / editar / cambiar */}
      <AnimatePresence>
        {queenModal.open && (
          <QueenForm
            open={queenModal.open}
            hive={queenModal.hive}
            queen={queenModal.queen}
            mode={queenModal.mode}
            breedingLots={breedingLots}
            getLotLabel={getLotLabel}
            onClose={handleCloseQueenModal}
            onSubmit={handleQueenSubmit}
          />
        )}
      </AnimatePresence>

      {/* Modal: marcar reina como perdida */}
      <AnimatePresence>
        {lostQueen && (
          <QueenLostModal
            queen={lostQueen}
            getColonyLabel={getColonyLabel}
            onClose={() => setLostQueen(null)}
            onConfirm={handleMarkQueenLost}
          />
        )}
      </AnimatePresence>

      {/* Modal: crear nuevo apiario desde el dropdown */}
      <CreateApiaryModal
        open={showCreateApiaryModal}
        onClose={() => setShowCreateApiaryModal(false)}
        onCreated={handleApiaryCreated}
      />

      {/* Modal: gestionar apiarios (editar / eliminar) */}
      <ManageApiariesModal
        open={showManageApiariesModal}
        apiaries={apiaries}
        currentApiaryId={apiaryId}
        onClose={() => setShowManageApiariesModal(false)}
        onUpdate={handleUpdateApiary}
        onDelete={handleDeleteApiary}
      />

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
