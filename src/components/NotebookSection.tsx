import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, isAfter, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import type { Hive } from "../types/hive";
import type { CuadernoEntry } from "../types/breeding";
import { IconClipboard, IconSearch, IconPlus, IconX } from "../ui";
import { loadInspections, saveInspections } from '../utils/storage';
import { formatHour } from '../utils/formatTime';
import PhotoUploader from './PhotoUploader';
import PhotoGallery from './PhotoGallery';
import type { PhotoData } from '../services/photos';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';
import LoadingScreen from './LoadingScreen';

// Estructura REAL de inspección
interface Inspection {
  id: string;
  hiveId: string;
  date: string;
  time: string;
  queenSeen: boolean;
  varroaLevel: number;
  temperature: number;
  beeBehavior: 'tranquila' | 'nerviosa' | 'agresiva';
  population: 'baja' | 'media' | 'alta';
  honeyReserves: number;
  pollenReserves: number;
  weather: string;
  notes: string;
  observations: string;
  photos?: PhotoData[];
  createdAt: string;
  updatedAt: string;
}

// Plantillas de inspección
const INSPECTION_TEMPLATES = [
  {
    id: 'routine',
    name: 'Inspección rutinaria',
    data: {
      queenSeen: true,
      varroaLevel: 2,
      temperature: 35,
      beeBehavior: 'tranquila' as const,
      population: 'media' as const,
      honeyReserves: 5,
      pollenReserves: 5,
      weather: 'Soleado',
      notes: 'Inspección rutinaria',
    }
  },
  {
    id: 'post-treatment',
    name: 'Revisión post-tratamiento',
    data: {
      queenSeen: true,
      varroaLevel: 1,
      temperature: 35,
      beeBehavior: 'tranquila' as const,
      population: 'media' as const,
      honeyReserves: 5,
      pollenReserves: 5,
      weather: 'Soleado',
      notes: 'Revisión después de tratamiento',
    }
  },
  {
    id: 'queen-search',
    name: 'Búsqueda de reina',
    data: {
      queenSeen: false,
      varroaLevel: 0,
      temperature: 35,
      beeBehavior: 'nerviosa' as const,
      population: 'media' as const,
      honeyReserves: 5,
      pollenReserves: 5,
      weather: 'Soleado',
      notes: 'Búsqueda de reina - no encontrada',
    }
  },
];

// Funciones REALES de almacenamiento
const saveInspection = (inspection: Inspection) => {
  const inspections: Inspection[] = loadInspections();
  inspections.push(inspection);
  saveInspections(inspections);
};

const getInspections = (): Inspection[] => {
  return loadInspections();
};

const updateInspection = (id: string, updates: Partial<Inspection>) => {
  const inspections = getInspections();
  const updated = inspections.map(i => 
    i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
  );
  saveInspections(updated);
  return updated;
};

const deleteInspection = (id: string) => {
  const inspections = getInspections();
  const filtered = inspections.filter(i => i.id !== id);
  saveInspections(filtered);
  return filtered;
};

// Validación REAL
const validateInspection = (data: Partial<Inspection>) => {
  const errors: string[] = [];
  
  if (!data.hiveId) errors.push('Seleccione una colmena');
  if (!data.date) errors.push('Ingrese fecha');
  if (data.varroaLevel !== undefined && (data.varroaLevel < 0 || data.varroaLevel > 100)) {
    errors.push('Varroa debe estar entre 0-100%');
  }
  if (data.temperature !== undefined && (data.temperature < -10 || data.temperature > 50)) {
    errors.push('Temperatura debe estar entre -10°C y 50°C');
  }
  
  return { isValid: errors.length === 0, errors };
};

interface Props {
  hives: Hive[];
  cuadernoEntries?: CuadernoEntry[];
}

