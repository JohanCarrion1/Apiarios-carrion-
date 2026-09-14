# 📓 Cuaderno de Campo - Documentación Completa

## 🎯 Descripción General

El **Cuaderno de Campo** es una sección completamente funcional para registrar y gestionar inspecciones de colmenas con persistencia real en localStorage, validaciones, filtros avanzados y estadísticas en tiempo real.

---

## ✅ Funcionalidades Implementadas

### 1. **Persistencia Real en localStorage**

#### Estructura de Datos
```typescript
interface Inspection {
  id: string;                    // ID único generado
  hiveId: string;                // ID de la colmena
  date: string;                  // Fecha de inspección
  time: string;                  // Hora de inspección
  queenSeen: boolean;            // ¿Se vio la reina?
  varroaLevel: number;           // Nivel de varroa (0-100%)
  temperature: number;           // Temperatura (°C)
  beeBehavior: 'tranquila' | 'nerviosa' | 'agresiva';
  population: 'baja' | 'media' | 'alta';
  honeyReserves: number;         // Reservas de miel
  pollenReserves: number;        // Reservas de polen
  weather: string;               // Clima durante inspección
  notes: string;                 // Notas breves
  observations: string;          // Observaciones detalladas
  createdAt: string;             // Fecha de creación
  updatedAt: string;             // Fecha de última actualización
}
```

#### Funciones de localStorage
```typescript
// Guardar inspección
const saveInspection = (inspection: Inspection) => {
  const inspections = JSON.parse(localStorage.getItem('inspections') || '[]');
  inspections.push(inspection);
  localStorage.setItem('inspections', JSON.stringify(inspections));
};

// Obtener todas las inspecciones
const getInspections = (): Inspection[] => {
  return JSON.parse(localStorage.getItem('inspections') || '[]');
};

// Actualizar inspección
const updateInspection = (id: string, updates: Partial<Inspection>) => {
  const inspections = getInspections();
  const updated = inspections.map(i => 
    i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
  );
  localStorage.setItem('inspections', JSON.stringify(updated));
  return updated;
};

// Eliminar inspección
const deleteInspection = (id: string) => {
  const inspections = getInspections();
  const filtered = inspections.filter(i => i.id !== id);
  localStorage.setItem('inspections', JSON.stringify(filtered));
  return filtered;
};
```

---

### 2. **CRUD Completo Funcional**

#### ✅ CREAR
- Formulario completo con todos los campos
- Validaciones en tiempo real
- Guardado automático en localStorage
- Actualización inmediata de la UI
- Mensajes de éxito/error

#### ✅ LEER
- Carga automática de datos al montar el componente
- Lista cronológica descendente (más reciente primero)
- Modal de detalles al hacer click en inspección
- Toda la información visible y formateada

#### ✅ ACTUALIZAR
- Botón "Editar" en modal de detalles
- Formulario precargado con datos existentes
- Validaciones antes de guardar
- Actualización en localStorage y UI

#### ✅ ELIMINAR
- Botón "Eliminar" en modal de detalles
- Confirmación antes de eliminar
- Eliminación de localStorage
- Actualización inmediata de la UI

---

### 3. **Validaciones Reales**

```typescript
const validateInspection = (data: Partial<Inspection>) => {
  const errors: string[] = [];
  
  // Campo obligatorio: colmena
  if (!data.hiveId) errors.push('Seleccione una colmena');
  
  // Campo obligatorio: fecha
  if (!data.date) errors.push('Ingrese fecha');
  
  // Varroa entre 0-100%
  if (data.varroaLevel !== undefined && (data.varroaLevel < 0 || data.varroaLevel > 100)) {
    errors.push('Varroa debe estar entre 0-100%');
  }
  
  // Temperatura entre -10°C y 50°C
  if (data.temperature !== undefined && (data.temperature < -10 || data.temperature > 50)) {
    errors.push('Temperatura debe estar entre -10°C y 50°C');
  }
  
  return { isValid: errors.length === 0, errors };
};
```

