import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Hive, Inspection, Task } from '../types/hive';
import { STATUS_COLORS } from '../types/hive';
import { MONTHS } from '../data';
import { TechStatsCards } from './TechPanels';
import { getCurrentUserId, loadHives, loadHarvests, loadApiaries } from '../utils/storage';

interface Harvest {
  id: string;
  hiveId: string;
  date: string;
  honeyKg: number;
  [key: string]: any;
}

interface StatsSectionProps {
  hives: Hive[];
  nuclei: Hive[];
  inspections: Inspection[];
  tasks: Task[];
  harvests: Harvest[];
  breedingLots?: any[];
  apiaryId?: string;
  apiaryName?: string;
  storageSuffix?: string;
}

const FULL_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const SEASONS = [
  { id: 'primavera', label: 'Primavera', months: [2, 3, 4] },
  { id: 'verano', label: 'Verano', months: [5, 6, 7] },
  { id: 'otono', label: 'Otoño', months: [8, 9, 10] },
  { id: 'invierno', label: 'Invierno', months: [11, 0, 1] },
];

const PERIODS = [
  { id: 'mes', label: 'Último mes' },
  { id: '3meses', label: 'Últimos 3 meses' },
  { id: 'temporada', label: 'Temporada completa' },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];

// Custom tooltip para gráficos
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3 shadow-lg border border-line">
        <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">{label}</p>
        {payload.map((entry: any, index: number) => {
          const isKg = /produccion|kg totales|total|actual|anterior/i.test(entry.name);
          const isPct = /varroa|porciento|aceptación|aceptacion/i.test(entry.name);
          return (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{isKg ? ' kg' : ''}{isPct ? ' %' : ''}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function StatsSection({
  hives,
  nuclei,
  inspections,
  tasks,
  harvests: initialHarvests,
  breedingLots = [],
  apiaryId = '',
  apiaryName = '',
  storageSuffix = '',
}: StatsSectionProps) {
  const [period, setPeriod] = useState<PeriodId>('mes');
  const [selectedHiveId, setSelectedHiveId] = useState<string>('');

  // Datos de cosechas: se mantienen frescos leyendo del storage del apiario
  const [liveHarvests, setLiveHarvests] = useState<Harvest[]>(initialHarvests);
  useEffect(() => {
    setLiveHarvests(initialHarvests);
    if (storageSuffix) {
      const reload = () => {
        try {
          setLiveHarvests(loadHarvests(storageSuffix));
        } catch {
          /* storage no disponible */
        }
      };
      reload();
      const id = setInterval(reload, 2000);
      return () => clearInterval(id);
    }
    return undefined;
  }, [storageSuffix, initialHarvests]);
  const harvests = liveHarvests;

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;

  const colonies = useMemo(() => [...hives, ...nuclei], [hives, nuclei]);
  const codeFor = (id: string) => colonies.find(c => c.id === id)?.code ?? id.slice(0, 5);

  const round = (n: number) => Math.round(n * 10) / 10;

  // Tarjetas básicas
  const basicStats = useMemo(() => {
    const totalProduction = harvests.reduce((sum, h) => sum + (h.honeyKg || 0), 0);
    const avgVarroa = inspections.length > 0
      ? inspections.reduce((sum, i) => sum + (i.varroa || 0), 0) / inspections.length
      : null;
    const healthy = colonies.filter(c => c.status === 'saludable').length;
    const healthRate = colonies.length > 0 ? (healthy / colonies.length) * 100 : null;

    const currentMonth = now.getMonth();
    const inspectionsThisMonth = inspections.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    const harvestsThisMonth = harvests.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;

    return {
      totalHives: colonies.length,
      totalProduction,
      avgVarroa,
      healthRate,
      inspectionsThisMonth,
      harvestsThisMonth,
      pendingTasks,
    };
  }, [colonies, harvests, inspections, tasks, currentYear, now]);

  // ============ 1. RANKING DE PRODUCCIÓN ============
  const periodStart = useMemo(() => {
    if (period === 'mes') return new Date(currentYear, now.getMonth(), 1);
    if (period === '3meses') return new Date(currentYear, now.getMonth() - 2, 1);
    return new Date(currentYear, 0, 1);
  }, [period, currentYear, now]);

  const rankingData = useMemo(() => {
    const counts: Record<string, { total: number; count: number }> = {};
    harvests.forEach(h => {
      const d = new Date(h.date);
      if (d.getTime() >= periodStart.getTime()) {
        counts[h.hiveId] = counts[h.hiveId] || { total: 0, count: 0 };
        counts[h.hiveId].total += h.honeyKg || 0;
        counts[h.hiveId].count += 1;
      }
    });
    return Object.entries(counts)
      .map(([id, v]) => ({
        colmena: codeFor(id),
        kg: round(v.total),
        cosechas: v.count,
      }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 5);
  }, [harvests, periodStart, colonies]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============ 2. PRODUCCIÓN POR COLMEÑA (DETALLE) ============
  const effectiveSelected = selectedHiveId || colonies[0]?.id || '';
  const selectedColony = colonies.find(c => c.id === effectiveSelected) || colonies[0] || null;

  const hiveMonthlyData = useMemo(() => {
    if (!selectedColony) return [];
    return MONTHS.map((month, index) => {
      const total = harvests
        .filter(h => {
          const d = new Date(h.date);
          return h.hiveId === selectedColony.id && d.getMonth() === index && d.getFullYear() === currentYear;
        })
        .reduce((sum, h) => sum + (h.honeyKg || 0), 0);
      return { mes: month, produccion: round(total) };
    });
  }, [selectedColony, harvests, currentYear]);

  const selectedSeasonHarvests = useMemo(() => {
    if (!selectedColony) return [];
    return harvests.filter(h => {
      const d = new Date(h.date);
      return h.hiveId === selectedColony.id && d.getFullYear() === currentYear;
    });
  }, [selectedColony, harvests, currentYear]);

  const selectedTotalSeason = selectedSeasonHarvests.reduce((sum, h) => sum + (h.honeyKg || 0), 0);
  const selectedAvgPerHarvest = selectedSeasonHarvests.length > 0
    ? selectedTotalSeason / selectedSeasonHarvests.length
    : 0;

  const apiarySeasonHarvests = useMemo(() => {
    return harvests.filter(h => {
      const d = new Date(h.date);
      return d.getFullYear() === currentYear;
    });
  }, [harvests, currentYear]);

  const apiaryAvgPerHarvest = apiarySeasonHarvests.length > 0
    ? apiarySeasonHarvests.reduce((sum, h) => sum + (h.honeyKg || 0), 0) / apiarySeasonHarvests.length
    : 0;

  const diffPct = apiaryAvgPerHarvest > 0
    ? ((selectedAvgPerHarvest - apiaryAvgPerHarvest) / apiaryAvgPerHarvest) * 100
    : null;

  // ============ 3. SALUD DEL COLMENAR ============
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { saludable: 0, revision: 0, alerta: 0, sin_reina: 0 };
    colonies.forEach(c => {
      const st = c.status || 'revision';
      counts[st] = (counts[st] || 0) + 1;
    });
    return [
      { name: 'Saludable', value: counts.saludable, color: STATUS_COLORS.saludable },
      { name: 'Revisión', value: counts.revision, color: STATUS_COLORS.revision },
      { name: 'Alerta', value: counts.alerta, color: STATUS_COLORS.alerta },
      { name: 'Sin Reina', value: counts.sin_reina, color: STATUS_COLORS.sin_reina },
    ].filter(d => d.value > 0);
  }, [colonies]);

  const healthNow = colonies.length > 0
    ? (colonies.filter(c => c.status === 'saludable').length / colonies.length) * 100
    : null;

  // Estimación de salud hace 1 mes a partir de inspecciones previas
  const healthMonthAgo = useMemo(() => {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oldInspections = inspections.filter(i => new Date(i.date).getTime() < cutoff.getTime());
    if (oldInspections.length === 0) return null;

    const byHive: Record<string, Inspection[]> = {};
    oldInspections.forEach(i => {
      if (!byHive[i.hiveId]) byHive[i.hiveId] = [];
      byHive[i.hiveId].push(i);
    });

    let healthy = 0;
    let evaluated = 0;
    Object.values(byHive).forEach(list => {
      const last = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[
        list.length - 1
      ];
      evaluated += 1;
      if (last.queenSeen && (last.varroa || 0) < 5) healthy += 1;
    });

    return evaluated > 0 ? (healthy / evaluated) * 100 : null;
  }, [inspections, now]);

  const queenAcceptanceRate = useMemo(() => {
    const decided = breedingLots.filter(l => l.estado === 'aceptadas' || l.estado === 'perdidas');
    if (decided.length === 0) return null;
    const accepted = decided.filter(l => l.estado === 'aceptadas').length;
    return (accepted / decided.length) * 100;
  }, [breedingLots]);

  const inspectionsPerColonyWeek = useMemo(() => {
    if (colonies.length === 0) return null;
    const since = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const recent = inspections.filter(i => new Date(i.date).getTime() >= since).length;
    return (recent / colonies.length) / (30 / 7);
  }, [colonies, inspections, now]);

  // ============ 4. ANÁLISIS ESTACIONAL ============
  const seasonData = useMemo(() => {
    return SEASONS.map(s => {
      const total = harvests
        .filter(h => {
          const d = new Date(h.date);
          return d.getFullYear() === currentYear && s.months.includes(d.getMonth());
        })
        .reduce((sum, h) => sum + (h.honeyKg || 0), 0);
      return { nombre: s.label, produccion: round(total) };
    });
  }, [harvests, currentYear]);

  const monthlyStackedData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const total = (year: number) =>
        round(
          harvests
            .filter(h => {
              const d = new Date(h.date);
              return d.getMonth() === index && d.getFullYear() === year;
            })
            .reduce((sum, h) => sum + (h.honeyKg || 0), 0)
        );
      return {
        mes: month,
        actual: total(currentYear),
        anterior: total(prevYear),
      };
    });
  }, [harvests, currentYear, prevYear]);

  const peakMonths = useMemo(() => {
    return FULL_MONTHS.map((name, index) => {
      const kg = round(
        harvests
          .filter(h => {
            const d = new Date(h.date);
            return d.getFullYear() === currentYear && d.getMonth() === index;
          })
          .reduce((sum, h) => sum + (h.honeyKg || 0), 0)
      );
      return { name, kg };
    })
      .filter(p => p.kg > 0)
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 3);
  }, [harvests, currentYear]);

  const currentYearTotal = round(
    harvests
      .filter(h => new Date(h.date).getFullYear() === currentYear)
      .reduce((sum, h) => sum + (h.honeyKg || 0), 0)
  );
  const prevYearTotal = round(
    harvests
      .filter(h => new Date(h.date).getFullYear() === prevYear)
      .reduce((sum, h) => sum + (h.honeyKg || 0), 0)
  );
  const hasPrevYear = prevYearTotal > 0;

  // ============ 5. EFICIENCIA POR APIARIO ============
  const apiaryEfficiency = useMemo(() => {
    const userId = getCurrentUserId();
    // La lista real vive en la entidad versionada 'apiaries' (por usuario).
    // Antes se leía la clave legada `apiarios_{uid}`, que ya no escribe nadie:
    // el bloque veía siempre 0 apiarios y "Eficiencia por apiario" salía vacío.
    const apiaries = loadApiaries(userId);
    if (apiaries.length <= 1) return [];

    return apiaries
      .map(ap => {
        const isCurrent = ap.id === apiaryId;
        const hivesList = isCurrent ? colonies : loadHives(`_${userId}_${ap.id}`);
        const harvestList = isCurrent ? harvests : loadHarvests(`_${userId}_${ap.id}`);
        const total = round(harvestList.reduce((sum, h) => sum + (h.honeyKg || 0), 0));
        const perHive = hivesList.length > 0 ? round(total / hivesList.length) : 0;
        return {
          id: ap.id,
          name: ap.name || 'Sin nombre',
          total,
          perHive,
          hives: hivesList.length,
          isCurrent,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [colonies, harvests, apiaryId]);

  // ============ Producción mensual (línea) ============
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const total = harvests
        .filter(h => {
          const d = new Date(h.date);
          return d.getMonth() === index && d.getFullYear() === currentYear;
        })
        .reduce((sum, h) => sum + (h.honeyKg || 0), 0);
      return { mes: month, produccion: round(total) };
    });
  }, [harvests, currentYear]);

  // ============ Comparativa anual ============
  const yearlyData = useMemo(() => {
    const years = [...new Set(harvests.map(h => new Date(h.date).getFullYear()))].sort();
    const lastYears = years.slice(-3);
    return lastYears.map(year => {
      const total = round(
        harvests
          .filter(h => new Date(h.date).getFullYear() === year)
          .reduce((sum, h) => sum + (h.honeyKg || 0), 0)
      );
      return { año: year.toString(), produccion: total };
    });
  }, [harvests]);

  // ============ Evolución de varroa ============
  const varroaData = useMemo(() => {
    const sorted = [...inspections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted.slice(-10).map(i => ({
      fecha: new Date(i.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      varroa: i.varroa || 0,
    }));
  }, [inspections]);

  // ============ Inspecciones por mes ============
  const inspectionsData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const count = inspections.filter(i => {
        const d = new Date(i.date);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      }).length;
      return { mes: month, inspecciones: count };
    });
  }, [inspections, currentYear]);

  /* Piel y jerarquia compartidas por las 10 secciones de esta vista: antes
     cada bloque repetia `card p-6` y sus propios margenes, por eso la jerarquia
     se rompia al bajar de tamano. */
  const cardCls = 'bg-[#1a140d] rounded-2xl p-4 sm:p-6 border border-yellow-900/30 shadow-lg';
  const kpiCls = 'bg-[#1a140d] rounded-2xl p-4 border border-yellow-900/30 shadow-lg';
  const titleCls = 'font-display text-lg sm:text-xl font-bold text-honey';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tarjetas de estadísticas básicas */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={kpiCls}>
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Total Colmenas</p>
          <p className="font-display text-3xl font-black text-cream">
            {basicStats.totalHives}
          </p>
        </div>
        <div className={kpiCls}>
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Producción Total</p>
          <p className="font-display text-3xl font-black text-honey">
            {basicStats.totalProduction.toFixed(1)} kg
          </p>
        </div>
        <div className={kpiCls}>
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Promedio Varroa</p>
          <p className="font-display text-3xl font-black text-cream">
            {basicStats.avgVarroa !== null ? `${basicStats.avgVarroa.toFixed(1)}%` : 'N/A'}
          </p>
        </div>
        <div className={kpiCls}>
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Tasa de Salud</p>
          <p className="font-display text-3xl font-black text-sage">
            {basicStats.healthRate !== null ? `${basicStats.healthRate.toFixed(0)}%` : 'N/A'}
          </p>
        </div>
      </motion.div>

      {/* Estadísticas adicionales */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className={kpiCls}>
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Inspecciones Este Mes</p>
          <p className="font-display text-2xl font-black text-cream">{basicStats.inspectionsThisMonth}</p>
        </div>
        <div className={kpiCls}>
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Cosechas Este Mes</p>
          <p className="font-display text-2xl font-black text-honey">{basicStats.harvestsThisMonth}</p>
        </div>
        <div className={kpiCls}>
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Tareas Pendientes</p>
          <p className="font-display text-2xl font-black text-coral">{basicStats.pendingTasks}</p>
        </div>
      </motion.div>

      {/* ============ 1. RANKING DE PRODUCCIÓN ============ */}
      <motion.div
        className={cardCls}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className={titleCls}>Top 5 Colmenas Productoras</h3>
            <p className="font-mono text-[10px] uppercase tracking-widest text-husk">
              {period === 'mes' && 'Último mes'}
              {period === '3meses' && 'Últimos 3 meses'}
              {period === 'temporada' && 'Temporada completa'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  period === p.id
                    ? 'bg-honey text-ink'
                    : 'border border-line text-husk hover:text-cream hover:border-honey/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {rankingData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin cosechas en este período</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="h-64 sm:h-72 overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#392c19" horizontal={false} />
                <XAxis type="number" stroke="#a3906a" style={{ fontSize: '12px' }} unit=" kg" />
                <YAxis type="category" dataKey="colmena" stroke="#a3906a" style={{ fontSize: '12px' }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kg" name="kg totales" fill="#f0a41c" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {rankingData.map((row, idx) => (
                <div
                  key={row.colmena}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-ink/50"
                >
                  <span className="flex items-center gap-2 text-sm text-cream">
                    <span className="font-mono text-xs text-husk">{idx + 1}º</span>
                    <span className="font-semibold">{row.colmena}</span>
                  </span>
                  <span className="flex items-center gap-3 font-mono text-xs text-husk">
                    <span>{row.cosechas} cosechas</span>
                    <span className="font-semibold text-honey">{row.kg} kg</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ============ 2. PRODUCCIÓN POR COLMEÑA (DETALLE) ============ */}
      {colonies.length > 0 && (
        <motion.div
          className={cardCls}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className={titleCls}>Producción por Colmena</h3>
            <select
              value={effectiveSelected}
              onChange={(e) => setSelectedHiveId(e.target.value)}
              className="rounded-xl border border-line bg-ink/50 px-3 py-1.5 text-sm text-cream"
            >
              {colonies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code}
                  {c.name ? ` · ${c.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="rounded-xl border border-line bg-ink/40 p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Total Acumulado Temporada</p>
              <p className="font-display text-2xl font-black text-honey">{round(selectedTotalSeason)} kg</p>
            </div>
            <div className="rounded-xl border border-line bg-ink/40 p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Promedio por Cosecha</p>
              <p className="font-display text-2xl font-black text-cream">{round(selectedAvgPerHarvest)} kg</p>
            </div>
            <div className="rounded-xl border border-line bg-ink/40 p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">vs Promedio del Apiario</p>
              {diffPct === null ? (
                <p className="font-display text-xl font-black text-husk">N/A</p>
              ) : diffPct >= 0 ? (
                <p className="font-display text-lg font-black text-sage">
                  +{diffPct.toFixed(0)}% por encima del promedio
                </p>
              ) : (
                <p className="font-display text-lg font-black text-coral">
                  {diffPct.toFixed(0)}% por debajo del promedio
                </p>
              )}
            </div>
          </div>

          {hiveMonthlyData.every(d => d.produccion === 0) ? (
            <div className="flex items-center justify-center h-64 text-husk">
              <p>Sin cosechas registradas para {selectedColony?.code}</p>
            </div>
          ) : (
            <div className="h-64 sm:h-72 overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hiveMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
                <XAxis
                dataKey="mes"
                stroke="#a3906a"
                style={{ fontSize: 10 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
                <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="produccion"
                  stroke="#f0a41c"
                  strokeWidth={3}
                  dot={{ fill: '#f0a41c', r: 5 }}
                  activeDot={{ r: 7, fill: '#ffc961' }}
                  name="Producción"
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}

      {/* Producción de Miel por Mes */}
      <motion.div
        className={cardCls}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className={`${titleCls} mb-4`}>Producción de Miel por Mes</h3>
        {monthlyData.length === 0 || monthlyData.every(d => d.produccion === 0) ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin datos de cosecha registrados</p>
          </div>
        ) : (
          <div className="h-64 sm:h-72 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis
                dataKey="mes"
                stroke="#a3906a"
                style={{ fontSize: 10 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="produccion"
                stroke="#f0a41c"
                strokeWidth={3}
                dot={{ fill: '#f0a41c', r: 5 }}
                activeDot={{ r: 7, fill: '#ffc961' }}
                name="Producción"
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* ============ 4. ANÁLISIS ESTACIONAL ============ */}
      <motion.div
        className={cardCls}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h3 className={`${titleCls} mb-1`}>Análisis Estacional</h3>
        <p className="font-mono text-[10px] uppercase tracking-widest text-husk mb-4">
          Producción por estación · {currentYear}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {SEASONS.map(s => {
            const data = seasonData.find(d => d.nombre === s.label);
            return (
              <div key={s.id} className="rounded-xl border border-line bg-ink/40 p-3 text-center">
                <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">{s.label}</p>
                <p className="font-display text-xl font-black text-honey">{data?.produccion ?? 0} kg</p>
              </div>
            );
          })}
        </div>

        {peakMonths.length > 0 && (
          <p className="text-sm text-husk mb-4">
            <span className="text-cream font-semibold">Meses pico: </span>
            {peakMonths.map((p, i) => (
              <span key={p.name}>
                {p.name}: {p.kg}kg{i < peakMonths.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        )}

        <div className="mb-5">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Comparativa anual</p>
          <div className="flex flex-wrap items-center gap-6">
            <p className="text-sm text-cream">
              <span className="text-honey font-bold">{currentYear}:</span> {currentYearTotal} kg
            </p>
            {hasPrevYear ? (
              <>
                <p className="text-sm text-cream">
                  <span className="text-husk font-bold">{prevYear}:</span> {prevYearTotal} kg
                </p>
                {prevYearTotal > 0 && (
                  <p className={`text-sm font-semibold ${currentYearTotal >= prevYearTotal ? 'text-sage' : 'text-coral'}`}>
                    {currentYearTotal >= prevYearTotal
                      ? `▲ +${(((currentYearTotal - prevYearTotal) / prevYearTotal) * 100).toFixed(0)}%`
                      : `▼ ${(((prevYearTotal - currentYearTotal) / prevYearTotal) * 100).toFixed(0)}%`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-husk">Sin datos del año anterior</p>
            )}
          </div>
        </div>

        <div className="h-64 sm:h-72 overflow-x-auto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyStackedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
            <XAxis
                dataKey="mes"
                stroke="#a3906a"
                style={{ fontSize: 10 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
            <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {hasPrevYear && (
              <Bar dataKey="anterior" name="Año anterior" stackId="a" fill="#b97d15" radius={[0, 0, 0, 0]} />
            )}
            <Bar dataKey="actual" name="Año actual" stackId="a" fill="#f0a41c" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Comparativa Anual */}
      <motion.div
        className={cardCls}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h3 className={`${titleCls} mb-4`}>Comparativa Anual</h3>
        {yearlyData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin datos históricos</p>
          </div>
        ) : (
          <div className="h-64 sm:h-72 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis
              dataKey="año"
              stroke="#a3906a"
              style={{ fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
              <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="produccion" fill="#f0a41c" radius={[8, 8, 0, 0]} name="Producción" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* ============ 3. SALUD DEL COLMENAR ============ */}
      <motion.div
        className={cardCls}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <h3 className={`${titleCls} mb-4`}>Salud del Colmenar</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-husk">
                <p>Sin colmenas registradas</p>
              </div>
            ) : (
              <div className="h-64 overflow-x-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {(healthNow !== null || healthMonthAgo !== null) && (
              <div className="rounded-xl border border-line bg-ink/40 p-4">
                <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Tendencia de Salud</p>
                <p className="text-sm text-cream">
                  {healthMonthAgo !== null ? (
                    <>Hace 1 mes: <span className="font-semibold text-husk">{healthMonthAgo.toFixed(0)}%</span> saludables → Hoy: <span className="font-semibold text-sage">{healthNow?.toFixed(0)}%</span></>
                  ) : (
                    <>Hoy: <span className="font-semibold text-sage">{healthNow?.toFixed(0)}%</span> saludables</>
                  )}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-line bg-ink/40 p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Aceptación de Reinas (cría)</p>
              {queenAcceptanceRate === null ? (
                <p className="text-sm text-husk">Sin lotes de cría con resultado</p>
              ) : (
                <p className="font-display text-2xl font-black text-sage">{queenAcceptanceRate.toFixed(0)}% de reinas aceptadas</p>
              )}
            </div>

            <div className="rounded-xl border border-line bg-ink/40 p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-husk mb-2">Inspecciones / Semana</p>
              {inspectionsPerColonyWeek === null ? (
                <p className="text-sm text-husk">Sin inspecciones recientes</p>
              ) : (
                <p className="font-display text-2xl font-black text-cream">
                  {inspectionsPerColonyWeek.toFixed(2)} <span className="text-sm font-normal text-husk">por colmena</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Capa técnica: varroa vs umbral, fuerza y reinas por año */}
      <TechStatsCards hives={[...hives, ...nuclei]} inspections={inspections} />

      {/* Evolución de Varroa */}
      <motion.div
        className={cardCls}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <h3 className={`${titleCls} mb-4`}>Evolución de Varroa</h3>
        {varroaData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin datos de inspección</p>
          </div>
        ) : (
          <div className="h-64 sm:h-72 overflow-x-auto">
          {/* min-w: las etiquetas son fechas ("17 sept"), mas largas que un mes
              de 3 letras. El area de trazado en un movil de 375px queda en
              ~281px, asi que con muchas inspecciones se encimarian. */}
          <div className="min-w-[360px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={varroaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis
                dataKey="fecha"
                stroke="#a3906a"
                style={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="varroa"
                stroke="#e4603f"
                fill="#e4603f"
                fillOpacity={0.3}
                strokeWidth={2}
                name="Varroa"
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
          </div>
        )}
      </motion.div>

      {/* Inspecciones por Mes */}
      <motion.div
        className={cardCls}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        <h3 className={`${titleCls} mb-4`}>Inspecciones por Mes</h3>
        {inspectionsData.length === 0 || inspectionsData.every(d => d.inspecciones === 0) ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin inspecciones registradas este año</p>
          </div>
        ) : (
          <div className="h-64 sm:h-72 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={inspectionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis
                dataKey="mes"
                stroke="#a3906a"
                style={{ fontSize: 10 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="inspecciones" fill="#a3bf7f" radius={[8, 8, 0, 0]} name="Inspecciones" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* ============ 5. EFICIENCIA POR APIARIO ============ */}
      {apiaryEfficiency.length > 1 && (
        <motion.div
          className={cardCls}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <h3 className={`${titleCls} mb-1`}>Eficiencia por Apiario</h3>
          <p className="font-mono text-[10px] uppercase tracking-widest text-husk mb-4">
            Comparativa entre tus apiarios
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {apiaryEfficiency.map(ap => (
              <div
                key={ap.id}
                className={`rounded-xl border p-4 ${
                  ap.isCurrent ? 'border-honey/60 bg-honey/5' : 'border-line bg-ink/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display text-lg font-bold text-cream">{ap.name}</p>
                  {ap.isCurrent && (
                    <span className="rounded-full bg-honey/20 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-honey">
                      Actual
                    </span>
                  )}
                </div>
                <p className="text-sm text-cream">
                  <span className="text-honey font-semibold">{ap.total} kg totales</span>
                  <span className="text-husk"> · {ap.hives} colmenas · </span>
                  <span className="text-husk">{ap.perHive} kg/colmena</span>
                </p>
              </div>
            ))}
          </div>

          <div className="max-h-80 overflow-y-auto">
          <ResponsiveContainer width="100%" height={Math.max(160, apiaryEfficiency.length * 52)}>
            <BarChart data={apiaryEfficiency} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" horizontal={false} />
              <XAxis type="number" stroke="#a3906a" style={{ fontSize: '12px' }} unit=" kg" />
              <YAxis type="category" dataKey="name" stroke="#a3906a" style={{ fontSize: '12px' }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="kg totales" fill="#a3bf7f" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}