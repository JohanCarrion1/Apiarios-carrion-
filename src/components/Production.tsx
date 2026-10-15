import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, subMonths, isAfter, isBefore, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import type { Hive } from "../types/hive";
import { loadHarvests, saveHarvests, loadHarvestUnit, saveHarvestUnit, loadAnnualGoal, saveAnnualGoal, loadBasePrice, saveBasePrice } from '../utils/storage';
import { useScrollLock } from '../hooks/useScrollLock';
import { backdropVariants, modalVariants } from '../lib/motion';

// Tipos de miel con iconos y colores
const HONEY_TYPES = [
  { id: 'milflores', name: 'Milflores', icon: '🌸', color: '#ffa90a' },
  { id: 'azahar', name: 'Azahar', icon: '🍊', color: '#ffb84d' },
  { id: 'romero', name: 'Romero', icon: '🌿', color: '#93cc68' },
  { id: 'eucalipto', name: 'Eucalipto', icon: '🌳', color: '#6fa8dc' },
  { id: 'castano', name: 'Castano', icon: '🌰', color: '#8b6f47' },
  { id: 'brezo', name: 'Brezo', icon: '💜', color: '#c987c3' },
  { id: 'personalizado', name: 'Personalizado', icon: '✨', color: '#ffa90a' },
];

interface Harvest {
  id: string;
  hiveId: string;
  date: string;
  honeyKg: number;
  pollenG?: number;
  waxKg?: number;
  propolisG?: number;
  royalJellyG?: number;
  type?: string;
  pricePerKg?: number;
  notes?: string;
  conditions?: string;
}

interface Props {
  hives: Hive[];
  suffix?: string;
}

