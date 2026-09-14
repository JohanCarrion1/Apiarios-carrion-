# Corrección del Error "Too Many Re-renders" en HiveComb.tsx

## 🐛 Problema Identificado

**Error:** `Too many re-renders. React limits the number of renders to prevent an infinite loop.`

Este error ocurre cuando un componente entra en un bucle infinito de renders, generalmente causado por llamar a `setState` directamente en el cuerpo del componente o dentro del render.

## 🔍 Causa Raíz

En el código original, el problema estaba en estas líneas:

```typescript
// ❌ INCORRECTO - Causa bucle infinito
const [positions, setPositions] = useState(calculatePositions()); // Línea 146

useEffect(() => {
  setPositions(calculatePositions()); // ❌ Línea 149 - Causa re-render
  // ...
}, [visibleHives.length]);
```

### ¿Por qué causa un bucle infinito?

1. El componente se renderiza por primera vez
2. Se ejecuta `useState(calculatePositions())` que internamente llama a `setDimensions`
4. `setDimensions` causa un re-render del componente
6. El useEffect se ejecuta y llama a `setPositions(calculatePositions())`
7. `setPositions` causa otro re-render
9. El ciclo se repite infinitamente

## ✅ Solución Implementada

### 1. Inicialización Correcta del Estado

```typescript
// ✅ CORRECTO - Inicializar con array vacío
const [positions, setPositions] = useState<Array<{
  hive: Hive;
  x: number;
  y: number;
  hexWidth: number;
  hexHeight: number;
}>>([]);
```

### 2. Cálculo Dentro de useEffect con Dependencias Correctas

```typescript
// ✅ CORRECTO - Todo el cálculo dentro del useEffect
useEffect(() => {
  if (!containerRef.current || visibleHives.length === 0) {
    setPositions([]);
    return;
  }

  const calculatePositions = () => {
    // ... todo el cálculo ...
    setDimensions({ width: panalWidth, height: panalHeight });
    setPositions(positions);
  };

  calculatePositions();

  // Event listener de resize UNA SOLA VEZ con cleanup
  const handleResize = () => {
    calculatePositions();
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [visibleHives.length]); // ✅ Solo depende del número de colmenas visibles
```

### 3. useMemo para Cálculos Costosos

```typescript
// ✅ CORRECTO - useMemo para evitar recálculos innecesarios
const visibleHives = useMemo(
  () => hives.filter(h => !isDim(h)), 
  [hives, filter, query]
);
```

## 🎯 Cambios Clave Realizados

### Antes (Código con Error)

```typescript
// ❌ Cálculo en el cuerpo del componente
const calculatePositions = () => {
  // ...
  setDimensions({ width: panalWidth, height: panalHeight });
  return positions.map(pos => ({ ... }));
};

// ❌ Inicialización que causa re-render
const [positions, setPositions] = useState(calculatePositions());

// ❌ useEffect que causa re-render
useEffect(() => {
  setPositions(calculatePositions());
  // ...
}, [visibleHives.length]);
```

### Después (Código Corregido)

```typescript
// ✅ Estado inicializado vacío
const [positions, setPositions] = useState<Array<{...}>>([]);

// ✅ useMemo para filtrar colmenas
const visibleHives = useMemo(
  () => hives.filter(h => !isDim(h)), 
  [hives, filter, query]
);

// ✅ Todo el cálculo dentro del useEffect
useEffect(() => {
  if (!containerRef.current || visibleHives.length === 0) {
    setPositions([]);
    return;
  }

  const calculatePositions = () => {
    // ... cálculo completo ...
    setDimensions({ width: panalWidth, height: panalHeight });
    setPositions(positions);
  };

  calculatePositions();

  // Event listener con cleanup
  const handleResize = () => calculatePositions();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [visibleHives.length]); // ✅ Dependencia correcta
```

## 🔄 Dependencias del useEffect

### Dependencia Correcta

```typescript
}, [visibleHives.length]); // ✅ Solo el número de colmenas
```

**¿Por qué solo `visibleHives.length`?**

- ✅ Cuando cambia el filtro, `visibleHives.length` cambia
- ✅ Cuando cambia el query, `visibleHives.length` cambia
- ✅ Cuando se agregan/eliminan colmenas, `visibleHives.length` cambia
- ❌ No necesitamos `visibleHives` completo porque solo nos importa la cantidad
- ❌ No necesitamos `filter` o `query` directamente porque ya están en `visibleHives`

### Dependencias Incorrectas (que causarían bucles)

```typescript
// ❌ INCORRECTO - Causaría bucle infinito
}, [visibleHives]); // El objeto cambia en cada render

// ❌ INCORRECTO - Causaría bucle infinito
}, [visibleHives, filter, query]); // filter y query cambian en cada render
```

## 🎯 Event Listener de Resize

### Antes (Podría causar problemas)

```typescript
// ❌ Podría acumular listeners
useEffect(() => {
  setPositions(calculatePositions());
  window.addEventListener('resize', handleResize);
  // ❌ Falta cleanup
}, [visibleHives.length]);
```

