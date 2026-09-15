Fix: los modales de confirmación (eliminar colmena/núcleo) tienen superposición visual con el hexágono de la entidad detrás

**Problema:**
Al abrir el modal "Eliminar Colmena" o "Eliminar Núcleo", el hexágono con el código (C-10, N-01) se ve superpuesto con el modal, rompiendo la jerarquía visual. El modal debería tapar completamente el contenido de atrás con un backdrop oscuro semitransparente.

**Diagnóstico:**
- Buscar en src/components los modales de confirmación de eliminación (probablemente en HiveDetail.tsx, HiveComb.tsx, o un componente Modal/ConfirmDialog compartido)
- Verificar z-index del modal vs z-index del hexágono
- Verificar si existe un backdrop/overlay oscuro detrás del modal

**Fix exigido:**

1. **Backdrop oscuro:**
- El modal debe tener un backdrop (overlay) que cubra toda la pantalla
- Color: negro con opacidad 60-70% (bg-black/60 o bg-black/70)
- El backdrop debe tener z-index mayor que el hexágono pero menor que el modal
- Click en el backdrop → cierra el modal (opcional pero recomendado)

2. **Z-index correcto:**
- Backdrop: z-40 o z-50
- Modal (la tarjeta con el contenido): z-50 o z-60 (mayor que el backdrop)
- Hexágono y contenido de atrás: z-index menor (normal, sin z-index explícito o z-10)
- El modal debe estar al FINAL del DOM (portal) o con position fixed para garantizar que esté encima

3. **Centrado del modal:**
- El modal debe estar centrado vertical y horizontalmente
- Usar flexbox: `fixed inset-0 flex items-center justify-center`
- Padding lateral en móvil para que no toque los bordes

4. **Animación de entrada:**
- Fade-in del backdrop (opacity 0 → 1, 0.2s)
- Scale-in del modal (scale-95 → scale-100, 0.2s)
- Si ya existe animación, mantenerla pero asegurar que el backdrop también anime

5. **Cierre del modal:**
- Botón "Cancelar" → cierra modal
- Click en backdrop → cierra modal (opcional)
- Tecla Escape → cierra modal (si no está implementado)

6. **Aplicar a TODOS los modales de confirmación:**
- Eliminar colmena
- Eliminar núcleo
- Eliminar lote de cría
- Eliminar ítem de inventario
- Eliminar inspección
- Cualquier otro modal de confirmación existente

**Criterios de verificación:**
- Al abrir "Eliminar Colmena C-10": el hexágono C-10 NO se ve superpuesto con el modal
- El backdrop oscuro tapa todo el contenido de atrás
- El modal está centrado y se lee claramente
- Click en backdrop cierra el modal
- Lo mismo para "Eliminar Núcleo N-01"
- Los botones "Cancelar" y "Eliminar" funcionan correctamente
- La animación de entrada es suave

**No tocar:**
- El contenido del modal (texto, botones, advertencia)
- La lógica de eliminación
- Otros componentes que no sean modales de confirmación

TECNOLOGÍAS: React, TypeScript, TailwindCSS, z-index, position fixed, backdrop
