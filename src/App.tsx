import { useCallback, useEffect, useState, useMemo, useRef, lazy, startTransition, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { toastVariants, sectionVariants } from "./lib/motion";
import {
  uid,
  type Toast,
} from "./data";
import { useClock, useReveal, useWeather } from "./hooks";
import { getWeatherDescription } from "./services/weather";
import { loadHives, saveHives, loadNuclei, saveNuclei, loadInspections, saveInspections, loadTasks, saveTasks, loadHarvests, saveHarvests, loadEvents, saveEvents, loadBreedingLots, saveBreedingLots, loadCuadernoEntries, saveCuadernoEntries, loadQueens, saveQueens, loadQueenHistory, saveQueenHistory, loadInventory, saveInventory, loadApiaries, saveLastActiveApiaryId, loadLastActiveApiaryId, onDataRestored, loadFecundadores, saveFecundadores, loadLastView, saveLastView } from './utils/storage';
import { updateColonyStatus, onFirestoreHydrated } from './services/firestoreSync';
import { formatHour } from './utils/formatTime';
import { saveDashboardUltimaVista, loadDashboardUltimaVista, loadUltimaVista, saveUltimaVista } from './utils/lastView';
import type { Queen, QueenChange, QueenChangeReason } from './types/queen';
import { getQueenAlert, queenColorForYear } from './types/queen';
import type { InventoryItem } from './types/inventory';
import { formatInventoryQuantity, inventoryDisponible, isStockBajo } from './types/inventory';
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
import Production from "./components/Production";
import NotebookSection from "./components/NotebookSection";
import SelectionScreen from "./components/SelectionScreen";
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
import GlobalToasts from "./components/GlobalToasts";
import PedidoNotifier from "./components/PedidoNotifier";
import CookieBanner from "./components/CookieBanner";
import Privacidad from "./pages/privacidad";
import CookiesPage from "./pages/cookies";
import Terminos from "./pages/terminos";
import DataHydrationGate from "./components/DataHydrationGate";
import LoadingHint from "./components/LoadingHint";
import RouteFade from "./components/RouteFade";
import AppLogo from "./components/AppLogo";
import UserWelcomeModal from "./components/UserWelcomeModal";
import { useAdminList, isEmailAdmin } from "./lib/adminAccess";
import { useProfile, profileNeedsOnboarding } from "./services/profileService";
import type { Hive, HiveStatus, Inspection, Task, Equipamiento } from "./types/hive";
import { HIVE_STATUS_LABELS } from "./types/hive";
import type { CalendarEvent, EventTemplate, Notification } from "./types/calendar";
import type { RecurringTask, FloweringEntry } from "./types/reminders";
import { computeReminders } from "./utils/reminders";
import {
  migrateLegacyCalendarScope,
  loadRecurringTasks,
  saveRecurringTasks,
  loadFloweringEntries,
  saveFloweringEntries,
  loadEventTemplates,
  saveEventTemplates,
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
import PolinizacionSection from "./components/PolinizacionSection";
import { convertNucleoToColmena, transferHiveToApiary, transferNucleoToApiary, transferFecundadorToApiary, getNextHiveCode, getNextNucleoCode, addTransferRecord } from "./services/transfers";
import { usePolinizacion } from "./lib/polinizacionService";
import { sortByEntityCode } from "./utils/entityCode";
import { isStoragePhotoId } from "./services/inspectionPhotos";
import type { BreedingLot, CuadernoEntry } from "./types/breeding";
import type { Fecundador } from "./types/fecundador";
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
  { id: "polinizacion", label: "Polinización", icon: IconFlower },
] as const;

type ViewSection = (typeof NAV)[number]['id'];
const VIEW_SECTIONS: readonly string[] = NAV.map((n) => n.id);
const isViewSection = (v: string | null | undefined): v is ViewSection =>
  !!v && VIEW_SECTIONS.includes(v);

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

/* ---------- carga diferida por sección (React.lazy) ----------
   Antes todos estos módulos entraban en el chunk principal: entrar a la app
   descargaba el catálogo, el panel de pedidos, el generador de PDF del
   catálogo y el dashboard entero aunque el usuario solo quisiera ver el menú
   de selección. Ahora cada sección baja su código cuando se navega a ella y
   mientras tanto se pinta su skeleton.

   SelectionScreen NO es lazy a propósito: es la pantalla de entrada y meterla
   detrás de un Suspense añadiría un waterfall justo en la ruta que se quiere
   hacer inmediata.

   Se usa `lazyWithPreload` y no `lazy` a secas para poder pedir el chunk por
   adelantado (ver PRELOAD_DE_SECCIONES). Con `lazy` pelado no hay forma de
   "calentar" el import sin duplicar la ruta del import, que es justo lo que
   se desincroniza a la primera que alguien edita un path. */
/* `any` en la restricción, no `unknown`: con `ComponentType<unknown>` la
   contravariancia de los parámetros de función hace que TS no pueda inferir T
   desde el default exportado y acaba tipando el componente como sin props. Es
   el idioma estándar para este patrón; el default sí se conserva. */
function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): { Comp: LazyExoticComponent<T>; preload: () => Promise<unknown> } {
  return { Comp: lazy(factory), preload: factory };
}

const dashboardPanel = lazyWithPreload(() => import("./components/Dashboard"));
const hivesSection = lazyWithPreload(() => import("./components/HivesSection"));
const DashboardPanel = dashboardPanel.Comp;
const HivesSection = hivesSection.Comp;

const Store = lazy(() => import("./components/Store"));
const AdminStore = lazy(() => import("./components/AdminStore"));
const Cotizaciones = lazy(() => import("./components/Cotizaciones"));
const Catalogo = lazy(() => import("./components/Catalogo"));
const AdminPedidos = lazy(() => import("./components/AdminPedidos"));

/**
 * Envoltura de Suspense para los chunks lazy.
 *
 * El fallback es `LoadingHint`: un spinner pequeño sobre el mismo `bg-ink` del
 * loader inicial. Antes era un skeleton de bloques grises a pantalla completa;
 * la pausa entre capas hacía que la entrada al dashboard pareciera que atravesaba
 * tres pantallas en lugar de una. El fondo no cambia en todo el recorrido, así
 * que la secuencia logo -> spinner -> contenido se lee como un solo paso.
 */
function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingHint />}>{children}</Suspense>;
}