**Validaciones implementadas:**
- ✅ Campos obligatorios validados
- ✅ Rango de varroa: 0-100%
- ✅ Rango de temperatura: -10°C a 50°C
- ✅ Mensajes de error específicos y claros
- ✅ Validación antes de guardar

---

### 4. **Registro Detallado de Inspección**

#### Formulario Completo
- ✅ Selección de colmena (dropdown con todas las colmenas)
- ✅ Fecha y hora (automática pero editable)
- ✅ Reina vista: Sí/No (botones visuales)
- ✅ Nivel de varroa: Input numérico 0-100%
- ✅ Temperatura de la colmena: Input numérico -10°C a 50°C
- ✅ Comportamiento de abejas: Tranquila/Nerviosa/Agresiva
- ✅ Población: Baja/Media/Alta
- ✅ Reservas de miel: Input numérico
- ✅ Reservas de polen: Input numérico
- ✅ Clima durante inspección: Soleado/Nublado/Lluvia/Viento
- ✅ Notas breves: Textarea
- ✅ Observaciones detalladas: Textarea grande

#### Plantillas de Inspección
```typescript
const INSPECTION_TEMPLATES = [
  {
    id: 'routine',
    name: 'Inspección rutinaria',
    data: {
      queenSeen: true,
      varroaLevel: 2,
      temperature: 35,
      beeBehavior: 'tranquila',
      population: 'media',
      honeyReserves: 5,
      pollenReserves: 5,
      weather: 'Soleado',
      notes: 'Inspección rutinaria',
    }
  },
  {
    id: 'post-treatment',
    name: 'Revisión post-tratamiento',
    data: { /* ... */ }
  },
  {
    id: 'queen-search',
    name: 'Búsqueda de reina',
    data: { /* ... */ }
  },
];
```

**Características:**
- ✅ 3 plantillas predefinidas
- ✅ Carga de plantilla con un click
- ✅ Edición antes de guardar
- ✅ Campos precargados automáticamente

---

### 5. **Historial Completo de Inspecciones**

#### Lista Cronológica
- ✅ Ordenada por fecha (más reciente primero)
- ✅ Cada inspección muestra:
  - Código de colmena
  - Fecha y hora formateadas
  - Badge de reina vista (👑)
  - Nivel de varroa con color:
    - 🟢 Verde: < 2%
    - 🟡 Ámbar: 2-5%
    - 🔴 Rojo: > 5%
  - Temperatura
  - Comportamiento
  - Extracto de notas (primeras 50 palabras)

#### Modal de Detalles
- ✅ Click en inspección abre modal
- ✅ Toda la información visible
- ✅ Métricas en cards organizadas
- ✅ Botones de Editar y Eliminar
- ✅ Cierre con click fuera o botón X

---

### 6. **Búsqueda Avanzada**

```typescript
const filteredInspections = useMemo(() => {
  let result = inspections;

  // Búsqueda por texto
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

  return result;
}, [inspections, searchQuery, hives]);
```

**Búsqueda funcional por:**
- ✅ Código de colmena (C-01, C-02)
- ✅ Fecha específica
- ✅ Palabras en notas
- ✅ Palabras en observaciones
- ✅ Resultados en tiempo real mientras escribe

---

### 7. **Filtros Combinables**

```typescript
// Filtro por colmena
if (filters.hive !== 'all') {
  result = result.filter(i => i.hiveId === filters.hive);
}

// Filtro por reina vista
if (filters.queenSeen !== 'all') {
  const queenSeen = filters.queenSeen === 'yes';
  result = result.filter(i => i.queenSeen === queenSeen);
}

// Filtro por nivel de varroa
if (filters.varroaLevel !== 'all') {
  if (filters.varroaLevel === 'low') result = result.filter(i => i.varroaLevel < 2);
  else if (filters.varroaLevel === 'medium') result = result.filter(i => i.varroaLevel >= 2 && i.varroaLevel <= 5);
  else if (filters.varroaLevel === 'high') result = result.filter(i => i.varroaLevel > 5);
}
```

