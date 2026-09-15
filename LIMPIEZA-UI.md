Limpieza UI: eliminar elementos duplicados en vistas de Colmenas y Núcleos

**Problema:**
Tanto en la vista de Colmenas como en la de Núcleos aparecen elementos duplicados que no sirven y generan confusión visual.

**Elementos a eliminar (en AMBAS vistas):**

1. **Dropdown "Todas"/"Todos"** - filtro duplicado (ya existe el chip "TODAS"/"TODOS" funcional abajo)
2. **Dropdown "Código"** - no tiene utilidad, no ordena correctamente
3. **Sección "MAPA DEL BANCAL" con ícono de mapa** - duplicado del título que ya aparece arriba ("Colmenas" o "Núcleos")

**Archivos a modificar:**
- `src/components/HiveComb.tsx` - componente compartido que renderiza AMBAS vistas (colmenas y núcleos)
- Buscar y eliminar los dropdowns y la sección duplicada de "MAPA DEL BANCAL"

**Criterios de verificación:**

Vista de Colmenas debe mostrar SOLO:
- Título "Colmenas" (sin "MAPA DEL BANCAL" duplicado)
- Buscador "Buscar colmena..."
- Chips de filtro (TODAS, SALUDABLE, REVISIÓN, ALERTA, SIN REINA)
- Conteo "X colonias distribución por calles"
- Mapa de hexágonos

Vista de Núcleos debe mostrar SOLO:
- Título "Núcleos" (sin "MAPA DEL BANCAL" duplicado)
- Buscador "Buscar núcleo..."
- Chips de filtro (TODOS, SALUDABLE, REVISIÓN, ALERTA, SIN REINA)
- Conteo "X núcleos distribución por calles"
- Mapa de hexágonos

**No tocar:**
- Los chips de filtro funcionales
- El buscador
- El mapa de hexágonos
- El botón flotante "+"
- La parametrización por tipo de entidad

TECNOLOGÍAS: React, TypeScript, TailwindCSS
