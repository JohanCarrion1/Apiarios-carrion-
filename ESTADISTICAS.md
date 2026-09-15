Mejoras en Estadísticas: producción por colmena y análisis avanzado

**Nuevas secciones en Estadísticas:**

**1. Ranking de producción:**
- "Top 5 colmenas productoras" (últimos 3 meses)
- Lista ordenada de mayor a menor producción
- Muestra: código de colmena, kg totales, número de cosechas
- Toggle: "Último mes" / "Últimos 3 meses" / "Temporada completa"
- Gráfico de barras horizontal comparativo

**2. Producción por colmena (detalle):**
- Selector de colmena
- Gráfico de línea: producción mes a mes
- Total acumulado temporada
- Promedio por cosecha
- Comparación con promedio del apiario ("20% por encima del promedio")

**3. Salud del colmenar:**
- Gráfico circular: % saludables / revisión / alerta / sin reina
- Tendencia temporal: "Hace 1 mes: 80% saludables → Hoy: 90%"
- Tasa de aceptación de reinas (de cría): "85% de reinas aceptadas"
- Número promedio de inspecciones por colmena/semana

**4. Análisis estacional:**
- Producción por estación (primavera/verano/otoño/invierno)
- Meses pico: "Septiembre: 45kg · Octubre: 38kg"
- Comparativa año actual vs año anterior (si hay datos)
- Gráfico de barras apiladas por mes

**5. Eficiencia por apiario:**
- Si hay múltiples apiarios: comparativa entre ellos
- "Apiario Huaraz: 120kg totales · Apiario Caraz: 85kg"
- Producción promedio por colmena en cada apiario

**Criterios de verificación:**
- Con 3 colmenas que tienen cosechas: mostrar ranking correcto
- Seleccionar C-01: ver su gráfico mensual y total acumulado
- Cambiar de apiario: las estadísticas se recalculan solo para ese apiario
- Gráficos se ven bien en móvil (responsive)

TECNOLOGÍAS: React, TypeScript, TailwindCSS, gráficos con librería existente (recharts o similar)