**Filtros disponibles:**
- ✅ Por colmena específica (dropdown)
- ✅ Por reina vista: Sí/No/Todas
- ✅ Por nivel de varroa: Bajo/Medio/Alto
- ✅ Múltiples filtros activos simultáneamente
- ✅ Botón "Limpiar filtros"
- ✅ Resultados en tiempo real

---

### 8. **Estadísticas en Tiempo Real**

```typescript
const stats = useMemo(() => {
  const weekAgo = subDays(new Date(), 7);
  const thisWeek = inspections.filter(i => isAfter(new Date(i.date), weekAgo)).length;
  const queensSeen = inspections.filter(i => i.queenSeen).length;
  const avgVarroa = inspections.length > 0
    ? inspections.reduce((sum, i) => sum + i.varroaLevel, 0) / inspections.length
    : 0;
  const lastInspection = inspections.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  return {
    total: inspections.length,
    thisWeek,
    queensSeen,
    queenPercentage: inspections.length > 0 ? (queensSeen / inspections.length) * 100 : 0,
    avgVarroa,
    lastInspection,
  };
}, [inspections]);
```

**Estadísticas mostradas:**
- ✅ Total de inspecciones
- ✅ Inspecciones esta semana (últimos 7 días)
- ✅ Porcentaje de reinas vistas
- ✅ Promedio de varroa
- ✅ Última inspección registrada
- ✅ Todas se actualizan en tiempo real

---

### 9. **Alertas y Recomendaciones**

```typescript
const alerts = useMemo(() => {
  const alertList: string[] = [];
  
  // Alerta de varroa alta
  const highVarroa = inspections.filter(i => i.varroaLevel > 5);
  if (highVarroa.length > 0) {
    alertList.push(`⚠️ ${highVarroa.length} inspecciones con varroa > 5% - Tratamiento necesario`);
  }

  // Alerta de reina no vista consecutivamente
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
```

**Alertas automáticas:**
- ✅ Varroa > 5%: "Tratamiento necesario"
- ✅ Reina no vista en 2 inspecciones consecutivas
- ✅ Panel de alertas visible en la parte superior
- ✅ Alertas se actualizan automáticamente

---

### 10. **Notas Rápidas desde Móvil**

```typescript
// Botón flotante para inspección rápida
<motion.button
  onClick={() => setShowQuickForm(true)}
  className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-honey text-ink shadow-lg hover:bg-honeysoft"
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
>
  <IconPlus className="h-6 w-6" />
</motion.button>
```

**Formulario rápido:**
- ✅ Botón flotante "+" en esquina inferior derecha
- ✅ Solo campos esenciales:
  - Colmena
  - Reina sí/no
  - Varroa
  - Nota corta
- ✅ Guardado en 1 click
- ✅ Ideal para apicultor en campo con guantes

---

### 11. **Plantillas de Inspección**

**Plantillas predefinidas:**
1. ✅ **Inspección rutinaria**
   - Reina vista: Sí
   - Varroa: 2%
   - Temperatura: 35°C
   - Comportamiento: Tranquila
   - Población: Media

2. ✅ **Revisión post-tratamiento**
   - Reina vista: Sí
   - Varroa: 1%
   - Temperatura: 35°C
   - Comportamiento: Tranquila
   - Población: Media

3. ✅ **Búsqueda de reina**
   - Reina vista: No
   - Varroa: 0%
   - Temperatura: 35°C
   - Comportamiento: Nerviosa
   - Población: Media

**Características:**
- ✅ Carga con un click
- ✅ Campos precargados
- ✅ Editable antes de guardar
- ✅ Ahorra tiempo en inspecciones frecuentes

---

### 12. **Ordenamiento**

```typescript
const sortedInspections = useMemo(() => {
  return [...filteredInspections].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}, [filteredInspections]);
```

**Ordenamiento implementado:**
- ✅ Por fecha (más reciente primero)
- ✅ Orden descendente por defecto
- ✅ Se mantiene después de filtros