export default function NotebookSection({ hives, cuadernoEntries = [] }: Props) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [filters, setFilters] = useState({
    hive: 'all',
    queenSeen: 'all',
    varroaLevel: 'all',
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Cargar datos REALES al montar
  useEffect(() => {
    const data = getInspections();
    setInspections(data);
    setLoading(false);
  }, []);

  // Estadísticas REALES
  const stats = useMemo(() => {
    const weekAgo = subDays(new Date(), 7);
    const thisWeek = inspections.filter(i => isAfter(new Date(i.date), weekAgo)).length;
    const queensSeen = inspections.filter(i => i.queenSeen).length;
    const avgVarroa = inspections.length > 0
      ? inspections.reduce((sum, i) => sum + i.varroaLevel, 0) / inspections.length
      : 0;
    const lastInspection = inspections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return {
      total: inspections.length,
      thisWeek,
      queensSeen,
      queenPercentage: inspections.length > 0 ? (queensSeen / inspections.length) * 100 : 0,
      avgVarroa,
      lastInspection,
    };
  }, [inspections]);

  // Alertas REALES
  const alerts = useMemo(() => {
    const alertList: string[] = [];
    
    const highVarroa = inspections.filter(i => i.varroaLevel > 5);
    if (highVarroa.length > 0) {
      alertList.push(`⚠️ ${highVarroa.length} inspecciones con varroa > 5% - Tratamiento necesario`);
    }

    hives.forEach(hive => {
      const hiveInspections = inspections
        .filter(i => i.hiveId === hive.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (hiveInspections.length >= 2 && !hiveInspections[0].queenSeen && !hiveInspections[1].queenSeen) {
        alertList.push(`⚠️ ${hive.code}: Reina no vista en últimas 2 inspecciones`);
      }
    });

    return alertList;
  }, [inspections, hives]);

  // Filtros y búsqueda REALES
  const filteredInspections = useMemo(() => {
    let result = inspections;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(i => {
        const hive = hives.find(h => h.id === i.hiveId);
        return (
          hive?.code.toLowerCase().includes(query) ||
          i.notes?.toLowerCase().includes(query) ||
          i.observations?.toLowerCase().includes(query) ||
          new Date(i.date).toLocaleDateString('es-ES').includes(query)
        );
      });
    }

    if (filters.hive !== 'all') result = result.filter(i => i.hiveId === filters.hive);
    if (filters.queenSeen !== 'all') {
      const queenSeen = filters.queenSeen === 'yes';
      result = result.filter(i => i.queenSeen === queenSeen);
    }
    if (filters.varroaLevel !== 'all') {
      if (filters.varroaLevel === 'low') result = result.filter(i => i.varroaLevel < 2);
      else if (filters.varroaLevel === 'medium') result = result.filter(i => i.varroaLevel >= 2 && i.varroaLevel <= 5);
      else if (filters.varroaLevel === 'high') result = result.filter(i => i.varroaLevel > 5);
    }

    return result;
  }, [inspections, searchQuery, filters, hives]);

  // Ordenamiento REAL
  const sortedInspections = useMemo(() => {
    return [...filteredInspections].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredInspections]);

  // Línea de tiempo combinada: inspecciones + entradas de cuaderno (cría)
  const timeline = useMemo(() => {
    const inspectionsItems = sortedInspections.map(i => ({
      kind: 'inspection' as const,
      date: i.date,
      id: i.id,
      data: i,
    }));
    const cuadernoItems = cuadernoEntries.map(e => ({
      kind: 'cuaderno' as const,
      date: e.date,
      id: e.id,
      data: e,
    }));
    return [...inspectionsItems, ...cuadernoItems].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [sortedInspections, cuadernoEntries]);

  // Paginación REAL
  const paginatedTimeline = timeline.slice(0, page * itemsPerPage);
  const hasMore = timeline.length > page * itemsPerPage;

  // Handlers REALES
  const handleCreate = (newInspection: Partial<Inspection>) => {
    const inspection: Inspection = {
      ...newInspection,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Inspection;
    
    saveInspection(inspection);
    setInspections([inspection, ...inspections]);
  };

  const handleUpdate = (id: string, updates: Partial<Inspection>) => {
    const updated = updateInspection(id, updates);
    setInspections(updated);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta inspección?')) return;
    const updated = deleteInspection(id);
    setInspections(updated);
  };

  const handleExport = () => {
    const csvContent = [
      ['Fecha', 'Colmena', 'Reina', 'Varroa', 'Temperatura', 'Comportamiento', 'Población', 'Notas'].join(','),
      ...sortedInspections.map(i => {
        const hive = hives.find(h => h.id === i.hiveId);
        return [
          format(new Date(i.date), 'yyyy-MM-dd'),
          hive?.code || '',
          i.queenSeen ? 'Sí' : 'No',
          i.varroaLevel,
          i.temperature,
          i.beeBehavior,
          i.population,
          `"${i.notes || ''}"`,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inspecciones-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingScreen size="sm" label="Cargando inspecciones..." className="flex items-center justify-center py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas REALES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Total Inspecciones</p>
          <p className="font-display text-3xl font-black text-cream">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Esta Semana</p>
          <p className="font-display text-3xl font-black text-honey">{stats.thisWeek}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Reinas Vistas</p>
          <p className="font-display text-3xl font-black text-sage">{stats.queenPercentage.toFixed(0)}%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Promedio Varroa</p>
          <p className="font-display text-3xl font-black text-cream">{stats.avgVarroa.toFixed(1)}%</p>
        </div>
      </div>

      {/* Alertas REALES */}
      {alerts.length > 0 && (
        <div className="card p-6 border-coral/50">
          <h3 className="font-display text-lg font-bold text-coral mb-3">⚠️ Alertas</h3>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <p key={idx} className="text-sm text-cream">{alert}</p>
            ))}
          </div>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="space-y-4">
        <div className="relative">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-husk" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por colmena, fecha o notas..."
            className="w-full rounded-xl border border-line bg-ink/50 pl-12 pr-4 py-3 text-sm text-cream placeholder:text-husk/60 focus:border-honey/70"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={filters.hive}
            onChange={(e) => setFilters({ ...filters, hive: e.target.value })}
            className="rounded-xl border border-line bg-ink/50 px-4 py-2 text-sm text-cream"
          >
            <option value="all">Todas las colmenas</option>
            {hives.map(hive => (
              <option key={hive.id} value={hive.id}>{hive.code}</option>
            ))}
          </select>

          <select
            value={filters.queenSeen}
            onChange={(e) => setFilters({ ...filters, queenSeen: e.target.value })}
            className="rounded-xl border border-line bg-ink/50 px-4 py-2 text-sm text-cream"
          >
            <option value="all">Reina: Todas</option>
            <option value="yes">Reina: Sí</option>
            <option value="no">Reina: No</option>
          </select>

          <select
            value={filters.varroaLevel}
            onChange={(e) => setFilters({ ...filters, varroaLevel: e.target.value })}
            className="rounded-xl border border-line bg-ink/50 px-4 py-2 text-sm text-cream"
          >
            <option value="all">Varroa: Todos</option>
            <option value="low">Varroa: Bajo (&lt;2%)</option>
            <option value="medium">Varroa: Medio (2-5%)</option>
            <option value="high">Varroa: Alto (&gt;5%)</option>
          </select>

          <button
            onClick={() => setFilters({ hive: 'all', queenSeen: 'all', varroaLevel: 'all' })}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-husk hover:text-cream hover:border-honey/50"
          >
            Limpiar filtros
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-husk hover:text-cream hover:border-honey/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Lista de inspecciones */}
      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink text-honey">
              <IconClipboard className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-xl font-bold text-cream">Historial del Cuaderno</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-husk">
                Mostrando {paginatedTimeline.length} de {timeline.length}
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-honey px-4 py-2 text-sm font-semibold text-ink hover:bg-honeysoft"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <IconPlus className="h-4 w-4" />
            Nueva Inspección
          </motion.button>
        </div>

        {timeline.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📝</div>
            <p className="text-husk">No hay registros en el cuaderno</p>
            <p className="text-xs text-husk mt-2">
              {searchQuery || filters.hive !== 'all' ? "Intenta con otra búsqueda" : "Registra tu primera inspección o crea un lote de cría"}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-line">
              {paginatedTimeline.map((item) => {
                if (item.kind === 'cuaderno') {
                  const entry = item.data;
                  return (
                    <div key={entry.id} className="py-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="w-1 shrink-0 self-stretch rounded-full bg-honey" />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="rounded-md border border-honey/40 bg-honey/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-honey">
                              👑 Cría
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                              {format(new Date(entry.date), 'dd/MM/yyyy')} {formatHour(new Date(entry.date))}
                            </span>
                          </div>
                          <p className="text-sm text-cream">{entry.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                const inspection = item.data;
                const hive = hives.find(h => h.id === inspection.hiveId);
                return (
                  <div
                    key={inspection.id}
                    className="py-4 first:pt-0 cursor-pointer hover:bg-pane2/40 transition-colors"
                    onClick={() => setSelectedInspection(inspection)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-1 shrink-0 self-stretch rounded-full bg-honey" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="rounded-md border border-line bg-ink px-2 py-0.5 font-mono text-[11px] font-semibold text-cream">
                            {hive?.code || '—'}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                            {format(new Date(inspection.date), 'dd/MM/yyyy')} {formatHour(new Date(`${inspection.date}T${inspection.time || '00:00'}`))}
                          </span>
                          {inspection.queenSeen && (
                            <span className="text-[10px] text-sage">👑 Reina vista</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 mb-2">
                          <span className="text-xs">
                            <span className="text-husk">Varroa: </span>
                            <span className={`font-semibold ${
                              inspection.varroaLevel < 2 ? 'text-sage' :
                              inspection.varroaLevel <= 5 ? 'text-honey' : 'text-coral'
                            }`}>
                              {inspection.varroaLevel.toFixed(1)}%
                            </span>
                          </span>
                          <span className="text-xs">
                            <span className="text-husk">Temp: </span>
                            <span className="font-semibold text-cream">{inspection.temperature}°C</span>
                          </span>
                          <span className="text-xs">
                            <span className="text-husk">Comportamiento: </span>
                            <span className="font-semibold text-cream capitalize">{inspection.beeBehavior}</span>
                          </span>
                        </div>
                        {inspection.notes && (
                          <p className="text-sm italic text-husk line-clamp-2">"{inspection.notes}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setPage(page + 1)}
                  className="rounded-xl border border-line px-6 py-2 text-sm font-medium text-husk hover:text-cream hover:border-honey/50"
                >
                  Cargar más ({timeline.length - paginatedTimeline.length} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de detalles */}
      {selectedInspection && (
        <InspectionDetailModal
          inspection={selectedInspection}
          hive={hives.find(h => h.id === selectedInspection.hiveId)}
          onClose={() => setSelectedInspection(null)}
          onEdit={() => {
            setEditingInspection(selectedInspection);
            setShowForm(true);
            setSelectedInspection(null);
          }}
          onDelete={() => {
            handleDelete(selectedInspection.id);
            setSelectedInspection(null);
          }}
        />
      )}

      {/* Formulario */}
      {(showForm || showQuickForm) && (
        <InspectionForm
          inspection={editingInspection}
          hives={hives}
          templates={INSPECTION_TEMPLATES}
          quickMode={showQuickForm}
          onClose={() => {
            setShowForm(false);
            setShowQuickForm(false);
            setEditingInspection(null);
          }}
          onSave={(data) => {
            if (editingInspection) {
              handleUpdate(editingInspection.id, data);
            } else {
              handleCreate(data);
            }
            setShowForm(false);
            setShowQuickForm(false);
            setEditingInspection(null);
          }}
        />
      )}

      {/* Botón flotante para inspección rápida */}
      <motion.button
        onClick={() => setShowQuickForm(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-honey text-ink shadow-lg hover:bg-honeysoft"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <IconPlus className="h-6 w-6" />
      </motion.button>
    </div>
  );
}

// Componente de modal de detalles
function InspectionDetailModal({
  inspection,
  hive,
  onClose,
  onEdit,
  onDelete,
}: {
  inspection: Inspection;
  hive?: Hive;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useScrollLock(true);
  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-display text-2xl font-bold text-cream mb-1">
              Inspección de {hive?.code || 'Colmena'}
            </h3>
            <p className="text-sm text-husk">
              {format(new Date(inspection.date), 'EEEE, d MMMM yyyy', { locale: es })} {formatHour(new Date(`${inspection.date}T${inspection.time || '00:00'}`))}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center">
            <IconX className="w-5 h-5 text-cream" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Reina</p>
            <p className="text-lg font-semibold text-cream">
              {inspection.queenSeen ? '✅ Vista' : '❌ No vista'}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Varroa</p>
            <p className={`text-lg font-semibold ${
              inspection.varroaLevel < 2 ? 'text-sage' :
              inspection.varroaLevel <= 5 ? 'text-honey' : 'text-coral'
            }`}>
              {inspection.varroaLevel.toFixed(1)}%
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Temperatura</p>
            <p className="text-lg font-semibold text-cream">{inspection.temperature}°C</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Comportamiento</p>
            <p className="text-lg font-semibold text-cream capitalize">{inspection.beeBehavior}</p>
          </div>
        </div>

        {inspection.notes && (
          <div className="card p-4 mb-6">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Notas</p>
            <p className="text-sm italic text-husk">"{inspection.notes}"</p>
          </div>
        )}

        {inspection.photos && inspection.photos.length > 0 && (
          <div className="card p-4 mb-6">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">
              Fotos ({inspection.photos.length})
            </p>
            <PhotoGallery photos={inspection.photos} />
          </div>
        )}

        <div className="flex gap-2">
          <motion.button
            onClick={onEdit}
            className="flex-1 rounded-xl border border-line py-2 text-sm font-medium text-husk hover:text-cream hover:border-honey/50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Editar
          </motion.button>
          <motion.button
            onClick={onDelete}
            className="flex-1 rounded-xl border border-coral/30 py-2 text-sm font-medium text-coral hover:bg-coral/10"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Eliminar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Componente de formulario
function InspectionForm({
  inspection,
  hives,
  templates,
  quickMode,
  onClose,
  onSave,
}: {
  inspection: Inspection | null;
  hives: Hive[];
  templates: typeof INSPECTION_TEMPLATES;
  quickMode: boolean;
  onClose: () => void;
  onSave: (data: Partial<Inspection>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Inspection>>(
    inspection || {
      hiveId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      queenSeen: true,
      varroaLevel: 0,
      temperature: 35,
      beeBehavior: 'tranquila',
      population: 'media',
      honeyReserves: 5,
      pollenReserves: 5,
      weather: 'Soleado',
      notes: '',
      observations: '',
    }
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoData[]>(inspection?.photos || []);

  useScrollLock(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateInspection(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    onSave({ ...formData, photos });
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) setFormData({ ...formData, ...template.data });
  };

  if (quickMode) {
    return (
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="card max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display text-xl font-bold text-cream mb-4">Inspección Rápida</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Colmena</label>
              <select
                value={formData.hiveId}
                onChange={(e) => setFormData({ ...formData, hiveId: e.target.value })}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                required
              >
                <option value="">Seleccionar</option>
                {hives.map(hive => (
                  <option key={hive.id} value={hive.id}>{hive.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Reina vista</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, queenSeen: true })}
                  className={`flex-1 rounded-xl border py-2 text-sm ${
                    formData.queenSeen ? 'border-honey bg-honey/10 text-honey' : 'border-line text-husk'
                  }`}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, queenSeen: false })}
                  className={`flex-1 rounded-xl border py-2 text-sm ${
                    !formData.queenSeen ? 'border-honey bg-honey/10 text-honey' : 'border-line text-husk'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Varroa (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.varroaLevel}
                onChange={(e) => setFormData({ ...formData, varroaLevel: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Nota rápida</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observación breve..."
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <motion.button
                type="submit"
                className="flex-1 rounded-xl bg-honey py-2 text-sm font-semibold text-ink hover:bg-honeysoft"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Guardar
              </motion.button>
              <motion.button
                type="button"
                onClick={onClose}
                className="px-6 rounded-xl border border-line py-2 text-sm font-medium text-husk hover:bg-ink/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancelar
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 touch-none"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <h3 className="font-display text-2xl font-bold text-cream">
            {inspection ? 'Editar Inspección' : 'Nueva Inspección'}
          </h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center">
            <IconX className="w-5 h-5 text-cream" />
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-lg border border-coral/50 bg-coral/10">
            {errors.map((error, idx) => (
              <p key={idx} className="text-sm text-coral">{error}</p>
            ))}
          </div>
        )}

        {!inspection && (
          <div className="mb-6">
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Plantillas</p>
            <div className="flex flex-wrap gap-2">
              {templates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => loadTemplate(template.id)}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-husk hover:text-cream hover:border-honey/50"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Colmena</label>
              <select
                value={formData.hiveId}
                onChange={(e) => setFormData({ ...formData, hiveId: e.target.value })}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                required
              >
                <option value="">Seleccionar colmena</option>
                {hives.map(hive => (
                  <option key={hive.id} value={hive.id}>{hive.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Fecha</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Reina vista</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, queenSeen: true })}
                  className={`flex-1 rounded-xl border py-2 text-sm ${
                    formData.queenSeen ? 'border-honey bg-honey/10 text-honey' : 'border-line text-husk'
                  }`}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, queenSeen: false })}
                  className={`flex-1 rounded-xl border py-2 text-sm ${
                    !formData.queenSeen ? 'border-honey bg-honey/10 text-honey' : 'border-line text-husk'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Varroa (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.varroaLevel}
                onChange={(e) => setFormData({ ...formData, varroaLevel: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Temperatura (°C)</label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="50"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observaciones breves..."
              className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
              rows={2}
            />
          </div>

          <div className="border-t border-line pt-4">
            <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
          </div>

          <div className="flex gap-2">
            <motion.button
              type="submit"
              className="flex-1 rounded-xl bg-honey py-2 text-sm font-semibold text-ink hover:bg-honeysoft"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {inspection ? 'Actualizar' : 'Guardar'}
            </motion.button>
            <motion.button
              type="button"
              onClick={onClose}
              className="px-6 rounded-xl border border-line py-2 text-sm font-medium text-husk hover:bg-ink/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancelar
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
