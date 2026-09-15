FIX DE RAÍZ: Los modales de eliminación NO tienen backdrop oscuro completo - el contenido de atrás (hexágonos) se ve a través del modal

**PROBLEMA VISUAL (ver captura):**
Al abrir "Eliminar Colmena C-08" o "Eliminar Núcleo N-XX":
- El hexágono C-08 se ve CLARAMENTE detrás del modal (arriba a la izquierda)
- NO hay un fondo oscuro que tape todo el contenido de atrás
- El modal parece "flotar" sin aislamiento visual
- Se ve el contenido de la página a través y alrededor del modal

**CAUSA RAÍZ:**
El modal NO tiene un backdrop/overlay de pantalla completa con `position: fixed` y `inset-0`. O el backdrop existe pero tiene z-index incorrecto, o no cubre toda la pantalla.

**SOLUCIÓN OBLIGATORIA:**

Cada modal de confirmación (eliminar colmena, eliminar núcleo, eliminar lote) DEBE tener esta estructura EXACTA:

```tsx
{showDeleteModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* BACKDROP - tapa TODA la pantalla */}
    <div 
      className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      onClick={() => setShowDeleteModal(false)}
    />
    
    {/* MODAL - centrado encima del backdrop */}
    <div className="relative bg-gray-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
      {/* contenido del modal aquí */}
    </div>
  </div>
)}
```

**REGLAS CLAVE:**
1. El contenedor padre debe tener `fixed inset-0 z-[100]` (cubre toda la pantalla, z-index muy alto)
2. El backdrop debe tener `absolute inset-0 bg-black/80` (negro 80% opacidad, tapa TODO)
3. El modal debe tener `relative` (para estar encima del backdrop)
4. NO usar `createPortal` - mantener todo en el mismo árbol de React
5. NO usar `pointer-events-none` - el backdrop debe recibir clicks para cerrar

**ARCHIVOS A MODIFICAR:**

1. `src/components/HiveDetail.tsx` - modal "Eliminar Colmena" y "Eliminar Núcleo"
2. `src/components/BreedingSection.tsx` - modal "Eliminar lote de cría"
3. `src/components/BreedingDetail.tsx` - modal "Eliminar lote desde detalle"
4. Cualquier otro componente que tenga modal de confirmación

**CRITERIOS DE VERIFICACIÓN:**

- Al abrir "Eliminar Colmena C-08":
  - El hexágono C-08 NO debe verse (tapado completamente por el backdrop negro)
  - Toda la pantalla debe estar oscurecida (80% negro)
  - Solo el modal debe ser visible (centrado, con borde ámbar)
  - Click en el fondo oscuro → cierra el modal
  - Click en "Cancelar" → cierra el modal
  - Click en "Eliminar" → elimina y cierra

- Lo mismo para "Eliminar Núcleo"
- Lo mismo para "Eliminar lote de cría"

**PRUEBA VISUAL:**
Después del fix, al abrir el modal debe verse como:
- Pantalla completa negra semitransparente
- Modal centrado con fondo gris oscuro
- NADA del contenido de atrás visible (ni hexágonos, ni títulos, ni nada)

**NO TOCAR:**
- El contenido interno del modal (texto, botones, advertencia)
- La lógica de eliminación
- Otros componentes que no sean modales

TECNOLOGÍAS: React, TypeScript, TailwindCSS, position fixed, z-index