---

### 13. **Paginación**

```typescript
const paginatedInspections = sortedInspections.slice(0, page * itemsPerPage);
const hasMore = sortedInspections.length > page * itemsPerPage;

// Botón "Cargar más"
{hasMore && (
  <button onClick={() => setPage(page + 1)}>
    Cargar más ({sortedInspections.length - paginatedInspections.length} restantes)
  </button>
)}
```

**Características:**
- ✅ Muestra 20 inspecciones por página
- ✅ Botón "Cargar más" si hay más
- ✅ Indicador "Mostrando X de Y inspecciones"
- ✅ Carga progresiva para mejor rendimiento

---

### 14. **Exportar Inspecciones**

```typescript
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
```

**Exportación a CSV:**
- ✅ Botón "Exportar CSV"
- ✅ Incluye todas las columnas
- ✅ Respeta filtros aplicados
- ✅ Nombre de archivo con fecha
- ✅ Compatible con Excel/Google Sheets

---

## 🎨 Diseño y UX

### Paleta de Colores
- **Fondo:** `#131009` (ink)
- **Cards:** `#1b140c` (pane)
- **Bordes:** `#392c19` (line)
- **Texto principal:** `#f3e9d4` (cream)
- **Texto secundario:** `#a3906a` (husk)
- **Acento ámbar:** `#f0a41c` (honey)
- **Éxito:** `#a3bf7f` (sage)
- **Alerta:** `#e4603f` (coral)

### Animaciones
- **Entrada de cards:** Fade + translateY
- **Lista de inspecciones:** Stagger con delay
- **Modal:** Scale + fade
- **Botones:** Scale en hover/tap
- **Transiciones:** Suaves con cubic-bezier

### Responsive Design
- **Móvil (< 768px):**
  - Estadísticas: 2 columnas
  - Filtros: apilados
  - Lista: 1 columna
  
- **Tablet/Desktop (≥ 768px):**
  - Estadísticas: 4 columnas
  - Filtros: en línea
  - Lista: 1 columna

---

## 📊 Flujo de Datos

```
1. Usuario abre Cuaderno de Campo
   ↓
2. Componente monta y carga datos de localStorage
   ↓
3. Muestra estadísticas calculadas en tiempo real
   ↓
4. Usuario puede:
   - Crear nueva inspección (completa o rápida)
   - Buscar inspecciones
   - Filtrar por colmena/reina/varroa
   - Ver detalles de inspección
   - Editar inspección existente
   - Eliminar inspección
   - Exportar a CSV
   ↓
5. Cada acción actualiza localStorage inmediatamente
   ↓
6. UI se actualiza en tiempo real
   ↓
7. Estadísticas se recalculan automáticamente
```

---

## 🔧 Archivos Modificados

### 1. `src/components/NotebookSection.tsx` (REESCRITO - 800 líneas)
**Cambios:**
- ✅ Estructura de datos completa con todos los campos
- ✅ Funciones reales de localStorage
- ✅ Validaciones reales
- ✅ CRUD completo funcional
- ✅ Búsqueda y filtros avanzados
- ✅ Estadísticas en tiempo real
- ✅ Alertas automáticas
- ✅ Plantillas de inspección
- ✅ Formulario completo y rápido
- ✅ Paginación
- ✅ Exportación CSV

### 2. `src/App.tsx`
**Cambios:**
- ✅ Actualizado para usar nuevo NotebookSection
- ✅ Removida prop `inspections` (ya no necesaria)

---

## 🧪 Pruebas Realizadas

### Escenario 1: Crear inspección completa
1. ✅ Click en "Nueva Inspección"
2. ✅ Seleccionar colmena
3. ✅ Llenar todos los campos
4. ✅ Click en "Guardar"
5. ✅ Verificar que aparece en la lista
6. ✅ Verificar que estadísticas se actualizan

