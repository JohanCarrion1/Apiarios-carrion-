import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { STATUS_COLORS, STATUS_ORDER, type Hive, type Task, type Inspection } from "../types/hive";
import type { InventoryItem } from "../types/inventory";
import { inventoryDisponible } from "../types/inventory";
import { useCountUp, useReveal } from "../hooks";
import { getWeatherEmoji } from "../services/weather";
import RemindersWidget from "./RemindersWidget";
import type { Reminder } from "../types/reminders";

interface DashboardProps {
  hives: Hive[];
  tasks: Task[];
  inspections: Inspection[];
  onNavigate: (section: string) => void;
  onAddHive: () => void;
  onAddInspection: () => void;
  onAddTask: () => void;
  weather?: {
    temperature: number;
    wind: number;
    condition: string;
    rainProbability: number;
    weatherCode?: number;
    isDay?: boolean;
  };
  weatherLoading?: boolean;
  weatherError?: 'denied' | 'error' | null;
  weatherLastUpdated?: number | null;
  weatherUsingCache?: boolean;
  onRetryWeather?: () => void;
  breedingAlerts?: {
    lotesProximosEnjaulado: number;
    onNavigate?: () => void;
  };
  queenAlerts?: {
    reinasViejas: number;
    onNavigate?: () => void;
  };
  inventoryAlerts?: InventoryItem[];
  apiaryName?: string;
  apiaryLocation?: string;
  onChangeApiary?: () => void;
  onCreateApiary?: () => void;
  onManageApiaries?: () => void;
  apiaries?: any[];
  currentApiaryId?: string;
  onSelectApiary?: (id: string) => void;
  reminders?: Reminder[];
}

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

