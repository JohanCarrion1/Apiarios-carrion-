Restaurar el botón "Regresar a inicio" que fue eliminado accidentalmente del encabezado

**Problema:**
El botón "Regresar a inicio" (píldora ámbar con flecha) fue eliminado del encabezado (ResponsiveHeader.tsx). Debe volver a aparecer junto al menú hamburguesa.

**Comportamiento esperado:**
- Botón tipo píldora ámbar con flecha ← y texto "Regresar a inicio"
- Pegado a la izquierda del menú hamburguesa
- Visible en todas las vistas del dashboard
- Al hacer clic: vuelve a la pantalla de selección de apiario conservando sesión

**Ubicación:**
- `src/components/ResponsiveHeader.tsx`
- Debe estar en el mismo contenedor del menú hamburguesa, a su izquierda

**Estructura:**
```tsx
<button
  onClick={onHome}
  className="flex items-center gap-2 bg-amber-500 text-gray-900 px-4 py-2 rounded-full text-sm font-medium hover:bg-amber-400 transition-colors"
  aria-label="Regresar a inicio"
  title="Regresar a inicio"
>
  <span>←</span>
  <span>Regresar a inicio</span>
</button>
```

**Criterios de verificación:**
- El botón aparece en el encabezado junto al hamburguesa
- Al hacer clic vuelve a la pantalla de selección de apiario
- Mantiene el estilo ámbar/oscuro coherente con la app
- No rompe el layout del header

**No tocar:**
- Otras funcionalidades del header
- La campana de notificaciones
- El menú hamburguesa

TECNOLOGÍAS: React, TypeScript, TailwindCSS
