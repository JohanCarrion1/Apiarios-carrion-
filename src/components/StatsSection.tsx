import { useMemo } from 'react';
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
import type { Hive, Inspection } from '../types/hive';
import { STATUS_COLORS } from '../types/hive';

interface StatsSectionProps {
  hives: Hive[];
  inspections: Inspection[];
}

// Datos de ejemplo para producción de miel (últimos 12 meses)
const generateHoneyData = () => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return months.map((month, index) => ({
    mes: month,
    produccion: Math.floor(Math.random() * 50) + 10 + (index >= 4 && index <= 8 ? 30 : 0),
  }));
};

// Datos comparativa anual
const generateYearlyData = () => {
  return [
    { año: '2024', produccion: 320 },
    { año: '2025', produccion: 370 },
    { año: '2026', produccion: 180 },
  ];
};

// Datos de distribución de estados
const generateStatusData = (hives: Hive[]) => {
  const statusCount = {
    saludable: hives.filter(h => h.status === 'saludable').length,
    revision: hives.filter(h => h.status === 'revision').length,
    alerta: hives.filter(h => h.status === 'alerta').length,
    sin_reina: hives.filter(h => h.status === 'sin_reina').length,
  };

  return [
    { name: 'Saludable', value: statusCount.saludable, color: STATUS_COLORS.saludable },
    { name: 'Revisión', value: statusCount.revision, color: STATUS_COLORS.revision },
    { name: 'Alerta', value: statusCount.alerta, color: STATUS_COLORS.alerta },
    { name: 'Sin Reina', value: statusCount.sin_reina, color: STATUS_COLORS.sin_reina },
  ].filter(d => d.value > 0);
};

// Datos de varroa a lo largo del tiempo
const generateVarroaData = (inspections: Inspection[]) => {
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      fecha: date.toLocaleDateString('es-ES', { month: 'short' }),
      bajo: Math.floor(Math.random() * 30) + 20,
      medio: Math.floor(Math.random() * 20) + 10,
      alto: Math.floor(Math.random() * 10) + 5,
      critico: Math.floor(Math.random() * 5),
    };
  });
  return last6Months;
};

// Custom tooltip para gráficos
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3 shadow-lg border border-line">
        <p className="text-xs font-mono uppercase tracking-wider text-husk mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.name === 'produccion' ? ' kg' : entry.name === 'Producción' ? ' kg' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function StatsSection({ hives, inspections }: StatsSectionProps) {
  const honeyData = useMemo(() => generateHoneyData(), []);
  const yearlyData = useMemo(() => generateYearlyData(), []);
  const statusData = useMemo(() => generateStatusData(hives), [hives]);
  const varroaData = useMemo(() => generateVarroaData(inspections), [inspections]);

  // Calcular estadísticas
  const totalHives = hives.length;
  const totalProduction = honeyData.reduce((sum, d) => sum + d.produccion, 0);
  const avgVarroa = inspections.length > 0
    ? (inspections.reduce((sum, i) => sum + i.varroa, 0) / inspections.length).toFixed(1)
    : '0.0';
  const healthRate = totalHives > 0
    ? Math.round((hives.filter(h => h.status === 'saludable').length / totalHives) * 100)
    : 0;

  const stats = [
    {
      label: 'Total Colmenas',
      value: totalHives,
      suffix: '',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: '#f0a41c',
    },
    {
      label: 'Producción Total',
      value: totalProduction,
      suffix: ' kg',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: '#ffc961',
    },
    {
      label: 'Promedio Varroa',
      value: parseFloat(avgVarroa),
      suffix: '%',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: parseFloat(avgVarroa) < 2 ? '#a3bf7f' : parseFloat(avgVarroa) < 3 ? '#f0a41c' : '#e4603f',
    },
    {
      label: 'Tasa de Salud',
      value: healthRate,
      suffix: '%',
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: healthRate >= 60 ? '#a3bf7f' : healthRate >= 40 ? '#f0a41c' : '#e4603f',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Cards de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: `${stat.color}20`, color: stat.color }}
              >
                {stat.icon}
              </div>
            </div>
            <motion.p
              className="font-display text-3xl font-black text-cream"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2, type: 'spring', stiffness: 200 }}
            >
              {stat.value}
              <span className="text-lg font-bold" style={{ color: stat.color }}>
                {stat.suffix}
              </span>
            </motion.p>
            <p className="mt-1 text-xs font-mono uppercase tracking-wider text-husk">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Línea: Producción de Miel */}
        <motion.div
          className="card p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-display text-xl font-bold text-cream mb-4">
            Producción de Miel por Mes
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={honeyData}>
              <defs>
                <linearGradient id="colorProduccion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f0a41c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f0a41c" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                fill="url(#colorProduccion)"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico de Barras: Comparativa Anual */}
        <motion.div
          className="card p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="font-display text-xl font-bold text-cream mb-4">
            Comparativa Anual
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis dataKey="año" stroke="#a3906a" style={{ fontSize: '12px' }} />
              <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="produccion" fill="#f0a41c" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico de Dona: Distribución de Estados */}
        <motion.div
          className="card p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="font-display text-xl font-bold text-cream mb-4">
            Distribución de Estados
          </h3>
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
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-cream text-3xl font-bold">
                {totalHives}
              </text>
              <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-husk text-xs">
                Total
              </text>
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico de Área: Varroa */}
        <motion.div
          className="card p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="font-display text-xl font-bold text-cream mb-4">
            Varroa a lo largo del Tiempo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={varroaData}>
              <defs>
                <linearGradient id="colorBajo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a3bf7f" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#a3bf7f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMedio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f0a41c" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f0a41c" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAlto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e4603f" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#e4603f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCritico" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#bd93b8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#bd93b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#392c19" />
              <XAxis dataKey="fecha" stroke="#a3906a" style={{ fontSize: '12px' }} />
              <YAxis stroke="#a3906a" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="bajo" stackId="1" stroke="#a3bf7f" fill="url(#colorBajo)" />
              <Area type="monotone" dataKey="medio" stackId="1" stroke="#f0a41c" fill="url(#colorMedio)" />
              <Area type="monotone" dataKey="alto" stackId="1" stroke="#e4603f" fill="url(#colorAlto)" />
              <Area type="monotone" dataKey="critico" stackId="1" stroke="#bd93b8" fill="url(#colorCritico)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Botón de Exportar */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <button
          onClick={() => {
            // Lógica de exportación a CSV
            const csvContent = [
              ['Colmena', 'Estado', 'Reina', 'Ubicación', 'Notas'].join(','),
              ...hives.map(h => [
                h.code,
                h.status,
                h.queenYear || '',
                h.location || '',
                h.notes || '',
              ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `reporte_colmenas_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
          }}
          className="flex items-center gap-2 rounded-xl bg-honey px-6 py-3 font-semibold text-ink transition-all hover:bg-honeysoft hover:shadow-[0_8px_30px_rgba(240,164,28,.4)] active:scale-95"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar Reporte CSV
        </button>
      </motion.div>
    </div>
  );
}
