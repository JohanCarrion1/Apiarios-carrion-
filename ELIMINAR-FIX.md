URGENTE: La eliminación de colmenas Y núcleos se congela después del fix de MODAL.md

**Contexto:**
Antes del fix de MODAL.md, la eliminación funcionaba. Después de agregar portal + backdrop + z-index, tanto "Eliminar Colmena" como "Eliminar Núcleo" se quedan congelados al hacer clic en el botón "Eliminar".

**Diagnóstico prioritario (ejecutar PRIMERO):**

1. Agregar console.log en el onClick del botón "Eliminar":
```typescript
onClick={() => {
  console.log('[DELETE] Click en Eliminar, hiveId:', hive.id);
  console.log('[DELETE] onDelete existe:', typeof onDelete);
  try {
    onDelete(hive.id);
    console.log('[DELETE] onDelete ejecutado');
    setShowDeleteModal(false);
    console.log('[DELETE] Modal cerrado');
  } catch (e) {
    console.error('[DELETE] Error:', e);
  }
}}
```

2. Verificar en consola qué se imprime al hacer clic

**Hipótesis más probable:**

El portal está rompiendo el contexto. Solución: **NO usar portal**, usar position fixed normal.

**Fix aplicado:**

1. **Eliminar el portal** de los modales de confirmación:
- Quitar `createPortal` de HiveDetail.tsx
- El modal debe ser un div normal con `position: fixed`
- Mantener z-index alto (z-50) pero SIN portal

2. **Backdrop con pointer-events correcto:**
```tsx
{/* Backdrop */}
<div 
  className="fixed inset-0 bg-black/70 z-40"
  onClick={() => setShowDeleteModal(false)}
/>

{/* Modal */}
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
  <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full pointer-events-auto">
    {/* contenido */}
  </div>
</div>
```

Nota: `pointer-events-none` en el contenedor y `pointer-events-auto` en la tarjeta del modal.

3. **Verificar que onDelete se pasa correctamente:**
- En HiveDetail.tsx: el componente debe recibir `onDelete` como prop
- El botón debe llamar `onDelete(hive.id)` ANTES de cerrar el modal
- Cerrar modal: `setShowDeleteModal(false)`

4. **Aplicar el mismo fix a:**
- HiveDetail.tsx (eliminar colmena/núcleo)
- BreedingSection.tsx (eliminar lote de cría)
- BreedingDetail.tsx (eliminar lote desde detalle)
- Cualquier otro modal de confirmación

**Criterios de verificación:**
- Click en "Eliminar" → modal se cierra INMEDIATAMENTE
- La entidad desaparece del mapa/lista
- Consola muestra logs sin errores
- Al recargar, la entidad ya no existe
- Funciona para colmenas, núcleos, lotes de cría

**NO usar portal.** Mantener todo en el mismo árbol de React.

TECNOLOGÍAS: React, TypeScript, TailwindCSS, debugging
