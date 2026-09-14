import { useState, useEffect } from 'react';
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
import {
  calculateBasicStats,
  getMonthlyProductionData,
  getYearlyComparisonData,
  getStatusDistributionData,
  getVarroaEvolutionData,
  getProductionByHiveData,
  getInspectionsByMonthData,
} from '../utils/statsCalculator';

// Custom tooltip para gráficos
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3 shadow-lg border border-line">
        <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.name === 'produccion' || entry.name === 'Producción' ? ' kg' : ''}
            {entry.name === 'varroa' || entry.name === 'Varroa' ? '%' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function StatsSection() {
  const [stats, setStats] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [varroaData, setVarroaData] = useState<any[]>([]);
  const [hiveProductionData, setHiveProductionData] = useState<any[]>([]);
  const [inspectionsData, setInspectionsData] = useState<any[]>([]);

  // Cargar datos reales al montar el componente
  useEffect(() => {
    const loadData = () => {
      setStats(calculateBasicStats());
      setMonthlyData(getMonthlyProductionData());
      setYearlyData(getYearlyComparisonData());
      setStatusData(getStatusDistributionData());
      setVarroaData(getVarroaEvolutionData());
      setHiveProductionData(getProductionByHiveData());
      setInspectionsData(getInspectionsByMonthData());
    };

    loadData();

    // Escuchar cambios en localStorage para actualizar en tiempo real
    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También actualizar cuando se hacen cambios en la misma pestaña
    const interval = setInterval(loadData, 2000); // Cada 2 segundos

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-husk">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas básicas */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Total Colmenas</p>
          <p className="font-display text-3xl font-black text-cream">
            {stats.totalHives}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Producción Total</p>
          <p className="font-display text-3xl font-black text-honey">
            {stats.totalProduction.toFixed(1)} kg
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Promedio Varroa</p>
          <p className="font-display text-3xl font-black text-cream">
            {stats.avgVarroa !== null ? `${stats.avgVarroa.toFixed(1)}%` : 'N/A'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Tasa de Salud</p>
          <p className="font-display text-3xl font-black text-sage">
            {stats.healthRate !== null ? `${stats.healthRate.toFixed(0)}%` : 'N/A'}
          </p>
        </div>
      </motion.div>

      {/* Estadísticas adicionales */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Inspecciones Este Mes</p>
          <p className="font-display text-2xl font-black text-cream">{stats.inspectionsThisMonth}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Cosechas Este Mes</p>
          <p className="font-display text-2xl font-black text-honey">{stats.harvestsThisMonth}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">Tareas Pendientes</p>
          <p className="font-display text-2xl font-black text-coral">{stats.pendingTasks}</p>
        </div>
      </motion.div>

      {/* Gráfico de Producción Mensual */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="font-display text-xl font-bold text-cream mb-4">Producción de Miel por Mes</h3>
        {monthlyData.length === 0 || monthlyData.every(d => d.produccion === 0) ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin datos de cosecha registrados</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis dataKey="mes" stroke="#a3906a" style={{ fontSize: '12px' }} />
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
        )}
      </motion.div>

      {/* Gráfico Comparativo Anual */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="font-display text-xl font-bold text-cream mb-4">Comparativa Anual</h3>
        {yearlyData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin datos históricos</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis dataKey="año" stroke="#a3906a" style={{ fontSize: '12px' }} />
              <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="produccion" fill="#f0a41c" radius={[8, 8, 0, 0]} name="Producción" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Gráfico de Distribución de Estados */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="font-display text-xl font-bold text-cream mb-4">Distribución de Estados</h3>
        {statusData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin colmenas registradas</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
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
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Gráfico de Evolución de Varroa */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h3 className="font-display text-xl font-bold text-cream mb-4">Evolución de Varroa</h3>
        {varroaData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin datos de inspección</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={varroaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis dataKey="fecha" stroke="#a3906a" style={{ fontSize: '12px' }} />
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
        )}
      </motion.div>

      {/* Gráfico de Producción por Colmena */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h3 className="font-display text-xl font-bold text-cream mb-4">Producción por Colmena (Top 10)</h3>
        {hiveProductionData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin datos de producción</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hiveProductionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis type="number" stroke="#a3906a" style={{ fontSize: '12px' }} unit=" kg" />
              <YAxis type="category" dataKey="colmena" stroke="#a3906a" style={{ fontSize: '12px' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="produccion" fill="#f0a41c" radius={[0, 8, 8, 0]} name="Producción" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Gráfico de Inspecciones por Mes */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <h3 className="font-display text-xl font-bold text-cream mb-4">Inspecciones por Mes</h3>
        {inspectionsData.length === 0 || inspectionsData.every(d => d.inspecciones === 0) ? (
          <div className="flex items-center justify-center h-64 text-husk">
            <p>Sin inspecciones registradas este año</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inspectionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis dataKey="mes" stroke="#a3906a" style={{ fontSize: '12px' }} />
              <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="inspecciones" fill="#a3bf7f" radius={[8, 8, 0, 0]} name="Inspecciones" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