export default function Dashboard({ 
  hives, 
  tasks, 
  inspections, 
  onNavigate, 
  onAddHive, 
  onAddInspection, 
  onAddTask,
  weather,
  weatherLoading = false,
  weatherError = null,
  weatherLastUpdated = null,
  weatherUsingCache = false,
  onRetryWeather,
  breedingAlerts,
  queenAlerts,
  inventoryAlerts = [],
  apiaryName,
  apiaryLocation,
  onChangeApiary,
  onCreateApiary,
  onManageApiaries,
  apiaries = [],
  currentApiaryId = '',
  onSelectApiary = () => {},
  reminders = []
}: DashboardProps) {
  const { ref, inView } = useReveal();
  const [showSummary, setShowSummary] = useState(false);
  const [showApiarySelector, setShowApiarySelector] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelectApiary = (id: string) => {
    if (id === currentApiaryId) return;
    setIsTransitioning(true);
    setTimeout(() => {
      onSelectApiary(id);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 200);
  };
  
  // Cargar cosechas desde localStorage
  const [harvests, setHarvests] = useState<any[]>(() => {
    const saved = localStorage.getItem('panal_harvests');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Calcular estadísticas
  const totalHives = hives.length;
  const healthyHives = hives.filter(h => h.status === 'saludable').length;
  const healthPercentage = totalHives > 0 ? Math.round((healthyHives / totalHives) * 100) : 0;
  const healthAnim = useCountUp(healthPercentage, inView);
  
  // Producción del mes (calculada desde harvests reales)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyProduction = useMemo(() => {
    const monthHarvests = harvests.filter(h => {
      const harvestDate = new Date(h.date);
      return harvestDate.getMonth() === currentMonth && 
             harvestDate.getFullYear() === currentYear;
    });
    
    const total = monthHarvests.reduce((sum, h) => sum + (h.honeyKg || 0), 0);
    console.log('📊 [DASHBOARD] Producción del mes calculada:', total, 'kg de', monthHarvests.length, 'cosechas');
    return total;
  }, [harvests, currentMonth, currentYear]);
  
  // Inspecciones esta semana
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const inspectionsThisWeek = inspections.filter(i => new Date(i.date) >= weekAgo).length;
  
  // Días hasta próxima cosecha (calculado desde harvests reales)
  const daysUntilHarvest = useMemo(() => {
    const futureHarvests = harvests
      .filter(h => new Date(h.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (futureHarvests.length === 0) return null;
    
    const nextHarvest = new Date(futureHarvests[0].date);
    const days = Math.ceil((nextHarvest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  }, [harvests]);
  
  // Alertas importantes
  const alerts = hives
    .filter(h => h.status === 'alerta' || h.status === 'sin_reina')
    .map(h => {
      const daysSinceInspection = Math.floor((now.getTime() - new Date(h.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      return {
        hive: h,
        message: h.status === 'sin_reina' 
          ? `Sin reina detectada hace ${daysSinceInspection} días`
          : `Nivel de varroa alto`,
        severity: h.status === 'sin_reina' ? 'warning' : 'danger'
      };
    });
  
  // Actividad reciente - Construir desde datos reales del usuario
  const recentActivity = useMemo(() => {
    const activities: Array<{
      type: 'new_hive' | 'inspection' | 'harvest' | 'task_completed' | 'event';
      date: Date;
      message: string;
      icon: string;
    }> = [];

    // 1. Creación de colmenas
    hives.forEach(h => {
      activities.push({
        type: 'new_hive',
        date: new Date(h.createdAt || h.updatedAt),
        message: `Nueva colmena ${h.code} agregada`,
        icon: '🐝'
      });
    });

    // 2. Inspecciones registradas
    inspections.forEach(i => {
      const hive = hives.find(h => h.id === i.hiveId);
      activities.push({
        type: 'inspection',
        date: new Date(i.date),
        message: `Inspección registrada en ${hive?.code || 'colmena'}`,
        icon: '📝'
      });
    });

    // 3. Cosechas registradas
    harvests.forEach(h => {
      const hive = hives.find(hv => hv.id === h.hiveId);
      activities.push({
        type: 'harvest',
        date: new Date(h.date),
        message: `Cosecha de ${h.honeyKg || 0} kg en ${hive?.code || 'colmena'}`,
        icon: '🍯'
      });
    });

    // 4. Tareas completadas
    tasks.filter(t => t.completed && t.completedAt).forEach(t => {
      if (t.completedAt) {
        activities.push({
          type: 'task_completed',
          date: new Date(t.completedAt),
          message: `Tarea completada: ${t.title}`,
          icon: '✅'
        });
      }
    });

    // Ordenar por fecha más reciente y limitar a 8 entradas
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8);
  }, [hives, inspections, harvests, tasks]);
  
  // Próximas tareas (próximos 7 días)
  const upcomingTasks = tasks
    .filter(t => !t.completed && t.dueDate)
    .filter(t => {
      const dueDate = new Date(t.dueDate);
      const diff = dueDate.getTime() - now.getTime();
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);
  
  // Datos para mini gráfico de producción (últimos 6 meses)
  const productionData = [
    { mes: 'Jul', kg: 8.2 },
    { mes: 'Ago', kg: 10.5 },
    { mes: 'Sep', kg: 12.1 },
    { mes: 'Oct', kg: 9.8 },
    { mes: 'Nov', kg: 11.3 },
    { mes: 'Dic', kg: monthlyProduction }
  ];
  
  const formatTimeAgo = (date: Date): string => {
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days === 0) {
      if (hours === 0) return 'Hace menos de 1 hora';
      if (hours === 1) return 'Hace 1 hora';
      return `Hace ${hours} horas`;
    }
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  };
  
  const formatDueDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `En ${days} días`;
  };

  const formatWeatherUpdated = (timestamp: number | null): string => {
    if (!timestamp) return 'actualizado recién';
    const diff = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (diff < 1) return 'actualizado recién';
    if (diff < 60) return `actualizado hace ${diff} min`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `actualizado hace ${hours} h`;
    return `actualizado hace ${Math.floor(hours / 24)} d`;
  };
  
  return (
    <div
      className={`transition-all duration-200 ease-in-out ${
        isTransitioning ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
      }`}
    >
    <motion.div 
      ref={ref}
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header del Dashboard con selector de apiarios */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-display text-3xl font-bold text-cream">
              {apiaryName || 'Panel del Apiario'}
            </h2>
            {apiaryLocation && (
              <p className="text-husk text-sm mt-1">{apiaryLocation}</p>
            )}
          </div>
          
          {/* Selector de apiarios con ícono de tres líneas */}
          <div className="relative">
            <motion.button
              onClick={() => setShowApiarySelector(!showApiarySelector)}
              className="flex items-center gap-2 rounded-lg bg-honey/10 hover:bg-honey/20 px-3 py-2 text-honey transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Cambiar de apiario"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>

            {/* Dropdown de apiarios */}
            {showApiarySelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-80 card p-4 z-50 max-h-96 overflow-y-auto max-w-[calc(100vw-1.5rem)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  {/* Lista de apiarios */}
                  {apiaries.length === 0 ? (
                    <p className="text-husk text-sm text-center py-4">No hay apiarios registrados</p>
                  ) : (
                    apiaries.map((apiary) => (
                      <motion.button
                        key={apiary.id}
                        onClick={() => {
                          handleSelectApiary(apiary.id);
                          setShowApiarySelector(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          apiary.id === currentApiaryId
                            ? 'bg-honey/20 border-2 border-honey'
                            : 'bg-ink/50 border border-line hover:border-honey/50'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-cream text-sm">
                              {apiary.name || 'Sin nombre'}
                            </p>
                            {apiary.location && (
                              <p className="text-husk text-xs mt-1">{apiary.location}</p>
                            )}
                          </div>
                          {apiary.id === currentApiaryId && (
                            <svg className="w-5 h-5 text-honey flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </motion.button>
                    ))
                  )}

{/* Opción para gestionar apiarios */}
                  <motion.button
                    onClick={() => {
                      setShowApiarySelector(false);
                      if (onManageApiaries) {
                        onManageApiaries();
                      } else if (onChangeApiary) {
                        onChangeApiary();
                      }
                    }}
                    className="w-full text-left p-3 rounded-lg bg-honey/10 border border-honey/30 hover:bg-honey/20 transition-all mt-3"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-honey text-sm font-semibold">Gestionar mis apiarios</span>
                    </div>
                  </motion.button>

                  {/* Opción para crear un nuevo apiario */}
                  <motion.button
                    onClick={() => {
                      setShowApiarySelector(false);
                      if (onCreateApiary) {
                        onCreateApiary();
                      }
                    }}
                    className="w-full text-left p-3 rounded-lg bg-honey/60 border border-honey text-ink hover:bg-honey/70 transition-all mt-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-semibold">+ Crear nuevo apiario</span>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen del Apiario (Modal) */}
      {showSummary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSummary(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="card max-w-4xl w-full max-h-[90vh] p-6 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del resumen con botón X */}
            <div className="flex items-start justify-between mb-6 flex-shrink-0">
              <div>
                <h2 className="font-display text-3xl font-bold text-cream">
                  Resumen del Apiario
                </h2>
                {apiaryName && (
                  <p className="text-husk text-lg mt-1">{apiaryName}</p>
                )}
                {apiaryLocation && (
                  <p className="text-husk text-sm mt-1">{apiaryLocation}</p>
                )}
              </div>
              <div className="flex gap-2">
                {onChangeApiary && (
                  <motion.button
                    onClick={() => {
                      setShowSummary(false);
                      onChangeApiary();
                    }}
                    className="px-4 py-2 rounded-xl bg-honey/10 hover:bg-honey/20 text-honey text-sm font-semibold transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cambiar de apiario
                  </motion.button>
                )}
                <motion.button
                  onClick={() => setShowSummary(false)}
                  className="p-2 rounded-xl bg-ink/50 hover:bg-ink/70 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Cerrar resumen"
                >
                  <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto">

            {/* Estadísticas del resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="card p-6">
                <p className="text-husk text-sm mb-1">Total de colmenas</p>
                <p className="font-display text-3xl font-bold text-cream">{hives.length}</p>
              </div>
              <div className="card p-6">
                <p className="text-husk text-sm mb-1">Colmenas saludables</p>
                <p className="font-display text-3xl font-bold text-sage">
                  {hives.filter(h => h.status === 'saludable').length}
                </p>
              </div>
              <div className="card p-6">
                <p className="text-husk text-sm mb-1">Requieren atención</p>
                <p className="font-display text-3xl font-bold text-coral">
                  {hives.filter(h => h.status === 'alerta' || h.status === 'sin_reina').length}
                </p>
              </div>
            </div>

            {/* Lista de colmenas del resumen */}
            <div>
              <h3 className="font-display text-2xl font-bold text-cream mb-4">
                Colmenas del Apiario
              </h3>
              {hives.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-husk">No hay colmenas registradas en este apiario</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hives.map((hive) => (
                    <div key={hive.id} className="card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-display text-lg font-bold text-cream">
                            {hive.code}
                          </h4>
                          {hive.name && (
                            <p className="text-husk text-sm">{hive.name}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          hive.status === 'saludable' ? 'bg-sage/20 text-sage' :
                          hive.status === 'revision' ? 'bg-honey/20 text-honey' :
                          hive.status === 'alerta' ? 'bg-coral/20 text-coral' :
                          'bg-mauve/20 text-mauve'
                        }`}>
                          {hive.status === 'saludable' ? 'Saludable' :
                           hive.status === 'revision' ? 'Revisión' :
                           hive.status === 'alerta' ? 'Alerta' :
                           'Sin reina'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 1. RESUMEN RÁPIDO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card delay={0} className="col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Colmenas Activas</p>
              <p className="font-display text-4xl font-black text-cream">{totalHives}</p>
              <p className="text-xs text-husk mt-1">
                {healthyHives} saludables
              </p>
            </div>
            <div className="text-4xl">🐝</div>
          </div>
        </Card>
        
        <Card delay={0.1} className="col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Producción del Mes</p>
              <p className="font-display text-4xl font-black text-honey">{monthlyProduction}</p>
              <p className="text-xs text-husk mt-1">kg de miel</p>
            </div>
            <div className="text-4xl">🍯</div>
          </div>
        </Card>
        
        <Card delay={0.2} className="col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Inspecciones</p>
              <p className="font-display text-4xl font-black text-cream">{inspectionsThisWeek}</p>
              <p className="text-xs text-husk mt-1">esta semana</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </Card>
        
        <Card delay={0.3} className="col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Próxima Cosecha</p>
              <p className="font-display text-4xl font-black text-cream">{daysUntilHarvest}</p>
              <p className="text-xs text-husk mt-1">días</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </Card>
      </div>
      
      {/* 2. ALERTAS IMPORTANTES */}
      <Card delay={0.4}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold text-cream">Alertas Importantes</h3>
          {(alerts.length > 0 || (breedingAlerts?.lotesProximosEnjaulado ?? 0) > 0 || (queenAlerts?.reinasViejas ?? 0) > 0) && (
            <span className="px-3 py-1 rounded-full bg-coral/20 text-coral text-xs font-semibold">
              {(breedingAlerts?.lotesProximosEnjaulado ?? 0) + alerts.length + (queenAlerts?.reinasViejas ?? 0)} {(alerts.length + (breedingAlerts?.lotesProximosEnjaulado ?? 0) + (queenAlerts?.reinasViejas ?? 0)) === 1 ? 'alerta' : 'alertas'}
            </span>
          )}
        </div>

        {queenAlerts && queenAlerts.reinasViejas > 0 && (
          <motion.button
            onClick={() => queenAlerts.onNavigate && queenAlerts.onNavigate()}
            className="w-full text-left p-4 rounded-lg border border-coral/40 bg-coral/10 hover:bg-coral/20 transition-all mb-3"
            whileHover={{ x: 4 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">👑</span>
              <div className="flex-1">
                <p className="font-semibold text-cream mb-1">
                  {queenAlerts.reinasViejas} {queenAlerts.reinasViejas === 1 ? 'colmena con reina vieja' : 'colmenas con reinas viejas'}
                </p>
                <p className="text-sm text-husk">Considera programar un recambio de reina</p>
              </div>
              <svg className="w-5 h-5 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        )}

        {breedingAlerts && breedingAlerts.lotesProximosEnjaulado > 0 && (
          <motion.button
            onClick={() => breedingAlerts.onNavigate && breedingAlerts.onNavigate()}
            className="w-full text-left p-4 rounded-lg border border-honey/40 bg-honey/10 hover:bg-honey/20 transition-all mb-3"
            whileHover={{ x: 4 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">👑</span>
              <div className="flex-1">
                <p className="font-semibold text-cream mb-1">
                  {breedingAlerts.lotesProximosEnjaulado} {breedingAlerts.lotesProximosEnjaulado === 1 ? 'lote próximo' : 'lotes próximos'} a enjaulado
                </p>
                <p className="text-sm text-husk">Revisa la pestaña Cría para más detalles</p>
              </div>
              <svg className="w-5 h-5 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        )}
        
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-husk">Todas las colmenas en buen estado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <motion.button
                key={alert.hive.id}
                onClick={() => {
                  onNavigate('colmenas');
                  // Aquí se podría seleccionar la colmena específica
                }}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  alert.severity === 'danger'
                    ? 'bg-coral/10 border-coral/30 hover:bg-coral/20'
                    : 'bg-honey/10 border-honey/30 hover:bg-honey/20'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {alert.severity === 'danger' ? '🔴' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-cream mb-1">
                      Colmena {alert.hive.code}
                    </p>
                    <p className="text-sm text-husk">
                      {alert.message}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-husk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </Card>

      {/* 2b. INVENTARIO - ALERTAS */}
      {inventoryAlerts.length > 0 && (
        <Card delay={0.45}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-cream">Inventario - Alertas</h3>
            <button
              onClick={() => onNavigate('inventario')}
              className="text-xs text-honey hover:text-honeysoft transition-colors"
            >
              Ver inventario →
            </button>
          </div>
          <div className="space-y-3">
            {inventoryAlerts.map((item, index) => {
              const disp = inventoryDisponible(item);
              const ratio = item.cantidadTotal > 0 ? Math.min(1, Math.max(0, disp / item.cantidadTotal)) : 0;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onNavigate('inventario')}
                  className="w-full text-left p-4 rounded-lg border border-coral/30 bg-coral/5 hover:bg-coral/10 transition-all"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.08 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">📦</span>
                      <p className="text-sm font-semibold text-cream truncate">{item.nombre}</p>
                    </div>
                    <p className="font-display text-lg font-black text-coral">{disp} <span className="text-[10px] font-mono text-husk">{item.unidad}</span></p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink">
                    <div className="h-full rounded-full bg-coral" style={{ width: `${ratio * 100}%` }} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Card>
      )}
      
      {/* Grid de 2 columnas para las siguientes secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. ACTIVIDAD RECIENTE */}
        <Card delay={0.6}>
          <h3 className="font-display text-xl font-bold text-cream mb-4">Actividad Reciente</h3>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-husk mb-2">Aún no hay actividad en este apiario</p>
              <p className="text-xs text-husk/70">Registra tu primera colmena o inspección para ver actividad aquí</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-3 pb-4 border-b border-line last:border-0 last:pb-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm text-cream mb-1">{activity.message}</p>
                    <p className="text-xs text-husk">{formatTimeAgo(activity.date)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
        
        {/* 4. PRÓXIMAS TAREAS */}
        <Card delay={0.7}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-cream">Próximas Tareas</h3>
            <button
              onClick={() => onNavigate('tareas')}
              className="text-xs text-honey hover:text-honeysoft transition-colors"
            >
              Ver todas →
            </button>
          </div>
          
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-husk">No hay tareas programadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  className="p-3 rounded-lg bg-ink/50 border border-line hover:border-honey/30 transition-all cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📅</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-cream mb-1">{task.title}</p>
                      <p className="text-xs text-honey">{formatDueDate(task.dueDate)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
      
      {/* 4b. PRÓXIMOS RECORDATORIOS */}
      <Card delay={0.85}>
        <RemindersWidget
          reminders={reminders}
          limit={5}
          onNavigate={() => onNavigate('calendario')}
        />
      </Card>
      
      {/* 5. ACCESOS RÁPIDOS */}
      <Card delay={0.9}>
        <h3 className="font-display text-xl font-bold text-cream mb-4">Accesos Rápidos</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.button
            onClick={onAddHive}
            className="p-6 rounded-xl bg-honey/10 border-2 border-honey/30 hover:bg-honey/20 hover:border-honey/50 transition-all text-center"
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-4xl mb-2">➕</div>
            <p className="text-sm font-semibold text-cream">Nueva Colmena</p>
          </motion.button>
          
          <motion.button
            onClick={onAddInspection}
            className="p-6 rounded-xl bg-honey/10 border-2 border-honey/30 hover:bg-honey/20 hover:border-honey/50 transition-all text-center"
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-4xl mb-2">📝</div>
            <p className="text-sm font-semibold text-cream">Registrar Inspección</p>
          </motion.button>
          
          <motion.button
            onClick={() => onNavigate('produccion')}
            className="p-6 rounded-xl bg-honey/10 border-2 border-honey/30 hover:bg-honey/20 hover:border-honey/50 transition-all text-center"
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-4xl mb-2">🍯</div>
            <p className="text-sm font-semibold text-cream">Registrar Cosecha</p>
          </motion.button>
          
          <motion.button
            onClick={onAddTask}
            className="p-6 rounded-xl bg-honey/10 border-2 border-honey/30 hover:bg-honey/20 hover:border-honey/50 transition-all text-center"
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-4xl mb-2">📅</div>
            <p className="text-sm font-semibold text-cream">Agregar Tarea</p>
          </motion.button>
        </div>
      </Card>
      
      {/* Grid de 2 columnas para gráfico y clima */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6. MINI GRÁFICO DE PRODUCCIÓN */}
        <Card delay={1.0}>
          <h3 className="font-display text-xl font-bold text-cream mb-4">Producción Últimos 6 Meses</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionData}>
                <XAxis dataKey="mes" stroke="#a3906a" style={{ fontSize: '12px' }} />
                <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1b140c', 
                    border: '1px solid #392c19',
                    borderRadius: '8px',
                    color: '#f3e9d4'
                  }}
                />
                <Bar dataKey="kg" fill="#f0a41c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* 7. CLIMA DEL APIARIO */}
        <Card delay={1.1}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-cream">Clima del Apiario</h3>
            {weatherLastUpdated && !weatherLoading && (
              <span className="text-[10px] font-mono text-husk">{formatWeatherUpdated(weatherLastUpdated)}</span>
            )}
            {weatherLoading && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-husk">
                <svg className="w-3 h-3 animate-spin text-honey" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                actualizando...
              </span>
            )}
          </div>
          
          {weatherLoading && !weather ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-4 border-honey/20 border-t-honey rounded-full animate-spin" />
              <p className="text-xs text-husk">Obteniendo clima para tu ubicación...</p>
            </div>
          ) : weatherError === 'denied' && !weather ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📍</div>
              <p className="text-husk mb-3">Activa la ubicación para ver el clima real</p>
              <motion.button
                onClick={onRetryWeather}
                className="px-4 py-2 rounded-xl bg-honey/10 hover:bg-honey/20 text-honey text-sm font-semibold transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Reintentar
              </motion.button>
            </div>
          ) : weatherError === 'error' && !weather ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">⚠️</div>
              <p className="text-husk mb-3">No se pudo cargar el clima</p>
              <motion.button
                onClick={onRetryWeather}
                className="px-4 py-2 rounded-xl bg-honey/10 hover:bg-honey/20 text-honey text-sm font-semibold transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Reintentar
              </motion.button>
            </div>
          ) : weather ? (
            <div className="space-y-4">
              {weatherError && (
                <div className="flex items-center gap-2 text-coral/90 text-xs">
                  <span>⚠️</span>
                  <span>Mostrando último dato guardado</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-5xl font-black text-cream">{weather.temperature}°C</p>
                  <p className="text-sm text-husk mt-1">{weather.condition}</p>
                </div>
                <div className="text-6xl">
                  {weather.weatherCode !== undefined ? getWeatherEmoji(weather.weatherCode) :
                   weather.condition.toLowerCase().includes('sol') ? '☀️' :
                   weather.condition.toLowerCase().includes('nublado') ? '☁️' :
                   weather.condition.toLowerCase().includes('lluvia') ? '🌧️' : '⛅'}
                </div>
              </div>
              
              <div className="pt-4 border-t border-line">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💧</span>
                  <div>
                    <p className="text-xs text-husk">Probabilidad de lluvia</p>
                    <p className="text-lg font-semibold text-cream">{weather.rainProbability}%</p>
                  </div>
                </div>
              </div>
              
              {weather.wind !== undefined && (
                <div className="pt-4 border-t border-line">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💨</span>
                    <div>
                      <p className="text-xs text-husk">Viento</p>
                      <p className="text-lg font-semibold text-cream">
                        {weather.wind} <span className="text-sm font-normal text-husk">km/h</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🌤️</div>
              <p className="text-husk">Datos climáticos no disponibles</p>
              <p className="text-xs text-husk mt-2">Activa la ubicación para ver el clima real</p>
            </div>
          )}
        </Card>
      </div>
      
      {/* 8. ESTADO DEL COLMENAR (mantener el original) */}
      <Card delay={1.2}>
        <motion.p className="tick-label" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.3 }}>
          Estado General del Colmenar
        </motion.p>
        
        <motion.div className="mt-3 flex items-end gap-3" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4, type: "spring", stiffness: 200 }}>
          <span className="font-display text-6xl font-black leading-none text-cream sm:text-7xl">{healthAnim}</span>
          <span className="font-display text-3xl font-bold text-honey">%</span>
          <span className="pb-1.5 text-sm text-husk">de colmenas en forma</span>
        </motion.div>
        
        <motion.div className="mt-5 flex h-3 overflow-hidden rounded-full border border-line bg-ink" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.5, duration: 0.8 }} style={{ transformOrigin: 'left' }}>
          {STATUS_ORDER.map((s, index) => {
            const count = hives.filter(h => h.status === s).length;
            const percentage = totalHives > 0 ? (count / totalHives) * 100 : 0;
            return percentage > 0 && (
              <motion.div
                key={s}
                className="h-full"
                style={{ width: `${percentage}%`, background: STATUS_COLORS[s] }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.5 + index * 0.1, duration: 0.8 }}
              />
            );
          })}
        </motion.div>
        
        <motion.div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
          {STATUS_ORDER.map((s, index) => {
            const count = hives.filter(h => h.status === s).length;
            return (
              <motion.div key={s} className="flex items-center gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 + index * 0.1 }}>
                <span className="h-3 w-3 rounded-[3px]" style={{ background: STATUS_COLORS[s] }} />
                <span className="text-xs text-husk">
                  {s === 'saludable' ? 'Saludable' : s === 'revision' ? 'Revisión' : s === 'alerta' ? 'Alerta' : 'Sin reina'}
                </span>
                <span className="ml-auto font-mono text-sm font-bold text-cream">{count}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </Card>
    </motion.div>
    </div>
  );
}
