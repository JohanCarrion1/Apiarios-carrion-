import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { STATUS_COLORS, type Hive, type HiveStatus, type EntityType } from "../types/hive";
import { Pulse } from './Animations';

interface Props {
  hives: Hive[];
  selectedId: string;
  onSelect: (id: string) => void;
  filter: HiveStatus | "todas";
  onFilter: (f: HiveStatus | "todas") => void;
  query: string;
  onAdd: () => void;
  entityType?: EntityType;
  favorites?: string[];
  onToggleFavorite?: (hiveId: string) => void;
  compareMode?: boolean;
  selectedForCompare?: string[];
  onToggleCompare?: (hiveId: string) => void;
  calculateHealth?: (hive: Hive) => number;
}

function shortDays(date: string | null): string {
  if (!date) return "—";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d <= 0) return "hoy";
  if (d === 1) return "1d";
  return `${d}d`;
}

export default function HiveComb({ 
  hives, 
  selectedId, 
  onSelect, 
  filter, 
  onFilter, 
  query, 
  onAdd,
  entityType = 'colmena',
  favorites = [],
  onToggleFavorite,
  compareMode = false,
  selectedForCompare = [],
  onToggleCompare,
  calculateHealth,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [positions, setPositions] = useState<Array<{
    hive: Hive;
    x: number;
    y: number;
    hexWidth: number;
    hexHeight: number;
  }>>([]);

  const isDim = (h: Hive) =>
    (filter !== "todas" && h.status !== filter) ||
    (query.trim() !== "" && !h.code.toLowerCase().includes(query.trim().toLowerCase()));

  // Calcular estadísticas para el header
  const totalColonies = hives.length;
  const totalNuclei = hives.filter(h => h.code.includes('N')).length;
  const healthyCount = hives.filter(h => h.status === 'saludable').length;
  const revisionCount = hives.filter(h => h.status === 'revision').length;
  const alertCount = hives.filter(h => h.status === 'alerta').length;
  const noQueenCount = hives.filter(h => h.status === 'sin_reina').length;

  const chips: { key: HiveStatus | "todas"; label: string; n: number; color?: string }[] = [
    { key: "todas", label: "TODAS", n: hives.length, color: "#f0a41c" },
    { key: "saludable", label: "SALUDABLE", n: healthyCount, color: STATUS_COLORS.saludable },
    { key: "revision", label: "REVISIÓN", n: revisionCount, color: STATUS_COLORS.revision },
    { key: "alerta", label: "ALERTA", n: alertCount, color: STATUS_COLORS.alerta },
    { key: "sin_reina", label: "SIN REINA", n: noQueenCount, color: STATUS_COLORS.sin_reina },
  ];

  // Filtrar colmenas visibles
  const visibleHives = useMemo(() => hives.filter(h => !isDim(h)), [hives, filter, query]);

  // Calcular posiciones del panal en useEffect con las dependencias correctas
  useEffect(() => {
    if (!containerRef.current || visibleHives.length === 0) {
      setPositions([]);
      return;
    }

    const calculatePositions = () => {
      const containerWidth = containerRef.current!.offsetWidth;
      
      // Para un panal real con separación uniforme:
      // - Gap horizontal: 8% del ancho del hexágono (reducido de 15%)
      // - Gap vertical: 5% de la altura del hexágono (reducido de 15%)
      const gapHorizontal = 0.08; // 8% de gap horizontal (más compacto)
      const gapVertical = 0.05; // 5% de gap vertical (más compacto)
      
      // Calcular tamaño base del hexágono (aumentado 18%: de 8.5 a 7.2)
      const hexWidth = Math.min(containerWidth / 7.2, 118); // Aumentado 18%
      const hexHeight = hexWidth * 1.1547; // Proporción exacta de hexágono (√3)
      
      // Espaciado entre hexágonos (incluye el gap)
      const hexSpacingX = hexWidth * (1 + gapHorizontal);
      const hexSpacingY = hexHeight * (1 - gapVertical); // Las filas se superponen ligeramente

      const colsEven = 7;
      const colsOdd = 6;
      
      const positions: Array<{
        hive: Hive;
        x: number;
        y: number;
        hexWidth: number;
        hexHeight: number;
        row: number;
      }> = [];

      let placed = 0;
      let row = 0;

      while (placed < visibleHives.length) {
        const colsInRow = row % 2 === 0 ? colsEven : colsOdd;
        for (let col = 0; col < colsInRow && placed < visibleHives.length; col++) {
          // Offset exacto de medio hexágono para filas impares (patrón de panal auténtico)
          const x = col * hexSpacingX + (row % 2 === 1 ? hexSpacingX / 2 : 0);
          const y = row * hexSpacingY;
          positions.push({
            hive: visibleHives[placed],
            x,
            y,
            hexWidth,
            hexHeight,
            row
          });
          placed++;
        }
        row++;
      }

      // Calcular offsets para centrar el panal completo
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      positions.forEach((pos) => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x + hexWidth);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y + hexHeight);
      });

      const panalWidth = maxX - minX;
      const panalHeight = maxY - minY;
      
      // Centrar horizontalmente el panal completo
      const offsetX = (containerWidth - panalWidth) / 2 - minX;
      const offsetY = -minY;

      // Aplicar offsets
      positions.forEach((pos) => {
        pos.x += offsetX;
        pos.y += offsetY;
      });

      setDimensions({ width: containerWidth, height: panalHeight });
      setPositions(positions);
    };

    calculatePositions();

    // Agregar event listener de resize UNA SOLA VEZ con cleanup
    const handleResize = () => {
      calculatePositions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [visibleHives.length]); // Solo depende del número de colmenas visibles

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'saludable': return 'saludable';
      case 'revision': return 'revision';
      case 'alerta': return 'alerta';
      case 'sin_reina': return 'sin-reina';
      default: return '';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'alerta': return '⚠️';
      case 'sin_reina': return '👑';
      default: return '';
    }
  };

  return (
    <div>
      {/* Header con resumen general */}
      <motion.div 
        className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-ink text-honey">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-husk mb-0.5">Mapa del Bancal</p>
            <h3 className="font-display text-2xl font-bold text-cream">Colmenas</h3>
          </div>
        </div>
        
        <div className="text-right">
          <p className="font-mono text-sm text-cream">
            <span className="font-bold">{totalColonies}</span> colonias
            {totalNuclei > 0 && <span className="text-husk"> · <span className="font-bold">{totalNuclei}</span> núcleos</span>}
          </p>
          <p className="text-xs text-husk mt-0.5">distribución por calles</p>
        </div>
      </motion.div>

      {/* Filtros tipo pill */}
      <motion.div 
        className="mb-6 flex flex-wrap items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {chips.map((c) => {
          const active = filter === c.key;
          return (
            <motion.button
              key={c.key}
              onClick={() => onFilter(c.key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                active
                  ? "border-honey bg-honey text-ink shadow-[0_0_20px_rgba(240,164,28,.4)]"
                  : "border-line bg-pane text-husk hover:border-honey/60 hover:text-cream"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {c.color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
              {c.label}
              <span 
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${active ? "bg-ink/20 text-ink" : ""}`}
                style={!active && c.color ? { 
                  background: `${c.color}20`,
                  color: c.color,
                  border: `1px solid ${c.color}40`
                } : {}}
              >
                {c.n}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Mapa hexagonal con posicionamiento absoluto */}
      <motion.div 
        className="card relative overflow-visible px-6 py-8 sm:px-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Botón flotante de agregar - Fuera del área de celdas */}
        <motion.button
          onClick={onAdd}
          className="absolute right-2 top-2 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-honey text-ink shadow-[0_4px_20px_rgba(240,164,28,.5)] transition-all hover:shadow-[0_6px_30px_rgba(240,164,28,.7)]"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>

        {/* Contenedor del panal - Ancho completo para centrado correcto */}
        <div 
          ref={containerRef}
          className="relative w-full"
          style={{ 
            minHeight: dimensions.height > 0 ? `${dimensions.height}px` : '200px'
          }}
        >
          {positions.length === 0 && visibleHives.length === 0 && (
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mx-auto mb-4 flex h-16 w-14 items-center justify-center hexclip bg-honey/20">
                <svg className="h-8 w-8 text-honey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-husk text-sm font-medium">
                {filter === "todas" ? "No hay colmenas registradas" : "No hay colmenas con este filtro"}
              </p>
            </motion.div>
          )}

          {/* Hexágonos posicionados absolutamente */}
          {positions.map((pos, index) => {
            const { hive, x, y, hexWidth, hexHeight } = pos;
            const statusClass = getStatusClass(hive.status);
            const icon = getStatusIcon(hive.status);
            const selected = hive.id === selectedId;
            const isFavorite = favorites.includes(hive.id);
            const isSelectedForCompare = selectedForCompare.includes(hive.id);
            const health = calculateHealth ? calculateHealth(hive) : 100;
            const daysSinceInspection = Math.floor((Date.now() - new Date(hive.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

            const hexCell = (
              <motion.div
                key={hive.id}
                className={`hex-cell absolute cursor-pointer ${statusClass} ${selected ? 'selected' : ''}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${hexWidth}px`,
                  height: `${hexHeight}px`,
                  zIndex: selected ? 100 : 1
                }}
                onClick={() => {
                  if (compareMode && onToggleCompare) {
                    onToggleCompare(hive.id);
                  } else {
                    onSelect(hive.id);
                  }
                }}
                whileHover={{ scale: 1.08, zIndex: 100 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03, type: "spring", stiffness: 260, damping: 20 }}
              >
                {/* SVG del hexágono */}
                <svg viewBox="0 0 100 115" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                  <defs>
                    <radialGradient id={`hexGradient-${hive.id}`} cx="50%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#3a3530"/>
                      <stop offset="100%" stopColor="#1a1510"/>
                    </radialGradient>
                  </defs>
                  <polygon 
                    points="50,2 97,28 97,87 50,113 3,87 3,28"
                    fill={`url(#hexGradient-${hive.id})`}
                    stroke={STATUS_COLORS[hive.status]}
                    strokeWidth="3"
                    style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}
                  />
                </svg>

                {/* Contenido */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {icon && (
                    <div style={{ fontSize: `${Math.max(hexWidth * 0.16, 11)}px`, marginBottom: '4px' }}>
                      {icon}
                    </div>
                  )}
                  <div style={{ fontSize: `${Math.max(hexWidth * 0.2, 12)}px`, fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' }}>
                    {hive.code}
                  </div>
                  <div style={{ fontSize: `${Math.max(hexWidth * 0.13, 9)}px`, opacity: 0.7, fontWeight: 500 }}>
                    {shortDays(hive.updatedAt)}
                  </div>
                </div>
              </motion.div>
            );

            // Si está en alerta, envolver con Pulse
            if (hive.status === 'alerta') {
              return (
                <Pulse key={hive.id}>
                  {hexCell}
                </Pulse>
              );
            }

            return hexCell;
          })}
        </div>

        <motion.p 
          className="relative mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-husk"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Toca una celda para ver detalles de la colmena
        </motion.p>
      </motion.div>

      <style>{`
        .hex-cell.selected {
          filter: drop-shadow(0 0 12px rgba(240, 164, 28, 0.8));
        }
      `}</style>
    </div>
  );
}