export default function Production({ hives, suffix = '' }: Props) {
  const [harvests, setHarvests] = useState<Harvest[]>(() => loadHarvests(suffix));
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // El desplegable de Exportar antes solo abria con :hover, que en tactil nunca
  // se dispara. Ahora es un toggle por clic y se cierra al pulsar fuera o Escape.
  useEffect(() => {
    if (!showExport) return;
    const onPointerDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExport(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showExport]);

  const [showForm, setShowForm] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);
  const [unit, setUnit] = useState<'kg' | 'lb'>(() => loadHarvestUnit() as 'kg' | 'lb');
  const [annualGoal, setAnnualGoal] = useState<number>(() => loadAnnualGoal());
  const [basePrice, setBasePrice] = useState<number>(() => loadBasePrice());
  const [filterHive, setFilterHive] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<{ start: string; end: string }>({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  // Conversión de unidades
  const kgToLb = (kg: number) => kg * 2.20462;
  const displayValue = (kg: number) => unit === 'kg' ? kg : kgToLb(kg);
  const displayUnit = unit === 'kg' ? 'kg' : 'lb';

  // Guardar preferencias
  const handleSaveUnit = (newUnit: 'kg' | 'lb') => {
    setUnit(newUnit);
    saveHarvestUnit(newUnit);
  };

  const handleSaveAnnualGoal = (goal: number) => {
    setAnnualGoal(goal);
    saveAnnualGoal(goal);
  };

  const handleSaveBasePrice = (price: number) => {
    setBasePrice(price);
    saveBasePrice(price);
  };

  // Guardar cosechas
  const handleSaveHarvests = (newHarvests: Harvest[]) => {
    setHarvests(newHarvests);
    saveHarvests(newHarvests, suffix);
  };

  // Filtros
  const filteredHarvests = useMemo(() => {
    return harvests.filter(h => {
      const date = new Date(h.date);
      const inDateRange = isAfter(date, new Date(filterDateRange.start)) && 
                          isBefore(date, new Date(filterDateRange.end));
      const matchesHive = filterHive === 'all' || h.hiveId === filterHive;
      const matchesType = filterType === 'all' || h.type === filterType;
      return inDateRange && matchesHive && matchesType;
    });
  }, [harvests, filterHive, filterType, filterDateRange]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalHoney = filteredHarvests.reduce((sum, h) => sum + h.honeyKg, 0);
    const avgPerHarvest = filteredHarvests.length > 0 ? totalHoney / filteredHarvests.length : 0;
    const maxHarvest = filteredHarvests.reduce((max, h) => h.honeyKg > max ? h.honeyKg : max, 0);
    
    // Mes más productivo
    const monthStats: Record<number, number> = {};
    filteredHarvests.forEach(h => {
      const month = new Date(h.date).getMonth();
      monthStats[month] = (monthStats[month] || 0) + h.honeyKg;
    });
    const mostProductiveMonth = Object.entries(monthStats).sort((a, b) => b[1] - a[1])[0];
    
    // Días desde última cosecha
    const lastHarvest = filteredHarvests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const daysSinceLast = lastHarvest ? differenceInDays(new Date(), new Date(lastHarvest.date)) : null;
    
    // Progreso de meta anual
    const currentYear = new Date().getFullYear();
    const yearHarvests = harvests.filter(h => new Date(h.date).getFullYear() === currentYear);
    const yearTotal = yearHarvests.reduce((sum, h) => sum + h.honeyKg, 0);
    const goalProgress = (yearTotal / annualGoal) * 100;
    
    // Ranking de colmenas
    const hiveStats: Record<string, number> = {};
    filteredHarvests.forEach(h => {
      hiveStats[h.hiveId] = (hiveStats[h.hiveId] || 0) + h.honeyKg;
    });
    const ranking = Object.entries(hiveStats).sort((a, b) => b[1] - a[1]);
    
    // Valor estimado
    const totalValue = filteredHarvests.reduce((sum, h) => {
      const price = h.pricePerKg || basePrice;
      return sum + (h.honeyKg * price);
    }, 0);
    
    return {
      totalHoney,
      avgPerHarvest,
      maxHarvest,
      mostProductiveMonth: mostProductiveMonth ? parseInt(mostProductiveMonth[0]) : null,
      daysSinceLast,
      goalProgress,
      yearTotal,
      ranking,
      totalValue,
    };
  }, [filteredHarvests, harvests, annualGoal, basePrice]);

  // Predicción de próxima cosecha
  const prediction = useMemo(() => {
    if (harvests.length < 3) return null;
    
    const last6Months = harvests.filter(h => {
      const date = new Date(h.date);
      const sixMonthsAgo = subMonths(new Date(), 6);
      return isAfter(date, sixMonthsAgo);
    });
    
    if (last6Months.length === 0) return null;
    
    const avgMonthly = last6Months.reduce((sum, h) => sum + h.honeyKg, 0) / 6;
    return Math.round(avgMonthly * 10) / 10;
  }, [harvests]);

  // Alertas
  const alerts = useMemo(() => {
    const alertList: string[] = [];
    
    // Colmena sin producir en 3 meses
    const threeMonthsAgo = subMonths(new Date(), 3);
    hives.forEach(hive => {
      const lastHarvest = harvests
        .filter(h => h.hiveId === hive.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (!lastHarvest || isBefore(new Date(lastHarvest.date), threeMonthsAgo)) {
        alertList.push(`⚠️ ${hive.code} no ha producido en 3 meses`);
      }
    });
    
    // Producción mensual menor al promedio
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonth = harvests.filter(h => {
      const date = new Date(h.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const thisMonthTotal = thisMonth.reduce((sum, h) => sum + h.honeyKg, 0);
    
    const avgMonthly = harvests.length > 0 
      ? harvests.reduce((sum, h) => sum + h.honeyKg, 0) / (harvests.length / 30)
      : 0;
    
    if (thisMonthTotal < avgMonthly * 0.5 && harvests.length > 5) {
      alertList.push(`📉 Producción mensual ${thisMonthTotal.toFixed(1)} kg es menor al promedio`);
    }
    
    return alertList;
  }, [harvests, hives]);

  // Handlers
  const handleAddHarvest = () => {
    setEditingHarvest(null);
    setShowForm(true);
  };

  const handleEditHarvest = (harvest: Harvest) => {
    setEditingHarvest(harvest);
    setShowForm(true);
  };

  const handleDeleteHarvest = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta cosecha?')) {
      saveHarvests(harvests.filter(h => h.id !== id), suffix);
    }
  };

  const handleSaveHarvest = (harvestData: Omit<Harvest, 'id'>) => {
    if (editingHarvest) {
      saveHarvests(harvests.map(h => h.id === editingHarvest.id ? { ...h, ...harvestData } : h), suffix);
    } else {
      const newHarvest: Harvest = {
        ...harvestData,
        id: Date.now().toString(),
      };
      saveHarvests([newHarvest, ...harvests], suffix);
    }
    setShowForm(false);
    setEditingHarvest(null);
  };

  const handleShareHarvest = (harvest: Harvest) => {
    const hive = hives.find(h => h.id === harvest.hiveId);
    const type = HONEY_TYPES.find(t => t.id === harvest.type);
    const text = `🍯 Cosecha ${hive?.code || ''}: ${harvest.honeyKg} kg de miel ${type?.name.toLowerCase() || ''} - ${format(new Date(harvest.date), 'dd/MM/yyyy')}`;
    navigator.clipboard.writeText(text);
    alert('Cosecha copiada al portapapeles');
  };

  const handleExportReport = (exportFormat: 'csv' | 'pdf') => {
    if (exportFormat === 'csv') {
      const csvContent = [
        ['Fecha', 'Colmena', 'Tipo', 'Miel (kg)', 'Polen (g)', 'Cera (kg)', 'Propóleo (g)', 'Precio/kg', 'Valor Total', 'Notas'].join(','),
        ...filteredHarvests.map(h => {
          const hive = hives.find(hv => hv.id === h.hiveId);
          const type = HONEY_TYPES.find(t => t.id === h.type);
          const price = h.pricePerKg || basePrice;
          const totalValue = h.honeyKg * price;
          return [
            format(new Date(h.date), 'yyyy-MM-dd'),
            hive?.code || '',
            type?.name || '',
            h.honeyKg,
            h.pollenG || 0,
            h.waxKg || 0,
            h.propolisG || 0,
            price,
            totalValue,
            `"${h.notes || ''}"`,
          ].join(',');
        }),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-cosechas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas rápidas */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Promedio/Cosecha</p>
          <p className="font-display text-3xl font-black text-cream">{stats.avgPerHarvest.toFixed(1)} {displayUnit}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Cosecha Más Grande</p>
          <p className="font-display text-3xl font-black text-honey">{stats.maxHarvest.toFixed(1)} {displayUnit}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Mes Más Productivo</p>
          <p className="font-display text-3xl font-black text-sage">
            {stats.mostProductiveMonth !== null ? format(new Date(2024, stats.mostProductiveMonth), 'MMM', { locale: es }) : '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Días Desde Última</p>
          <p className="font-display text-3xl font-black text-cream">{stats.daysSinceLast !== null ? stats.daysSinceLast : '—'}</p>
        </div>
      </motion.div>

      {/* Meta de producción */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-cream">Meta Anual de Producción</h3>
            <p className="text-xs text-husk">
              {stats.yearTotal.toFixed(1)} {displayUnit} de {displayValue(annualGoal)} {displayUnit} ({stats.goalProgress.toFixed(0)}%)
            </p>
          </div>
          <button
            onClick={() => {
              const newGoal = prompt('Ingresa tu meta anual en kg:', annualGoal.toString());
              if (newGoal) handleSaveAnnualGoal(parseFloat(newGoal));
            }}
            className="text-xs text-honey hover:text-honeysoft"
          >
            Editar meta
          </button>
        </div>
        <div className="h-3 bg-ink rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-honey to-honeysoft"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(stats.goalProgress, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {prediction && (
          <p className="text-xs text-husk mt-2">
            💡 Según el histórico, producirás ~{prediction} {displayUnit} el próximo mes
          </p>
        )}
      </motion.div>

      {/* Ranking de colmenas */}
      {stats.ranking.length > 0 && (
        <motion.div
          className="card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="font-display text-lg font-bold text-cream mb-3">🏆 Ranking de Colmenas</h3>
          <div className="space-y-2">
            {stats.ranking.slice(0, 5).map(([hiveId, total], idx) => {
              const hive = hives.find(h => h.id === hiveId);
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
              return (
                <div key={hiveId} className="flex items-center justify-between p-2 rounded-lg bg-ink/50">
                  <span className="text-sm">
                    {medals[idx]} {hive?.code || hiveId}
                  </span>
                  <span className="font-semibold text-honey">{total.toFixed(1)} {displayUnit}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Lista de cosechas */}
      <motion.div
        className="card p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Cabecera: identidad de la tabla + accion principal */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-ink text-honey">
              🍯
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-xl font-bold text-cream">Registro de Cosechas</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-husk">
                {filteredHarvests.length} cosechas • Total: {stats.totalHoney.toFixed(1)} {displayUnit} • Valor: S/ {stats.totalValue.toFixed(2)}
              </p>
            </div>
          </div>

          <motion.button
            onClick={handleAddHarvest}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-honey px-4 py-2.5 text-sm font-semibold text-ink hover:bg-honeysoft sm:w-auto"
            whileTap={{ scale: 0.97 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Cosecha
          </motion.button>
        </div>

        {/* Barra de herramientas: filtros a la izquierda, unidades y export a la derecha */}
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={filterHive}
              onChange={(e) => setFilterHive(e.target.value)}
              aria-label="Filtrar por colmena"
              className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-cream sm:w-auto"
            >
              <option value="all">Todas las colmenas</option>
              {hives.map(hive => (
                <option key={hive.id} value={hive.id}>{hive.code}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filtrar por tipo de miel"
              className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-cream sm:w-auto"
            >
              <option value="all">Todos los tipos</option>
              {HONEY_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveUnit(unit === 'kg' ? 'lb' : 'kg')}
              className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-husk hover:border-honey/50 hover:text-cream sm:flex-none"
            >
              {unit === 'kg' ? 'kg → lb' : 'lb → kg'}
            </button>

            <div ref={exportRef} className="relative flex-1 sm:flex-none">
              <button
                onClick={() => setShowExport((v) => !v)}
                aria-expanded={showExport}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-husk hover:border-honey/50 hover:text-cream"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar
              </button>

              <AnimatePresence>
                {showExport && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-pane p-1 shadow-xl"
                  >
                    <button
                      onClick={() => { setShowExport(false); handleExportReport('csv'); }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-cream hover:bg-pane2"
                    >
                      📊 Lista (CSV)
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {filteredHarvests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🍯</div>
            <p className="text-husk">No hay cosechas registradas</p>
            <p className="text-xs text-husk mt-2">Registra tu primera cosecha usando el botón "Nueva Cosecha"</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filteredHarvests.map((harvest, index) => {
              const hive = hives.find(h => h.id === harvest.hiveId);
              const type = HONEY_TYPES.find(t => t.id === harvest.type);
              const price = harvest.pricePerKg || basePrice;
              const totalValue = harvest.honeyKg * price;

              return (
                <motion.article
                  key={harvest.id}
                  className="py-4 first:pt-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-1 shrink-0 self-stretch rounded-full" style={{ backgroundColor: type?.color || '#ffa90a' }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="rounded-md border border-line bg-ink px-2 py-0.5 font-mono text-[11px] font-semibold text-cream">
                          {hive?.code || '—'}
                        </span>
                        {type && (
                          <span className="text-xs" style={{ color: type.color }}>
                            {type.icon} {type.name}
                          </span>
                        )}
                        <span className="font-mono text-[10px] uppercase tracking-wider text-husk">
                          {format(new Date(harvest.date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mb-2">
                        <span className="text-sm">
                          <span className="text-husk">Miel: </span>
                          <span className="font-semibold text-honey">{displayValue(harvest.honeyKg).toFixed(1)} {displayUnit}</span>
                        </span>
                        {harvest.pollenG && harvest.pollenG > 0 && (
                          <span className="text-sm">
                            <span className="text-husk">Polen: </span>
                            <span className="font-semibold text-cream">{harvest.pollenG} g</span>
                          </span>
                        )}
                        {harvest.waxKg && harvest.waxKg > 0 && (
                          <span className="text-sm">
                            <span className="text-husk">Cera: </span>
                            <span className="font-semibold text-cream">{harvest.waxKg} kg</span>
                          </span>
                        )}
                        <span className="text-sm">
                          <span className="text-husk">Valor: </span>
                          <span className="font-semibold text-sage">S/ {totalValue.toFixed(2)}</span>
                        </span>
                      </div>
                      {harvest.notes && (
                        <p className="text-sm italic text-husk">"{harvest.notes}"</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEditHarvest(harvest)}
                          className="text-xs text-husk hover:text-cream"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteHarvest(harvest.id)}
                          className="text-xs text-coral hover:text-coral/80"
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => handleShareHarvest(harvest)}
                          className="text-xs text-honey hover:text-honeysoft"
                        >
                          Compartir
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Alertas de producción — al final, debajo del registro de cosechas */}
      {alerts.length > 0 && (
        <motion.div
          className="card p-6 border-coral/50 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="font-display text-lg font-bold text-coral mb-3">⚠️ Alertas de Producción</h3>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <p key={idx} className="text-sm text-cream">{alert}</p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Formulario */}
      <AnimatePresence>
        {showForm && (
          <HarvestForm
            harvest={editingHarvest}
            hives={hives}
            basePrice={basePrice}
            onClose={() => {
              setShowForm(false);
              setEditingHarvest(null);
            }}
            onSave={handleSaveHarvest}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente del formulario
function HarvestForm({
  harvest,
  hives,
  basePrice,
  onClose,
  onSave,
}: {
  harvest: Harvest | null;
  hives: Hive[];
  basePrice: number;
  onClose: () => void;
  onSave: (data: Omit<Harvest, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    hiveId: harvest?.hiveId || '',
    date: harvest?.date || format(new Date(), 'yyyy-MM-dd'),
    honeyKg: harvest?.honeyKg || 0,
    pollenG: harvest?.pollenG || 0,
    waxKg: harvest?.waxKg || 0,
    propolisG: harvest?.propolisG || 0,
    type: harvest?.type || 'milflores',
    pricePerKg: harvest?.pricePerKg || basePrice,
    notes: harvest?.notes || '',
    conditions: harvest?.conditions || '',
  });

  useScrollLock(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hiveId || formData.honeyKg <= 0) return;
    onSave(formData);
  };

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
          <h3 className="font-display text-2xl font-bold text-cream">
            {harvest ? 'Editar Cosecha' : 'Nueva Cosecha'}
          </h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-ink/50 hover:bg-ink/70 flex items-center justify-center">
            <svg className="w-5 h-5 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Tipo de Miel</label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {HONEY_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.id })}
                  className={`p-2 rounded-lg border transition-all ${
                    formData.type === type.id
                      ? 'border-honey bg-honey/10'
                      : 'border-line hover:border-honey/50'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <p className="text-xs text-cream mt-1">{type.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Miel (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.honeyKg || ''}
                onChange={(e) => setFormData({ ...formData, honeyKg: parseFloat(e.target.value) || 0 })}
                onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Polen (g)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.pollenG || ''}
                onChange={(e) => setFormData({ ...formData, pollenG: parseFloat(e.target.value) || 0 })}
                onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Cera (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.waxKg || ''}
                onChange={(e) => setFormData({ ...formData, waxKg: parseFloat(e.target.value) || 0 })}
                onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Propóleo (g)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.propolisG || ''}
                onChange={(e) => setFormData({ ...formData, propolisG: parseFloat(e.target.value) || 0 })}
                onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Precio por kg (S/)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.pricePerKg}
              onChange={(e) => setFormData({ ...formData, pricePerKg: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
            />
            <p className="text-xs text-husk mt-1">
              Valor estimado: S/ {(formData.honeyKg * formData.pricePerKg).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observaciones..."
              className="w-full rounded-xl border border-line bg-ink px-4 py-2 text-sm text-cream"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-husk mb-2">Condiciones</label>
            <textarea
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              placeholder="Clima, flora disponible, observaciones..."
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
              {harvest ? 'Actualizar' : 'Guardar'}
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