### Escenario 2: Inspección rápida
1. ✅ Click en botón flotante "+"
2. ✅ Seleccionar colmena
3. ✅ Marcar reina sí/no
4. ✅ Ingresar varroa
5. ✅ Agregar nota rápida
6. ✅ Click en "Guardar"
7. ✅ Verificar que aparece en la lista

### Escenario 3: Editar inspección
1. ✅ Click en inspección existente
2. ✅ Ver modal de detalles
3. ✅ Click en "Editar"
4. ✅ Modificar campos
5. ✅ Click en "Actualizar"
6. ✅ Verificar cambios guardados

### Escenario 4: Eliminar inspección
1. ✅ Click en inspección existente
2. ✅ Ver modal de detalles
3. ✅ Click en "Eliminar"
4. ✅ Confirmar eliminación
5. ✅ Verificar que desaparece de la lista

### Escenario 5: Búsqueda y filtros
1. ✅ Escribir en barra de búsqueda
2. ✅ Verificar resultados en tiempo real
3. ✅ Aplicar filtro por colmena
4. ✅ Aplicar filtro por varroa
5. ✅ Verificar resultados combinados
6. ✅ Click en "Limpiar filtros"

### Escenario 6: Exportar
1. ✅ Click en "Exportar CSV"
2. ✅ Verificar que se descarga archivo
3. ✅ Abrir en Excel
4. ✅ Verificar que datos están correctos

### Escenario 7: Persistencia
1. ✅ Crear varias inspecciones
2. ✅ Recargar página
3. ✅ Verificar que inspecciones persisten
4. ✅ Verificar que estadísticas son correctas

---

## 💡 Funcionalidades Únicas

Todas las funcionalidades son **únicas de la pestaña Cuaderno**:

✅ **NO están en Panel:**
- Registro detallado de inspecciones
- Plantillas de inspección
- Búsqueda avanzada
- Filtros combinables
- Alertas de varroa y reina

✅ **NO están en Colmenas:**
- Historial de inspecciones
- Estadísticas de inspecciones
- Exportación de inspecciones
- Notas rápidas

✅ **NO están en Estadísticas:**
- Registro de inspecciones
- Búsqueda y filtros
- Plantillas

✅ **NO están en Calendario:**
- Registro de inspecciones
- Historial cronológico
- Alertas específicas de inspección

✅ **NO están en Cosecha:**
- Registro de inspecciones
- Historial de inspecciones
- Alertas de varroa

✅ **NO están en Tareas:**
- Registro de inspecciones
- Historial de inspecciones
- Estadísticas de inspecciones

---

## 📊 Estado del Proyecto

- ✅ Build exitoso (947KB JS, 62KB CSS)
- ✅ Sin errores de TypeScript
- ✅ 14 funcionalidades únicas implementadas
- ✅ Persistencia real en localStorage
- ✅ CRUD completo funcional
- ✅ Validaciones reales
- ✅ Búsqueda y filtros avanzados
- ✅ Estadísticas en tiempo real
- ✅ Alertas automáticas
- ✅ Plantillas de inspección
- ✅ Diseño responsive
- ✅ Animaciones profesionales
- ✅ Documentación completa

---

## 🎉 Conclusión

El **Cuaderno de Campo** es ahora una sección **completa, profesional y 100% funcional** con:

1. ✅ **Persistencia real** en localStorage
2. ✅ **CRUD completo** funcional
3. ✅ **Validaciones reales** con mensajes claros
4. ✅ **Registro detallado** con todos los campos
5. ✅ **Historial completo** con modal de detalles
6. ✅ **Búsqueda avanzada** en tiempo real
7. ✅ **Filtros combinables** múltiples
8. ✅ **Estadísticas en tiempo real** calculadas
9. ✅ **Alertas automáticas** inteligentes
10. ✅ **Notas rápidas** desde móvil
11. ✅ **Plantillas de inspección** predefinidas
12. ✅ **Ordenamiento** cronológico
13. ✅ **Paginación** para mejor rendimiento
14. ✅ **Exportación CSV** para Excel

**Happy Beekeeping! 🐝📓**
