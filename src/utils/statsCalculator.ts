import { loadHives, loadInspections, loadTasks, loadHarvests } from './storage';
import type { Hive, Inspection, Task } from '../types/hive';

// Tipo para Harvest (no exportado en types/hive)
interface Harvest {
  id: string;
  hiveId: string;
  date: string;
  honeyKg: number;
  pollenG?: number;
  waxKg?: number;
  propolisG?: number;
  type?: string;
  pricePerKg?: number;
  notes?: string;
  conditions?: string;
}

// Funciones para cargar datos reales desde localStorage
export const loadRealHives = (): Hive[] => {
  return loadHives();
};

export const loadRealInspections = (): Inspection[] => {
  return loadInspections();
};

export const loadRealTasks = (): Task[] => {
  return loadTasks();
};

export const loadRealHarvests = (): Harvest[] => {
  return loadHarvests();
};

// Calcular estadísticas básicas
export const calculateBasicStats = () => {
  const hives = loadRealHives();
  const inspections = loadRealInspections();
  const tasks = loadRealTasks();
  const harvests = loadRealHarvests();

  // Total de colmenas
  const totalHives = hives.length;

  // Producción total de miel
  const totalProduction = harvests.reduce((sum, h) => sum + (h.honeyKg || 0), 0);

  // Promedio de varroa
  const avgVarroa = inspections.length > 0
    ? inspections.reduce((sum, i) => sum + (i.varroa || 0), 0) / inspections.length
    : null;

  // Tasa de salud (colmenas saludables / total)
  const healthyHives = hives.filter(h => h.status === 'saludable').length;
  const healthRate = totalHives > 0 ? (healthyHives / totalHives) * 100 : null;

  // Inspecciones este mes
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const inspectionsThisMonth = inspections.filter(i => {
    const date = new Date(i.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;

  // Cosechas este mes
  const harvestsThisMonth = harvests.filter(h => {
    const date = new Date(h.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;

  // Tareas pendientes
  const pendingTasks = tasks.filter(t => !t.completed).length;

  return {
    totalHives,
    totalProduction,
    avgVarroa,
    healthRate,
    inspectionsThisMonth,
    harvestsThisMonth,
    pendingTasks,
  };
};

// Datos para gráfico de producción por mes
export const getMonthlyProductionData = () => {
  const harvests = loadRealHarvests();
  
  if (harvests.length === 0) {
    return [];
  }

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentYear = new Date().getFullYear();
  
  // Agrupar cosechas por mes del año actual
  const monthlyData = months.map((month, index) => {
    const monthHarvests = harvests.filter(h => {
      const date = new Date(h.date);
      return date.getMonth() === index && date.getFullYear() === currentYear;
    });
    
    const totalKg = monthHarvests.reduce((sum, h) => sum + (h.honeyKg || 0), 0);
    
    return {
      mes: month,
      produccion: Math.round(totalKg * 10) / 10, // Redondear a 1 decimal
    };
  });

  return monthlyData;
};

// Datos para gráfico comparativo anual
export const getYearlyComparisonData = () => {
  const harvests = loadRealHarvests();
  
  if (harvests.length === 0) {
    return [];
  }

  // Obtener años únicos
  const years = [...new Set(harvests.map(h => new Date(h.date).getFullYear()))].sort();
  
  // Tomar últimos 3 años
  const lastYears = years.slice(-3);
  
  const yearlyData = lastYears.map(year => {
    const yearHarvests = harvests.filter(h => 
      new Date(h.date).getFullYear() === year
    );
    
    const totalKg = yearHarvests.reduce((sum, h) => sum + (h.honeyKg || 0), 0);
    
    return {
      año: year.toString(),
      produccion: Math.round(totalKg * 10) / 10,
    };
  });

  return yearlyData;
};

// Datos para gráfico de distribución de estados
export const getStatusDistributionData = () => {
  const hives = loadRealHives();
  
  if (hives.length === 0) {
    return [];
  }

  const statusCount = {
    saludable: hives.filter(h => h.status === 'saludable').length,
    revision: hives.filter(h => h.status === 'revision').length,
    alerta: hives.filter(h => h.status === 'alerta').length,
    sin_reina: hives.filter(h => h.status === 'sin_reina').length,
  };

  const STATUS_COLORS = {
    saludable: '#a3bf7f',
    revision: '#f0a41c',
    alerta: '#e4603f',
    sin_reina: '#bd93b8',
  };

  return [
    { name: 'Saludable', value: statusCount.saludable, color: STATUS_COLORS.saludable },
    { name: 'Revisión', value: statusCount.revision, color: STATUS_COLORS.revision },
    { name: 'Alerta', value: statusCount.alerta, color: STATUS_COLORS.alerta },
    { name: 'Sin Reina', value: statusCount.sin_reina, color: STATUS_COLORS.sin_reina },
  ].filter(d => d.value > 0);
};

// Datos para gráfico de evolución de varroa
export const getVarroaEvolutionData = () => {
  const inspections = loadRealInspections();
  
  if (inspections.length === 0) {
    return [];
  }

  // Ordenar inspecciones por fecha
  const sortedInspections = [...inspections].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Tomar últimas 10 inspecciones
  const lastInspections = sortedInspections.slice(-10);

  return lastInspections.map(inspection => {
    const date = new Date(inspection.date);
    return {
      fecha: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      varroa: inspection.varroa || 0,
    };
  });
};

// Datos para gráfico de producción por colmena
export const getProductionByHiveData = () => {
  const harvests = loadRealHarvests();
  const hives = loadRealHives();
  
  if (harvests.length === 0) {
    return [];
  }

  // Agrupar cosechas por colmena
  const hiveProduction: Record<string, number> = {};
  
  harvests.forEach(harvest => {
    const hiveId = harvest.hiveId;
    if (!hiveProduction[hiveId]) {
      hiveProduction[hiveId] = 0;
    }
    hiveProduction[hiveId] += harvest.honeyKg || 0;
  });

  // Convertir a array y ordenar por producción
  const data = Object.entries(hiveProduction)
    .map(([hiveId, totalKg]) => {
      const hive = hives.find(h => h.id === hiveId);
      return {
        colmena: hive?.code || hiveId.substring(0, 5),
        produccion: Math.round(totalKg * 10) / 10,
      };
    })
    .sort((a, b) => b.produccion - a.produccion)
    .slice(0, 10); // Top 10 colmenas

  return data;
};

// Datos para gráfico de inspecciones por mes
export const getInspectionsByMonthData = () => {
  const inspections = loadRealInspections();
  
  if (inspections.length === 0) {
    return [];
  }

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentYear = new Date().getFullYear();
  
  const monthlyData = months.map((month, index) => {
    const monthInspections = inspections.filter(i => {
      const date = new Date(i.date);
      return date.getMonth() === index && date.getFullYear() === currentYear;
    });
    
    return {
      mes: month,
      inspecciones: monthInspections.length,
    };
  });

  return monthlyData;
};