/**
 * Suspense POR SECCIÓN del dashboard.
 *
 * Existe por un motivo concreto. `Lazy` de arriba solo envuelve rutas
 * completas, así que las secciones lazy del dashboard colgaban del único
 * boundary de la ruta. Al pulsar "Colmenas" desde el menú lateral, ese chunk
 * aún no estaba descargado, la suspensión se propagaba hasta el boundary de la
 * ruta y React sustituía el DASHBOARD ENTERO por el skeleton a pantalla
 * completa: de ahí el error "Component suspended while responding to
 * synchronous input" y el salto de pantalla completa al cambiar de pestaña.
 *
 * Con un boundary por sección solo se suspende la sección que entra; la
 * cabecera, el menú lateral y el resto del dashboard no se desmontan ni se
 * vuelven a pintar.
 *
 * El fallback NO es `min-h-screen bg-black` a propósito: un takeover a negro
 * reintroduciría exactamente el parpadeo negro que se eliminó en el cambio de
 * pestañas. Va acotado a la sección (`fullScreen={false}`) con un spinner
 * pequeño: lo que se pausa es una zona, no la pantalla entera.
 */
function SectionSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingHint fullScreen={false} />}>{children}</Suspense>
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
              {/* reducedMotion="user": hasta ahora solo el CSS honraba
                  `prefers-reduced-motion` (las media queries de index.css).
                  Framer Motion lo ignora por defecto, así que las transiciones
                  JS —cambio de sección del dashboard, modales, drawer, toasts—
                  se seguían reproduciendo con el movimiento reducido activado.
                  Con esto solo se desactiva el.transform; el fade y el
                  escalado se conservan. */}
              <MotionConfig reducedMotion="user">
              <ColdStartRestore />
              <Routes>
                    <Route path="/login" element={<RouteFade><Login /></RouteFade>} />
                    <Route
                        path="/seleccionar"
                        element={
                          <ProtectedRoute>
                            {/* SIN DataHydrationGate a propósito: el menú de
                                selección solo lee localStorage de forma síncrona
                                (loadApiaries) y el perfil del usuario. Antes
                                esperaba aquí la hidratación completa —14
                                entidades x cada apiario, en serie— y por eso
                                /seleccionar era la pantalla más lenta de la
                                app. Sus datos se piden dentro de cada sección. */}
                            <RouteFade><SelectionScreen /></RouteFade>
                          </ProtectedRoute>
                        }
                      />
              {/* Alias tolerante: la pantalla de selección también responde
                  como "/selecciona" (si no, el catch-all lo mandaba a "/"). */}
              <Route path="/selecciona" element={<Navigate to="/seleccionar" replace />} />
              <Route
                path="/tienda"
                element={
                  <ProtectedRoute>
                    <RouteFade><Lazy><Store /></Lazy></RouteFade>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tienda/admin"
                element={
                  <ProtectedRoute>
                    <RouteFade><Lazy><AdminStore /></Lazy></RouteFade>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cotizaciones"
                element={
                  <ProtectedRoute>
                    <RouteFade><Lazy><Cotizaciones /></Lazy></RouteFade>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/catalogo"
                element={
                  <ProtectedRoute>
                    <RouteFade><Lazy><Catalogo /></Lazy></RouteFade>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pedidos"
                element={
                  <ProtectedRoute>
                    <RouteFade><Lazy><AdminPedidos /></Lazy></RouteFade>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apiarios"
                element={
                  <ProtectedRoute>
                    <DataHydrationGate>
                      <RouteFade><ApiariosRedirect /></RouteFade>
                    </DataHydrationGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/apiarios/:id"
                element={
                  <ProtectedRoute>
                    <DataHydrationGate>
                      <RouteFade><ApiariosRedirect /></RouteFade>
                    </DataHydrationGate>
                  </ProtectedRoute>
                }
              />
              {/* El fundido va DENTRO de DataHydrationGate a propósito: si se
                  quedara fuera, animaría el skeleton y la pantalla real
                  aparecería de golpe al terminar la hidratación. Así lo que se
                  desvanece es el contenido definitivo. */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DataHydrationGate>
                      <RouteFade>
                        <Lazy>
                          <DashboardWrapper />
                        </Lazy>
                      </RouteFade>
                    </DataHydrationGate>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/:id"
                element={
                  <ProtectedRoute>
                    <DataHydrationGate>
                      <RouteFade><DashboardWrapper /></RouteFade>
                    </DataHydrationGate>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<ProtectedRoute><RouteFade><HomeRedirect /></RouteFade></ProtectedRoute>} />
              <Route path="/privacidad" element={<RouteFade><Privacidad /></RouteFade>} />
              <Route path="/cookies" element={<RouteFade><CookiesPage /></RouteFade>} />
              <Route path="/terminos" element={<RouteFade><Terminos /></RouteFade>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <InstallPrompt />
            <PWAUpdateToast />
            <CookieBanner />
            <GlobalToasts />
            <PedidoNotifier />
              </MotionConfig>
            </ActiveApiaryProvider>
          </AuthProvider>
        </LanguageProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

/** Destino al que resuelve /dashboard y /dashboard/:id. */
type DashboardTarget =
  | { kind: 'dashboard'; apiaryId: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'onboarding' };

function DashboardWrapper() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Rol vigente (config/admins de Firestore + semilla .env) y perfil users/{uid}.
  // Un usuario NO admin que aún no configuró su apiario ve el modal de
  // bienvenida antes de entrar al dashboard.
  const { status: adminStatus } = useAdminList();
  const isAdminUser = !!user && isEmailAdmin(user.email);
  const { profile, status: profileStatus } = useProfile(user?.uid);
  const needsProfileOnboarding =
    adminStatus !== 'loading' &&
    !isAdminUser &&
    profileStatus === 'ready' &&
    profileNeedsOnboarding(profile);

  // La resolución se calcula DURANTE el render, no en un useEffect: loadApiaries
  // es una lectura síncrona de localStorage, así que el destino siempre está
  // decidido en la primera pintada. Antes vivía en un useEffect sobre un
  // estado `resolved = null`, y ese primer render caía en
  // <LoadingScreen label="Cargando apiario..."> durante un frame entero en
  // CADA entrada al dashboard: era el flash con el logo y el texto que se veía
  // al pulsar "Control de Colmenas". Sin estado de espera, no hay loader.
  const target: DashboardTarget | null = useMemo(() => {
    if (!user) return null;
    const apiaries = loadApiaries(user.uid);

    if (id) {
      const exists = apiaries.find((a: any) => a.id === id);
      if (exists) return { kind: 'dashboard', apiaryId: id };
      if (apiaries.length > 0) return { kind: 'redirect', to: '/dashboard' };
      return { kind: 'onboarding' };
    }

    if (apiaries.length === 0) return { kind: 'onboarding' };

    // Entrar directo al último apiario usado (o al primero si no existe/borrado)
    const lastActiveId = loadLastActiveApiaryId(user.uid);
    const lastApiary = apiaries.find((a: any) => a.id === lastActiveId);
    const apiaryId = lastApiary ? lastApiary.id : apiaries[0].id;
    return { kind: 'redirect', to: `/dashboard/${apiaryId}` };
  }, [user, id]);

  // Efecto colateral aparte: recordar el último apiario abierto. Vive en un
  // useEffect para no escribir en localStorage durante el render.
  useEffect(() => {
    if (target?.kind !== 'redirect' || !user) return;
    const apiaryId = target.to.split('/').pop();
    if (apiaryId) saveLastActiveApiaryId(apiaryId, user.uid);
  }, [target, user]);

  if (!user) return null;

  // Sin frame de espera: `target` ya está resuelto en el primer render.
  if (target === null) return null;

  // Bienvenida de no-admin: configurar el apiario del perfil antes de usar el
  // dashboard (se guarda en users/{uid} y desaparece al confirmarse).
  if (needsProfileOnboarding && target.kind !== 'redirect') {
    return <UserWelcomeModal variant="screen" open />;
  }

  if (target.kind === 'redirect') {
    return <Navigate to={target.to} replace />;
  }

  if (target.kind === 'onboarding') {
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

  return <Dashboard apiaryId={target.apiaryId} />;
}

// La pantalla "Mis Apiarios" deja de ser ruta de entrada: cualquier visita
// manual a /apiarios redirige al dashboard.
function ApiariosRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/dashboard/${id}` : '/dashboard'} replace />;
}

/* ---------- ruteo de inicio ---------- */

// Puerta de entrada tras el login/recarga. Lleva al último lugar que visitó
// el usuario (sistema unificado de última ruta con expiración de 7 días):
// si hay ultima_vista guardada y vigente va directo a ella ('/tienda' o
// '/dashboard[/<apiario>]'); si no existe o expiró, se muestra la pantalla de
// selección (/seleccionar) para que el usuario elija de nuevo.
// Este flujo es IGUAL para admins y no-admins: todos pasan por /seleccionar
// tras el login; la tarjeta "Cotizaciones" se muestra u oculta según el rol.
function HomeRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return; // aún no autenticado
    const last = loadUltimaVista(user.uid);
    const target = last?.vista || '/seleccionar';
    console.log(
      `🧭 [HOMEREDIRECT] user=${user.uid} | ultima_vista=${JSON.stringify(last)} | redirigiendo a → ${target}`
    );
    navigate(target, { replace: true });
  }, [user, navigate]);

  return null;
}

// Sección principal a la que pertenece una ruta ('/' es neutral, '/seleccionar'
// es una sección restaurable: si la app arrancó en otra, se vuelve a la
// pantalla de elección).
const primarySectionOf = (path: string): string | null => {
  if (path === '/') return null;
  if (path === '/seleccionar') return 'seleccionar';
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return 'dashboard';
  if (path === '/tienda' || path.startsWith('/tienda/')) return 'tienda';
  if (path === '/admin/cotizaciones') return 'cotizaciones';
  if (path === '/admin/catalogo') return 'catalogo';
  if (path === '/admin/pedidos') return 'pedidos';
  return null;
};

// Guard GLOBAL de arranque en frío: funciona aunque la app instalada (PWA)
// conserve un start_url viejo (/dashboard) que no se actualiza con el nuevo
// manifest. En el primer render de la pestaña compara la ruta inicial con la
// última vista guardada: si la app abrió en una sección distinta a la que el
// usuario dejó guardada, la restaura. Corre UNA sola vez por pestaña.
function ColdStartRestore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startPath = useRef(window.location.pathname);
  const didRestore = useRef(false);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || didRestore.current) return;
    didRestore.current = true;

    const startSection = primarySectionOf(startPath.current);
    if (!startSection) return; // rutas neutrales (/ , /seleccionar) ya las manejan HomeRedirect/SelectionScreen

    const last = loadUltimaVista(uid);
    if (!last) return;
    const savedSection = primarySectionOf(last.vista);
    if (savedSection && savedSection !== startSection) {
      console.log(
        `🧭 [COLDSTART] App abrió en "${startPath.current}" (${startSection}), ` +
          `ultima_vista="${last.vista}" (${savedSection}) → restaurado a ${last.vista}`
      );
      navigate(last.vista, { replace: true });
    }
  }, [user?.uid, navigate]);

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
  const [fecundadores, setFecundadores] = useState<Fecundador[]>([]);

  // Contratos de polinización (listener en tiempo real por usuario).
  const { contratos: polinizacionContratos } = usePolinizacion(user?.uid);
  const polinizacionCodes = useMemo(
    () => polinizacionContratos.filter((c) => c.estado === 'activo').flatMap((c) => c.colmenasAsignadas || []),
    [polinizacionContratos]
  );

  // Calendario: eventos, tareas recurrentes y floración (compartidos entre secciones)
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventTemplates, setEventTemplates] = useState<EventTemplate[]>([]);
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

  // Se incrementa cuando la hidratación de Firestore termina. Fuerza al efecto
  // de carga a releer la caché local, que la hidratación acaba de sobrescribir
  // con el estado real del backend (si no, el estado en memoria queda viejo y el
  // siguiente cambio del usuario sube ese array obsoleto a Firestore).
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => onFirestoreHydrated(() => setDataRevision((r) => r + 1)), []);

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
  const [activeSection, setActiveSection] = useState<ViewSection>("panel");
  const [showSettingsPage, setShowSettingsPage] = useState(false);

  // Ancla de colmenas/núcleos/fecundadores/inspecciones pedida desde el menú
  // hamburguesa: se cambia a la sección 'colmenas' y ahí se hace scroll.
  const [focusAnchor, setFocusAnchor] = useState<string | null>(null);

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
      pushToast('Error al actualizar el apiario', undefined, 'error');
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
      pushToast('Error al eliminar el apiario', undefined, 'error');
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
      const loadedFecundadores = loadFecundadores(user.uid, apiaryId);
      // El calendario antes se guardaba sin ambito de apiario. Se copia al
      // ambito del apiario activo (no destructivo) antes de leer.
      migrateLegacyCalendarScope(user.uid, apiaryId);
      const loadedEvents = loadEvents(storageKeySuffix);
      const loadedRecurringTasks = loadRecurringTasks(storageKeySuffix);
      const loadedFloweringEntries = loadFloweringEntries(storageKeySuffix);
      const loadedEventTemplates = loadEventTemplates(storageKeySuffix) as EventTemplate[];
      const loadedInventory = loadInventory(user.uid);

      // Migración: colmenas/núcleos viejos sin 'hasQueen' se asumen con reina
      // (salvo las que ya estaban marcadas como SIN REINA). El estado visual se
      // mapea ESTRICTAMENTE a la propiedad `estado` traída del backend, sin
      // reiniciar a ningún valor local por defecto.
      const normalizeHive = (h: Hive): Hive => {
        if (h.hasQueen !== undefined) return h;
        return { ...h, hasQueen: h.status !== 'sin_reina' };
      };
      const migratedHives = (loadedHives as Hive[]).map(normalizeHive);
      const migratedNuclei = (loadedNuclei as Hive[]).map(normalizeHive);

      // Fecundadores: el estado visual se mapea directo de la propiedad
      // `queenState` devuelta por la base de datos. Solo se corrige a un valor
      // válido cuando el dato viene corrupto o vacío (evita errores de render).
      const VALID_QUEEN_STATES: string[] = ['celda_real', 'virgen', 'fecundada', 'en_puesta'];
      const normalizedFecundadores = (loadedFecundadores as Fecundador[]).map(f => ({
        ...f,
        queenState: (VALID_QUEEN_STATES.includes(f.queenState) ? f.queenState : 'celda_real') as Fecundador['queenState'],
        estado: (f.estado === 'activo' || f.estado === 'promovido' ? f.estado : 'activo') as Fecundador['estado'],
      }));
      
      console.log('🟣 [DASHBOARD] Datos cargados:', {
        hives: migratedHives.length,
        nuclei: migratedNuclei.length,
        inspections: loadedInspections.length,
        tasks: loadedTasks.length,
        harvests: loadedHarvestsData.length,
        breedingLots: loadedBreedingLots.length,
        queens: loadedQueens.length,
      });
      
      setHives(migratedHives);
      setNuclei(migratedNuclei);
      setInspections(loadedInspections);
      setTasks(loadedTasks);
      setHarvests(loadedHarvestsData);
      setBreedingLots(loadedBreedingLots);
      setCuadernoEntries(loadedCuadernoEntries);
      setQueens(loadedQueens);
      setQueenHistory(loadedQueenHistory);
      setFecundadores(normalizedFecundadores);
      setEvents(loadedEvents);
      setRecurringTasks(loadedRecurringTasks);
      setFloweringEntries(loadedFloweringEntries);
      setEventTemplates(loadedEventTemplates);
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
      setFecundadores([]);
      setEvents([]);
      setRecurringTasks([]);
      setFloweringEntries([]);
      setEventTemplates([]);
      setInventory([]);
      setLoadedScope(null);
    }
  }, [user, apiaryId, dataRevision]);

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

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveFecundadores(fecundadores, user.uid, apiaryId);
    }
  }, [fecundadores, user, apiaryId, scopeKey, loadedScope]);

  // Guardar inventario (solo por usuario, compartido entre apiarios)
  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      saveInventory(inventory, user.uid);
    }
  }, [inventory, user, scopeKey, loadedScope]);

  // Guardar calendario (eventos, tareas recurrentes, floración, notificaciones)
  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveEvents(events, storageKeySuffix);
    }
  }, [events, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveRecurringTasks(recurringTasks, storageKeySuffix);
    }
  }, [recurringTasks, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveFloweringEntries(floweringEntries, storageKeySuffix);
    }
  }, [floweringEntries, scopeKey, loadedScope]);

  useEffect(() => {
    if (user && apiaryId && scopeKey && loadedScope === scopeKey) {
      const storageKeySuffix = `_${user.uid}_${apiaryId}`;
      saveEventTemplates(eventTemplates, storageKeySuffix);
    }
  }, [eventTemplates, scopeKey, loadedScope]);

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
          description: `${formatInventoryQuantity(disp, i.unidad)} ${i.unidad} restantes`,
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

  const pushToast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
    const t: Toast = { id: uid(), title, desc, type };
    setToasts((prev) => [...prev.slice(-3), t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3600);
  };

  // HiveDetail y HivesSection llaman a onShowToast con la firma
  // (mensaje, 'success' | 'error'). Se les pasa pushToast tal cual, el 'error'
  // acababa en el campo `desc` y TODOS los errores se pintaban en verde con la
  // descripción "error". Este adaptador traduce a la firma de pushToast.
  const pushToastHives = (message: string, type: 'success' | 'error' = 'success') =>
    pushToast(message, undefined, type);

  // Funciones CRUD para colmenas
  const addHive = (hive: Omit<Hive, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newHive: Hive = {
      ...hive,
      id: uid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHives(prev => sortByEntityCode([...prev, newHive]));
    pushToast("Colmena agregada", `${newHive.code} - ${newHive.name || 'Sin nombre'}`);
  };

  const updateHive = (id: string, updates: Partial<Hive>) => {
    setHives(prev => prev.map(h => 
      h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h
    ));
    pushToast("Colmena actualizada");
  };

  // Actualización silenciosa de equipamiento desde la ficha rápida (sin toast repetitivo).
  const updateHiveEquipment = (id: string, equipamiento: Equipamiento) => {
    setHives(prev => prev.map(h =>
      h.id === id ? { ...h, equipamiento, updatedAt: new Date().toISOString() } : h
    ));
  };

  const deleteHive = (id: string) => {
    setHives(prev => prev.filter(h => h.id !== id));
    setInspections(prev => prev.filter(i => i.hiveId !== id));
    setTasks(prev => prev.filter(t => t.hiveId !== id));
    setQueens(prev => prev.filter(q => q.hiveId !== id));
    setQueenHistory(prev => prev.filter(h => h.hiveId !== id));
    
    if (selectedId === id) {
      setSelectedId("");
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
    setNuclei(prev => sortByEntityCode([...prev, newNucleus]));
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
      setSelectedNucleusId(null);
    }
    pushToast("Núcleo eliminado");
  };

  // Sincronizar hasQueen cuando se registra o cambia una reina
  const syncColonyHasQueen = (id: string) => {
    setHives(prev => prev.map(h => h.id === id && (!h.hasQueen || h.status === 'sin_reina')
      ? { ...h, hasQueen: true, status: h.status === 'sin_reina' ? 'saludable' : h.status, updatedAt: new Date().toISOString() }
      : h));
    setNuclei(prev => prev.map(n => n.id === id && (!n.hasQueen || n.status === 'sin_reina')
      ? { ...n, hasQueen: true, status: n.status === 'sin_reina' ? 'saludable' : n.status, updatedAt: new Date().toISOString() }
      : n));
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
      setHives(prev => sortByEntityCode([...prev, res.newHive]));
      setInspections(prev => prev.map(i => (i.hiveId === nucleus.id ? { ...i, hiveId: res.newHive.id } : i)));
      setQueens(prev => prev.map(q => (q.hiveId === nucleus.id ? { ...q, hiveId: res.newHive.id } : q)));
      setQueenHistory(prev => prev.map(h => (h.hiveId === nucleus.id ? { ...h, hiveId: res.newHive.id } : h)));
      setCuadernoEntries(prev => [res.cuadernoEntry, ...prev]);

      if (selectedNucleusId === nucleus.id) {
        setSelectedNucleusId(null);
      }

      pushToast('Núcleo convertido en colmena', `${res.nucleusCode} → ${res.newHiveCode}`);
      if (!res.hasQueen) {
        pushToast('La nueva colmena no tiene reina registrada', '⚠️ Regístrala pronto');
      }
    } catch (error) {
      console.error('[TRANSFERS] Error al convertir núcleo:', error);
      pushToast('Error al convertir el núcleo', undefined, 'error');
    }
  };

  // FECUNDADORES (baby nucs): CRUD
  const addFecundador = (f: Fecundador) => {
    setFecundadores(prev => sortByEntityCode([...prev, f]));
  };

  const updateFecundador = (f: Fecundador) => {
    setFecundadores(prev => prev.map(x => x.id === f.id ? { ...f, updatedAt: new Date().toISOString() } : x));
    // Persistencia directa del estado (queenState) en Firestore, igual que en
    // colmenas/núcleos. Si Firebase rechaza la escritura se muestra el error.
    const uidFec = user?.uid;
    if (uidFec && apiaryId) {
      updateColonyStatus(uidFec, apiaryId, 'fecundadores', f.id, f.queenState, undefined, 'queenState')
        .catch((error: any) => {
          console.error('[FIRESTORE] No se pudo persistir queenState:', error);
          pushToast(
            'Estado de la reina no guardado en la nube',
            error?.code === 'permission-denied'
              ? 'Solo el propietario del fecundador puede guardar su estado.'
              : 'Se guardó solo en este dispositivo. Revisa tu conexión.',
            'error'
          );
        });
    }
  };

  const deleteFecundador = (id: string) => {
    setFecundadores(prev => prev.filter(f => f.id !== id));
  };

  // PROMOCIÓN: fecundador → núcleo (con historial y registro en el cuaderno)
  const handlePromoteFecundador = (fec: Fecundador) => {
    if (!user || !apiaryId) return;
    if (fec.estado !== 'activo' || fec.queenState !== 'en_puesta') {
      pushToast('La reina debe estar en puesta', 'No se puede promover este fecundador');
      return;
    }
    const now = new Date().toISOString();
    const nuevoNucleo: Hive = {
      id: uid(),
      code: getNextNucleoCode(nuclei),
      name: fec.name,
      location: fec.location,
      status: 'saludable',
      hasQueen: true,
      queenInfo: { origin: 'criada', introducedAt: fec.fechaPuesta || now.slice(0, 10) },
      notes: [fec.notes, `Promovido desde fecundador ${fec.code}`].filter(Boolean).join('\n') || undefined,
      entityType: 'nucleo',
      createdAt: now,
      updatedAt: now,
    };

    setNuclei(prev => sortByEntityCode([...prev, nuevoNucleo]));
    setFecundadores(prev => prev.map(f => f.id === fec.id
      ? {
        ...f,
        estado: 'promovido',
        promotion: { nucleoId: nuevoNucleo.id, nucleoCode: nuevoNucleo.code, fecha: now },
        historial: [...f.historial, { id: uid(), fecha: now, tipo: 'promovido', descripcion: `Promovido a núcleo ${nuevoNucleo.code}` }],
        updatedAt: now,
      }
      : f));

    const entry: CuadernoEntry = {
      id: uid(),
      date: now,
      text: `Fecundador ${fec.code} promovido a núcleo ${nuevoNucleo.code}. Reina en puesta desde ${fec.fechaPuesta || 'desconocido'}.`,
      type: 'breeding',
    };
    setCuadernoEntries(prev => [entry, ...prev]);

    try {
      addTransferRecord(user.uid, {
        tipo: 'fecundador_a_nucleo',
        entidadCodigo: fec.code,
        desdeApiarioId: apiaryId,
        hastaApiarioId: apiaryId,
        desdeApiarioNombre: apiaryName || 'Apiario',
        hastaApiarioNombre: apiaryName || 'Apiario',
        fecha: now,
      });
    } catch (error) {
      console.error('[FECUNDADORES] Error al registrar transferencia:', error);
    }

    pushToast('Fecundador promovido a núcleo', `${fec.code} → ${nuevoNucleo.code}`);
  };

  const handleShowFecundadorBreedingLot = (lotId: string) => {
    setCriaFocusLotId(lotId);
    navigateToSection('cria');
  };

  // FUNCIONALIDAD 2 y 3: Transferir núcleo/colmena a otro apiario
  const handleTransfer = (hive: Hive, destApiaryId: string, motivo: string, fecha: string): boolean => {
    if (!user || !apiaryId) {
      pushToast('Error al transferir la colmena', undefined, 'error');
      return false;
    }
    if (!destApiaryId) {
      pushToast('Selecciona un apiario de destino', undefined, 'error');
      return false;
    }
    if (destApiaryId === apiaryId) {
      pushToast('El apiario destino debe ser diferente al actual', undefined, 'error');
      return false;
    }
    if (!fecha || Number.isNaN(new Date(fecha).getTime())) {
      pushToast('La fecha del traslado no es válida', undefined, 'error');
      return false;
    }
    const dest = apiaries.find((a: any) => a.id === destApiaryId);
    if (!dest) {
      pushToast('Apiario de destino no encontrado', undefined, 'error');
      return false;
    }
    const src = apiaries.find((a: any) => a.id === apiaryId);
    const kind = hive.entityType === 'nucleo' ? 'nucleus' : 'hive';
    const motivoFinal = (motivo || '').trim() || 'Sin motivo especificado';

    try {
      const res = kind === 'hive'
        ? transferHiveToApiary({
          userId: user.uid,
          sourceApiaryId: apiaryId,
          sourceApiaryName: src?.name || apiaryName,
          destApiaryId,
          destApiaryName: dest.name || 'Apiario',
          entityId: hive.id,
          motivo: motivoFinal,
          fecha,
        })
        : transferNucleoToApiary({
          userId: user.uid,
          sourceApiaryId: apiaryId,
          sourceApiaryName: src?.name || apiaryName,
          destApiaryId,
          destApiaryName: dest.name || 'Apiario',
          entityId: hive.id,
          motivo: motivoFinal,
          fecha,
        });

      if (kind === 'hive') {
        setHives(prev => prev.filter(h => h.id !== hive.id));
        if (selectedId === hive.id) {
          setSelectedId("");
        }
      } else {
        setNuclei(prev => prev.filter(n => n.id !== hive.id));
        if (selectedNucleusId === hive.id) {
          setSelectedNucleusId(null);
        }
      }

      setInspections(prev => prev.filter(i => i.hiveId !== hive.id));
      setQueens(prev => prev.filter(q => q.hiveId !== hive.id));
      setQueenHistory(prev => prev.filter(h => h.hiveId !== hive.id));
      setCuadernoEntries(prev => [res.cuadernoEntry, ...prev]);

      const entityWord = kind === 'hive' ? 'Colmena' : 'Núcleo';
      const verb = kind === 'hive' ? 'transferida' : 'transferido';
      pushToast(`${entityWord} ${hive.code} ${verb} a ${dest.name || 'Apiario'}`, undefined, 'success');
      return true;
    } catch (error) {
      console.error('[TRANSFERS] Error al transferir:', error);
      pushToast('Error al transferir la colmena', undefined, 'error');
      return false;
    }
  };

  // FUNCIONALIDAD 4: Transferir fecundador (baby nuc) a otro apiario
  const handleTransferFecundador = (fecundador: Fecundador, destApiaryId: string, motivo: string, fecha: string): boolean => {
    if (!user || !apiaryId) {
      pushToast('Error al transferir el fecundador', undefined, 'error');
      return false;
    }
    if (!destApiaryId) {
      pushToast('Selecciona un apiario de destino', undefined, 'error');
      return false;
    }
    if (destApiaryId === apiaryId) {
      pushToast('El apiario destino debe ser diferente al actual', undefined, 'error');
      return false;
    }
    if (!fecha || Number.isNaN(new Date(fecha).getTime())) {
      pushToast('La fecha del traslado no es válida', undefined, 'error');
      return false;
    }
    const dest = apiaries.find((a: any) => a.id === destApiaryId);
    if (!dest) {
      pushToast('Apiario de destino no encontrado', undefined, 'error');
      return false;
    }
    const src = apiaries.find((a: any) => a.id === apiaryId);
    const motivoFinal = (motivo || '').trim() || 'Sin motivo especificado';

    try {
      const res = transferFecundadorToApiary({
        userId: user.uid,
        sourceApiaryId: apiaryId,
        sourceApiaryName: src?.name || apiaryName,
        destApiaryId,
        destApiaryName: dest.name || 'Apiario',
        entityId: fecundador.id,
        motivo: motivoFinal,
        fecha,
      });

      setFecundadores(prev => prev.filter(f => f.id !== fecundador.id));
      setCuadernoEntries(prev => [res.cuadernoEntry, ...prev]);

      pushToast(`Fecundador ${fecundador.code} transferido a ${dest.name || 'Apiario'}`, `${fecundador.code} → ${res.code}`, 'success');
      return true;
    } catch (error) {
      console.error('[TRANSFERS] Error al transferir fecundador:', error);
      pushToast('Error al transferir el fecundador', undefined, 'error');
      return false;
    }
  };

  const handleInspection = (d: InspectionDraft) => {
    // Determinar el ESTADO GENERAL de la colmena/núcleo según la inspección,
    // en orden estricto de prioridad:
    //   1. sin_reina → colonia huérfana (sin reina) marcada.
    //   2. alerta    → varroa >= 3.0%  O  reserva de miel <= 1 cuadro.
    //   3. revisión  → varroa 1.5%–2.9%  O  reina "No vista"  O  temperamento "Nerviosa".
    //   4. saludable → ninguna de las alertas anteriores.
    let status: HiveStatus;
    if (d.orphanColony) {
      status = 'sin_reina';
    } else if (d.varroa >= 3.0 || d.honey <= 1) {
      status = 'alerta';
    } else if ((d.varroa >= 1.5 && d.varroa <= 2.9) || !d.queenSeen || d.calm === 3) {
      status = 'revision';
    } else {
      status = 'saludable';
    }

    let note = d.note;
    if (status === 'sin_reina') {
      // Marcar como huérfana: estado SIN REINA en la colmena/núcleo
      setHives(prev => prev.map(h => h.id === d.hiveId
        ? { ...h, status, hasQueen: false, updatedAt: new Date().toISOString() }
        : h));
      setNuclei(prev => prev.map(n => n.id === d.hiveId
        ? { ...n, status, hasQueen: false, updatedAt: new Date().toISOString() }
        : n));
      if (!note.includes('Colonia huérfana detectada')) {
        note = note.trim() ? `${note}\nColonia huérfana detectada` : 'Colonia huérfana detectada';
      }
    } else {
      setHives(prev => prev.map(h => h.id === d.hiveId
        ? { ...h, status, updatedAt: new Date().toISOString() }
        : h));
      setNuclei(prev => prev.map(n => n.id === d.hiveId
        ? { ...n, status, updatedAt: new Date().toISOString() }
        : n));
    }
    const inspection: Inspection = {
      id: uid(),
      hiveId: d.hiveId,
      date: new Date().toISOString(),
      queenSeen: d.queenSeen,
      brood: d.brood,
      honey: d.honey,
      varroa: d.varroa,
      calm: d.calm,
      note,
      photos: d.photos,
      framesMounted: d.framesMounted,
      framesWorked: d.framesWorked,
      broodPattern: d.broodPattern,
      hasSupers: d.hasSupers,
    };
    setInspections(prev => [inspection, ...prev]);
    setModalHive(null);
    setModalNucleus(null);
    pushToast("Inspección registrada", `${d.hiveId} · ${d.queenSeen ? "reina vista" : "sin ver reina"} · varroa ${d.varroa.toFixed(1)}% · Estado: ${HIVE_STATUS_LABELS[status]}`);

    // Persistencia directa del estado calculado en Firestore (patch del ítem
    // dentro del documento principal de la entidad), para que 'alerta', 'revisión',
    // 'saludable' ... sobreviva a recargas y sea visible desde el backend.
    const statusUid = user?.uid;
    if (statusUid && apiaryId) {
      // Identificar el TIPO del elemento inspeccionado para apuntar a la
      // colección correcta: colmena → hives, núcleo → nuclei.
      const isHive = hives.some(h => h.id === d.hiveId);
      const isNucleus = nuclei.some(n => n.id === d.hiveId);
      const entity = isHive ? 'hives' : isNucleus ? 'nuclei' : null;
      const hasQueen = status === 'sin_reina' ? false : undefined;
      if (entity) {
        updateColonyStatus(statusUid, apiaryId, entity, d.hiveId, status, hasQueen)
          .catch((error: any) => {
            console.error('[FIRESTORE] No se pudo persistir el estado:', error);
            pushToast(
              'Estado no guardado en la nube',
              error?.code === 'permission-denied'
                ? 'Solo el propietario de la colonia puede guardar su estado.'
                : 'Se guardó solo en este dispositivo. Revisa tu conexión.',
              'error'
            );
          });
      }
    }
  };

  const handleInspectNucleus = (id: string) => {
    setModalNucleus(id);
    pushToast("Inspección de núcleo", `${id}`);
  };

  // Eliminar una foto de una inspección concreta (desde el detalle).
  // Con el preset unsigned de Cloudinary no hay forma de destruir el asset desde
  // el navegador (la API de borrado exige firma de servidor), así que aquí solo
  // se retira la referencia del registro: la foto deja de verse en la app. El
  // asset queda huérfano en la carpeta `inspections` del panel de Cloudinary.
  const handleDeleteInspectionPhoto = (inspectionId: string, photoId: string) => {
    setInspections(prev => prev.map(i => {
      if (i.id !== inspectionId) return i;
      if (isStoragePhotoId(photoId)) {
        return { ...i, photos: (i.photos || []).filter(u => u !== photoId) };
      }
      return { ...i, fotos: (i.fotos || []).filter(p => p.id !== photoId) };
    }));
  };

  // Eliminar una inspección completa (registro + fotos que cuelgan de él).
  // El estado es la fuente de la vista y el useEffect de `saveInspections`
  // persiste el cambio, así que la lista y el contador se actualizan al instante.
  const handleDeleteInspection = (inspectionId: string) => {
    const target = inspections.find((i) => i.id === inspectionId);
    if (!target) return;
    setInspections((prev) => prev.filter((i) => i.id !== inspectionId));
    const detalle = [
      target.hiveId,
      new Date(target.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
    ].join(' · ');
    pushToast('Inspección eliminada', detalle);
  };

  const handleAddNucleus = () => {
    setShowAddNucleusModal(true);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
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
    navigateToSection('calendario');
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

    syncColonyHasQueen(hiveId);
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
    syncColonyHasQueen(hiveId);
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

  // Cambio de vista: navega Y persiste la última pestaña activa del usuario
  // en el mismo handler (sin debounce).
  const navigateToSection = (section: ViewSection, anchorId: string | null = null) => {
    // `startTransition` es lo que elimina el error "Component suspended while
    // responding to synchronous input": sin él, el click del menú lateral es una
    // actualización discreta y síncrona, y si la sección de destino es un chunk
    // lazy aún sin descargar React no puede diferir el trabajo: sustituye la
    // pantalla y avisa. Marcándolo como transición, React mantiene la UI actual
    // hasta que el chunk llega y solo entonces revela la sección nueva.
    //
    // El ancla viaja DENTRO de la transición y no en un setState aparte: si se
    // fijara después, la actualización síncrona se aplicaría primero y el
    // setFocusAnchor(null) de la transición se ejecutaría después, borrando el
    // ancla que se acababa de pedir.
    startTransition(() => {
      setActiveSection(section);
      setFocusAnchor(anchorId);
    });
    if (user?.uid) {
      saveLastView(section, user.uid);
      saveDashboardUltimaVista({ section }, user.uid);
    }
  };

  // Precarga de los chunks de las secciones lazy.
  //
  // Suspense y startTransition evitan que la pantalla se congele o se sustituya,
  // pero no evitan que haya que ESPERAR: si el chunk no está, el usuario ve el
  // skeleton de la sección. Descargando los chunks en tiempo ocioso, para cuando
  // llega el click la promesa ya está resuelta, React.lazy devuelve el
  // componente de forma síncrona y no hay suspensión: el cambio de pestaña es
  // instantáneo de verdad.
  //
  // Se hace con el import real (no con un <link rel=prefetch>) porque es el
  // mismo módulo que después acaba ejecutando lazy(): así el chunk queda en la
  // caché del módulo y el import() posterior resuelve al instante.
  useEffect(() => {
    let cancelado = false;
    const precargar = () => {
      if (cancelado) return;
      void Promise.all([dashboardPanel.preload(), hivesSection.preload()]).catch(() => {
        // Si la precarga falla, el flujo normal de React.lazy lo reintenta al
        // navegar. No merece la pena molestar al usuario con un toast aquí.
      });
    };
    // requestIdleCallback para no competir con el render inicial ni con la
    // descarga de datos; setTimeout como respaldo donde no existe.
    const g = globalThis as {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    const usaIdle = typeof g.requestIdleCallback === 'function';
    const id = usaIdle
      ? g.requestIdleCallback!(precargar)
      : (setTimeout(precargar, 1200) as unknown as number);
    return () => {
      cancelado = true;
      if (usaIdle) g.cancelIdleCallback?.(id);
      else clearTimeout(id);
    };
  }, []);

  // Ir a un ancla del dashboard (colmenas, núcleos, fecundadores) desde el menú
  // hamburguesa. Sección y ancla se fijan en la misma transición para no perder
  // el destino: si no estamos en colmenas, el cambio de sección y el ancla viajan
  // juntos; si ya estamos, solo cambia el ancla.
  const goToHiveAnchor = useCallback(
    (anchorId: string) => {
      navigateToSection('colmenas', anchorId);
    },
    [navigateToSection]
  );

  // Restaurar la última vista guardada al resolver la sesión activa (montaje,
  // recarga o cambio de usuario). Prefiere dashboard_ultima_vista y, si no,
  // cae al sistema unificado lastView. NO restaura modales, selección ni scroll.
  //
  // También dentro de una transición: si la vista guardada es una sección lazy
  // cuyo chunk no está, sin esto la suspensión se propagaba al boundary de la
  // ruta y salía el skeleton a pantalla completa al abrir la app.
  useEffect(() => {
    if (!user) return;
    const savedView = loadDashboardUltimaVista(user.uid);
    const saved =
      savedView && isViewSection(savedView.section) ? savedView.section : loadLastView(user.uid);
    startTransition(() => {
      setActiveSection(isViewSection(saved) ? saved : 'panel');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const jumpTo = (id: string) => {
    navigateToSection(id as ViewSection);
  };

  // Callback estable: el efecto de anclas de HivesSection depende de él y, con
  // una lambda nueva en cada render, el temporizador de 320 ms se reiniciaba
  // sin parar y el salto a la subsección nunca llegaba a ejecutarse.
  const consumeAnchor = useCallback(() => setFocusAnchor(null), []);

  // Volver manualmente a la selección de sección (/seleccionar). Se persiste
  // la vista '/seleccionar' (en vez de limpiarla) para que, al cerrar la app
  // estando en la pantalla de elección, ColdStartRestore/HomeRedirect la
  // restauren y el usuario vuelva a elegir, no a /dashboard.
  const returnToSelection = () => {
    saveUltimaVista('/seleccionar', user?.uid);
    navigate('/seleccionar');
  };

  return (
    <div className="relative min-h-screen pb-20 lg:pb-0">
      <Ambient />

      {/* Header Responsive */}
      <ResponsiveHeader 
        onNavigate={jumpTo} 
        onSettings={() => setShowSettingsPage(true)}
        onHome={returnToSelection}
        onChangeSection={returnToSelection}
        onNavigateSubsection={goToHiveAnchor}
        activeSection={activeSection}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllNotificationsAsRead}
        onNotificationClick={handleNotificationClick}
        inventoryAlertsCount={inventoryLowStockCount}
      />

      {/* contenido */}
      <div className="relative z-10">
        {/* `relative` en <main>: con mode="popLayout" la sección que sale se
            saca del flujo con position:absolute y necesita este punto de
            referencia para no quedar descolocada. */}
        <main className="relative mx-auto max-w-6xl space-y-12 sm:space-y-16 md:space-y-20 px-4 pb-10 pt-6 sm:px-6 sm:pt-8 md:pt-10">
          {activeSection === 'panel' && (
            <FadeInUp>
              <IntroHead temp={temp} wind={wind} activity={activity} apiaryName={apiaryName} apiaryLocation={apiaryLocation} />
            </FadeInUp>
          )}

          {/* Cambio de sección del dashboard.

              Sin frames muertos: la sección saliente se desmonta de
              INSTANTÁNEO (sectionVariants.exit, duration 0) y la entrante
              entra a la vez con fade + 8px y curva Apple. Antes la saliente
              tardaba 160ms en irse mientras la entrante aún no había
              montado, y con mode="wait" eso además dejaba <main> sin ninguna
              sección durante el hueco: de ahí el parpadeo negro.

              mode="popLayout" se mantiene como red de seguridad: hoy el exit
              dura 0 y no hay solape real, pero si alguna vez se le da
              duración, popLayout saca la saliente del flujo y evita que la
              página salte de altura en lugar de encajar el hueco. */}
          <AnimatePresence mode="popLayout" initial={false}>
            {activeSection === 'panel' && (
              <motion.section
                key="panel"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <SectionSuspense>
                <DashboardPanel 
                  hives={hives} 
                  tasks={tasks}
                  inspections={inspections}
                  harvests={harvests}
                  onNavigate={(section) => navigateToSection(section as ViewSection)}
                  onAddHive={() => setShowAddHiveModal(true)}
                  onAddInspection={() => setModalHive(selectedId || hives[0]?.id || null)}
                  onAddTask={() => {
                    navigateToSection('tareas');
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
                    onNavigate: () => navigateToSection('cria'),
                  }}
queenAlerts={{
                  reinasViejas: oldQueenCount,
                  onNavigate: () => navigateToSection('colmenas'),
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
                  polinizacionCount={new Set(polinizacionCodes).size}
                  polinizacionCodes={polinizacionCodes}
                />
                </SectionSuspense>
              </motion.section>
            )}

            {activeSection === 'colmenas' && (
              <motion.section
                key="colmenas"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <SectionSuspense>
                <HivesSection
                  hives={hives}
                  nuclei={nuclei}
                  focusAnchor={focusAnchor}
                  polinizacionCodes={polinizacionCodes}
                  onAnchorConsumed={consumeAnchor}
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
                  onShowToast={pushToastHives}
                  onUpdateHivePhotos={(id, fotos) => updateHive(id, { fotos })}
                  onUpdateNucleusPhotos={(id, fotos) => updateNucleus(id, { fotos })}
                  onUpdateEquipment={updateHiveEquipment}
                  onDeleteInspection={handleDeleteInspection}
                  onDeleteInspectionPhoto={handleDeleteInspectionPhoto}
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
                    navigateToSection('cria');
                  }}
                  apiaries={apiaries}
                  currentApiaryId={apiaryId}
                  onConvertNucleus={handleConvertNucleus}
                  onTransfer={handleTransfer}
                  fecundadores={fecundadores}
                  onFecundadorToast={pushToast}
                  onAddFecundadorCuaderno={addCuadernoEntry}
                  onCreateFecundador={addFecundador}
                  onUpdateFecundador={updateFecundador}
                  onDeleteFecundador={deleteFecundador}
                  onPromoteFecundador={handlePromoteFecundador}
                  onShowFecundadorBreedingLot={handleShowFecundadorBreedingLot}
                  onTransferFecundador={handleTransferFecundador}
                />
                </SectionSuspense>
              </motion.section>
            )}

            {activeSection === 'cria' && (
              <motion.section
                key="cria"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
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
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
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
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
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
                  eventTemplates={eventTemplates}
                  onEventTemplatesChange={setEventTemplates}
                  breedingLots={breedingLots}
                  apiaries={apiaries}
                  apiaryName={apiaryName}
                />
              </motion.section>
            )}

            {activeSection === 'produccion' && (
              <motion.section
                key="produccion"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
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
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
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
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <SectionHead
                  kicker="Gestión de pendientes"
                  title="Tareas"
                  right={<p className="font-mono text-xs text-husk">{pending} pendientes</p>}
                />
                <TasksSection tasks={tasks} hives={allColonies} onToggle={toggleTask} onSaveTask={handleSaveTask} onDelete={handleDeleteTask} />
              </motion.section>
            )}

            {activeSection === 'inventario' && (
              <motion.section
                key="inventario"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <InventorySection items={inventory} onChange={setInventory} onShowToast={pushToast} />
              </motion.section>
            )}

            {activeSection === 'transferencias' && (
              <motion.section
                key="transferencias"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <SectionHead
                  kicker="Movimientos entre apiarios y promociones"
                  title="Historial de Transferencias"
                  right={<p className="font-mono text-xs text-husk">registros automáticos</p>}
                />
                <TransferHistorySection userId={user?.uid || ''} apiaries={apiaries} onShowToast={pushToast} />
              </motion.section>
            )}

            {activeSection === 'polinizacion' && (
              <motion.section
                key="polinizacion"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <PolinizacionSection userId={user?.uid || ''} hives={hives} onShowToast={pushToast} />
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
              <AppLogo size="sm" />
              <b className="font-display text-sm tracking-wider text-cream">PANAL</b> — cuaderno apícola digital
            </span>
            <span className="font-mono">
              {apiaryLocation || 'Sin ubicación'}
            </span>
            <span>
              {hives.length} colmenas · {nuclei.length} núcleos · {fecundadores.filter(f => f.estado === 'activo').length} fecundadores
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
        <AnimatePresence>
          {toasts.map((t) => {
            const isError = t.type === 'error';
            return (
              <motion.div
                key={t.id}
                className={`card flex items-start gap-3 p-4 shadow-[0_16px_40px_rgba(0,0,0,.5)] ${isError ? 'border-coral/40' : 'border-honey/40'}`}
                variants={toastVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isError ? 'bg-coral text-cream' : 'bg-honey text-ink'}`}>
                  {isError ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <IconCheck className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isError ? 'text-coral' : 'text-cream'}`}>{t.title}</p>
                  {t.desc && <p className="mt-0.5 truncate font-mono text-[11px] text-husk">{t.desc}</p>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
