Mover el contador "X colonias/núcleos distribución por calles" a la fila del título "Colmenas"/"Núcleos"

**Problema:**
El contador "8 colonias distribución por calles" (en Colmenas) y "1 núcleos · 1 núcleos distribución por calles" (en Núcleos) aparece flotando a la derecha, separado del título. Debe estar en la misma fila que el título, alineado a la derecha.

**Solución:**
En `src/components/HiveComb.tsx`, mover el bloque del contador dentro del mismo contenedor del título, usando flexbox para alinearlos en una fila:

```tsx
<div className="flex items-end justify-between mb-4">
  <div>
    <p className="text-xs font-mono uppercase tracking-wider text-husk">MAPA DEL BANCAL</p>
    <h2 className="text-3xl font-bold text-cream">Colmenas</h2>
  </div>
  <div className="text-right">
    <p className="text-lg font-mono text-cream">8 colonias</p>
    <p className="text-xs text-husk">distribución por calles</p>
  </div>
</div>
```

**Corrección adicional:**
- "1 núcleos · 1 núcleos" → debe ser solo "1 núcleo" (singular, sin duplicar)
- Usar singular cuando es 1: "1 núcleo", "2 núcleos", "8 colmenas"

**Criterios de verificación:**
- En Colmenas: título "Colmenas" a la izquierda, "8 colonias / distribución por calles" a la derecha, misma fila
- En Núcleos: título "Núcleos" a la izquierda, "1 núcleo / distribución por calles" a la derecha, misma fila
- Responsive: en móvil el contador puede ir debajo si no hay espacio

**No tocar:**
- Chips de filtro
- Buscador
- Hexágonos
- Botón "+"

TECNOLOGÍAS: React, TypeScript, TailwindCSS, flexbox
