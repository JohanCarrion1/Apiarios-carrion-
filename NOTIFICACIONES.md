Fix: la campana de notificaciones abre pantalla completa pero debe abrir un dropdown/popover pequeño al lado del ícono

**Problema actual:**
Al hacer clic en la campana de notificaciones (ResponsiveHeader), la app navega a una pantalla completa de "Notificaciones". El usuario quiere ver las alertas en una ventana emergente pequeña (dropdown) sin salir del Dashboard.

**Comportamiento esperado:**
- Al hacer clic en la campana: se abre un dropdown/popover anclado a la derecha del ícono
- El dropdown muestra lista de notificaciones/alertas recientes (máximo 5-10)
- Cada notificación muestra: ícono, título, mensaje breve, timestamp
- Click fuera del dropdown o en la X → cierra el dropdown
- Click en una notificación → puede navegar a la sección relevante (opcional)
- Badge rojo con número de notificaciones no leídas se mantiene en la campana
- Botón "Marcar todas como leídas" en el footer del dropdown

**Implementación técnica:**

1. **Componente NotificationDropdown:**
- Crear en `src/components/NotificationDropdown.tsx`
- Usar posición absolute/fixed con cálculo de posición respecto a la campana
- Ancho máximo: 320px en móvil, 400px en desktop
- Altura máxima: 400px con scroll interno si hay muchas notificaciones
- Estilo: fondo oscuro (bg-gray-900), borde ámbar, sombra
- Animación: fade-in + slide-down (0.2s)

2. **Estado del dropdown:**
- `isOpen: boolean` controla visibilidad
- `anchorRef: RefObject` referencia al botón de la campana
- Click outside handler: cerrar al hacer clic fuera (useEffect con event listener)
- Cerrar al presionar Escape (keydown listener)

3. **Contenido del dropdown:**
- Header: "Notificaciones" + badge de no leídas + botón X para cerrar
- Lista de notificaciones (mapear desde el array de reminders/alerts):
  - Tipo: recordatorio, alerta de cría, stock bajo, floración
  - Ícono según tipo (🔔, , 📦, 🌸)
  - Título: "Mañana: Enjaulado lote #3"
  - Subtítulo: "Hace 2 horas" o "D+9"
  - Indicador visual de no leído (punto azul/ámbar)
- Footer: "Ver todas" (opcional, lleva a vista completa) + "Marcar todas como leídas"

4. **Integración con NotificationBell:**
- El componente NotificationBell (que ya existe en ResponsiveHeader) debe:
  - Tener el ref para anclar el dropdown
  - Toggle del estado isOpen al hacer clic
  - Mostrar el badge con count de notificaciones no leídas
  - Renderizar NotificationDropdown condicionalmente

5. **Datos de notificaciones:**
- Usar el mismo sistema de reminders ya creado (src/utils/reminders.ts)
- Filtrar: solo notificaciones de los últimos 7 días (configurable)
- Ordenar: más recientes primero
- Marcar como leídas al abrir el dropdown (opcional) o al hacer clic en "Marcar todas"

6. **Responsive:**
- En móvil: dropdown ocupa 90% del ancho de pantalla, centrado debajo de la campana
- En desktop: dropdown anclado a la derecha, width fijo 350px
- Ajustar posición si está cerca del borde derecho (evitar que se salga de pantalla)

7. **Accesibilidad:**
- aria-label en la campana: "Ver notificaciones, X no leídas"
- aria-expanded en el botón según isOpen
- role="dialog" en el dropdown
- Cierre con tecla Escape

**Criterios de verificación:**
- Click en campana → aparece dropdown pequeño debajo/al lado derecho
- Dropdown muestra 3-5 notificaciones de ejemplo (recordatorios, alertas de cría, stock bajo)
- Click fuera → dropdown se cierra
- Tecla Escape → dropdown se cierra
- Badge rojo muestra número correcto de no leídas
- "Marcar todas como leídas" → badge desaparece, notificaciones marcadas como leídas
- En móvil: dropdown se ve completo sin cortarse
- Animación suave al abrir/cerrar (0.2s)

**No tocar:**
- El sistema de reminders existente (solo leer datos, no modificar lógica)
- Otras funcionalidades del header
- La vista completa de notificaciones (puede existir como fallback, pero el dropdown es el default)

TECNOLOGÍAS: React, TypeScript, TailwindCSS, positionamiento absolute/fixed, event listeners