### Después (Correcto con cleanup)

```typescript
// ✅ Correcto con cleanup
useEffect(() => {
  const handleResize = () => calculatePositions();
  window.addEventListener('resize', handleResize);
  
  // ✅ Cleanup: remueve el listener al desmontar
  return () => window.removeEventListener('resize', handleResize);
}, [visibleHives.length]);
```

## 📊 Flujo de Renders Correcto

### Flujo Inicial

```
1. Componente se monta
2. useState inicializa positions = []
3. useMemo calcula visibleHives
4. useEffect se ejecuta
5. calculatePositions() calcula posiciones
7. setPositions() actualiza el estado
9. Componente se re-renderiza con las posiciones
10. useEffect NO se ejecuta de nuevo (visibleHives.length no cambió)
11. ✅ Flujo estable
```

### Flujo al Cambiar Filtro

```
1. Usuario hace click en filtro "Saludable"
3. filter cambia a "saludable"
5. useMemo recalcula visibleHives (ahora solo saludables)
7. visibleHives.length cambia
9. useEffect se ejecuta
11. calculatePositions() recalcula posiciones
13. setPositions() actualiza el estado
15. Componente se re-renderiza
16. useEffect NO se ejecuta de nuevo
17. ✅ Flujo estable
```

### Flujo al Redimensionar Ventana

```
1. Usuario redimensiona la ventana
3. Evento resize se dispara
5. handleResize() ejecuta calculatePositions()
7. setPositions() actualiza el estado
9. Componente se re-renderiza
10. ✅ Flujo estable
```

## 🎯 Verificación de Otras Pestañas

### ✅ Inspecciones, Cosecha, Cuaderno, Tareas

**NO se ven afectadas** porque:

- ✅ Solo se modificó `HiveComb.tsx`
- ✅ Los otros componentes no usan `calculatePositions()`
- ✅ No tienen el patrón problemático de `setState` en el render
- ✅ Sus useEffects tienen dependencias correctas

### ✅ Verificación por Componente

**NotebookSection.tsx:**
```typescript
// ✅ No tiene el problema
useEffect(() => {
  // Carga datos desde localStorage
  // No llama a setState en el cuerpo
}, [user]); // Dependencia correcta
```

**Production.tsx:**
```typescript
// ✅ No tiene el problema
useEffect(() => {
  // Carga datos de cosechas
  // No llama a setState en el cuerpo
}, [user]);
```

**TasksSection.tsx:**
```typescript
// ✅ No tiene el problema
useEffect(() => {
  // Carga tareas
  // No llama a setState en el cuerpo
}, [user]);
```

## 📝 Código Completo Corregido

El archivo `src/components/HiveComb.tsx` ahora contiene:

### 1. Estado Inicializado Vacío

```typescript
const [positions, setPositions] = useState<Array<{
  hive: Hive;
  x: number;
  y: number;
  hexWidth: number;
  hexHeight: number;
}>>([]);
```

### 2. useMemo para Filtrar Colmenas

```typescript
const visibleHives = useMemo(
  () => hives.filter(h => !isDim(h)), 
  [hives, filter, query]
);
```

### 3. useEffect con Dependencias Correctas

```typescript
useEffect(() => {
  if (!containerRef.current || visibleHives.length === 0) {
    setPositions([]);
    return;
  }

  const calculatePositions = () => {
    // ... cálculo completo ...
    setDimensions({ width: panalWidth, height: panalHeight });
    setPositions(positions);
  };

  calculatePositions();

  const handleResize = () => calculatePositions();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [visibleHives.length]); // ✅ Dependencia correcta
```

## ✅ Resultado Final

### ✅ Problema Resuelto
- ✅ No más bucle infinito de renders
- ✅ El cálculo se ejecuta solo cuando es necesario
- ✅ Event listener se agrega una sola vez con cleanup
- ✅ Dependencias del useEffect son correctas

### ✅ Otras Pestañas Intactuales
- ✅ Inspecciones: Sin cambios
- ✅ Cosecha: Sin cambios
- ✅ Cuaderno: Sin cambios
- ✅ Tareas: Sin cambios
- ✅ Selector de apiarios: Sin cambios

### ✅ Build Exitoso

```
✓ 1892 modules transformed
✓ built in 12.43s
```

## 🎯 Resumen

El problema de "Too many re-renders" fue causado por llamar a `setState` directamente en el cuerpo del componente y en un useEffect que se ejecutaba en cada render. La solución fue:

1. **Inicializar el estado vacío** en lugar de llamar a una función
2. **Mover todo el cálculo** dentro de un useEffect con dependencias correctas
3. **Usar useMemo** para cálculos costosos que dependen de props
4. **Agregar cleanup** al event listener de resize
6. **Usar solo `visibleHives.length`** como dependencia, no el objeto completo

El componente ahora funciona correctamente sin bucles infinitos y las demás pestañas no se ven afectadas.
