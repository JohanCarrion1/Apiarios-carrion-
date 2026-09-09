# 📅 Calendario y Notificaciones - Documentación Completa

## 🎯 Funcionalidades Implementadas

### 1. Calendario Mensual Interactivo

#### Vista Principal
- ✅ **Grid de calendario mensual** con 7 columnas (Lun-Dom)
- ✅ **Navegación entre meses** con flechas ← →
- ✅ **Título dinámico** mostrando mes y año en español (ej: "septiembre 2026")
- ✅ **Días de la semana** encabezados (Lun, Mar, Mié, Jue, Vie, Sáb, Dom)
- ✅ **Día actual resaltado** con círculo ámbar y punto indicador
- ✅ **Días de otros meses** en gris claro (opacity 40%)

#### Marcadores de Eventos
- ✅ **Puntos de colores** según tipo de evento:
  - 🟢 Verde: Inspección
  - 🟡 Ámbar: Cosecha
  - 🔴 Rojo: Tratamiento
  - 🟣 Púrpura: Tarea
  - 🔵 Azul: Recordatorio
- ✅ **Múltiples puntos** si hay varios eventos en un día
- ✅ **Indicador "+N"** si hay más de 3 eventos
- ✅ **Click en día** → abre panel lateral con eventos

#### Animaciones
- ✅ **Entrada escalonada** de días (0.01s entre cada uno)
- ✅ **Hover effects** con scale 1.05
- ✅ **Transiciones suaves** al cambiar de mes
- ✅ **Fade-in** del título del mes

---

### 2. Panel de Eventos del Día

#### Diseño
- ✅ **Se desliza desde la derecha** (Framer Motion spring animation)
- ✅ **Ancho máximo** 448px (max-w-md)
- ✅ **Fondo oscuro** con borde izquierdo
- ✅ **Sombra pronunciada** para profundidad
- ✅ **Scroll interno** si hay muchos eventos

#### Header del Panel
- ✅ **Fecha formateada** (dd/MM/yyyy)
- ✅ **Etiqueta inteligente**: "Hoy", "Mañana", "Ayer" o fecha completa
- ✅ **Botón cerrar** con animación de rotación
- ✅ **Botón "Agregar Evento"** ámbar prominente

#### Lista de Eventos
- ✅ **Icono según tipo** con fondo de color
- ✅ **Título del evento** en negrita
- ✅ **Badge de prioridad** con color (Baja, Media, Alta, Urgente)
- ✅ **Metadatos**: tipo, hora, colmena asociada
- ✅ **Descripción** truncada si es larga
- ✅ **Botones de acción**: Editar y Eliminar
- ✅ **Animación escalonada** de entrada (0.05s entre eventos)

#### Estado Vacío
- ✅ **Mensaje amigable** cuando no hay eventos
- ✅ **Icono de calendario** grande
- ✅ **Sugerencia** para agregar evento

---

### 3. Formulario de Eventos

#### Campos del Formulario
1. **Tipo de Evento** (grid de botones)
   - Inspección
   - Cosecha
   - Tratamiento
   - Tarea
   - Recordatorio

2. **Título** (obligatorio)
   - Placeholder descriptivo
   - Validación de campo vacío

3. **Descripción** (opcional)
   - Textarea de 3 filas
   - Resize vertical permitido

4. **Fecha** (obligatorio)
   - Input type="date"
   - Valor por defecto: día seleccionado

5. **Hora** (opcional)
   - Input type="time"
   - Formato HH:mm

6. **Colmena Asociada** (opcional)
   - Select con lista de colmenas
   - Formato: "C-01 - Nombre"

7. **Prioridad** (grid de botones)
   - Baja (gris)
   - Media (ámbar)
   - Alta (rojo)
   - Urgente (rojo intenso)

#### Modos
- ✅ **Modo Creación**: formulario vacío
- ✅ **Modo Edición**: datos precargados
- ✅ **Validación**: título obligatorio
- ✅ **Animaciones**: scale + fade al abrir/cerrar

---

### 4. Sistema de Notificaciones

#### Campana en Header
- ✅ **Icono de campana** en esquina superior derecha
- ✅ **Badge rojo** con número de notificaciones no leídas
- ✅ **Badge "9+"** si hay más de 9 notificaciones
- ✅ **Animación de entrada** del badge (scale 0 → 1)
- ✅ **Hover effects** con scale 1.1

#### Panel de Notificaciones
- ✅ **Se desliza desde la derecha** (spring animation)
- ✅ **Ancho máximo** 448px
- ✅ **Header sticky** con título y contador
- ✅ **Botón "Marcar todas como leídas"**
- ✅ **Scroll interno** para muchas notificaciones

#### Tipos de Notificaciones
1. **Recordatorio de Inspección** (verde)
   - Se genera si última inspección > 14 días
   - Ej: "Colmena C-03 necesita revisión"
   - Descripción: "Han pasado 15 días desde la última inspección"

2. **Tratamiento Pendiente** (rojo)
   - Se genera si hay tarea de tratamiento próxima (7 días)
   - Ej: "Tarea pendiente: Aplicar tratamiento varroa"
   - Descripción: "Vence en 3 días" o "Vence hoy"

3. **Alerta de Estado** (rojo)
   - Se genera si estado = "alerta"
   - Ej: "Colmena C-05 en estado Alerta"
   - Descripción: "Esta colmena requiere atención inmediata"

4. **Cosecha Programada** (ámbar)
   - Se genera si hay evento de cosecha en próximos 7 días
   - Ej: "Cosecha programada: Cosecha de primavera"
   - Descripción: "Programada en 5 días" o "Programada para hoy"

5. **Alerta de Reina** (púrpura)
   - Se genera si estado = "sin_reina"
   - Ej: "Colmena C-08 sin reina detectada"
   - Descripción: "Se necesita introducir una nueva reina"

#### Interactividad
- ✅ **Click en notificación** → marca como leída
- ✅ **Navegación automática** al evento si existe
- ✅ **Punto azul** indicador de no leída
- ✅ **Tiempo relativo** (ej: "hace 2 horas", "hace 3 días")
- ✅ **Icono según tipo** con fondo de color

---

### 5. Generación Automática de Notificaciones

#### Lógica de Generación
```typescript
// Se ejecuta al cargar la app y cuando cambian datos
useEffect(() => {
  // 1. Revisar colmenas con última inspección > 14 días
  // 2. Revisar colmenas en estado "alerta"
  // 3. Revisar colmenas en estado "sin_reina"
  // 4. Revisar tareas pendientes con vencimiento en 7 días
  // 5. Revisar eventos de cosecha en próximos 7 días
}, [hives, tasks, events]);
```

#### Actualización en Tiempo Real
- ✅ Se regeneran al agregar/editar colmenas
- ✅ Se regeneran al agregar/editar tareas
- ✅ Se regeneran al agregar/editar eventos
- ✅ Persistencia en localStorage

---

### 6. Integración con Datos Existentes

#### Eventos
- ✅ **Persistencia en localStorage** (clave: `panal_events`)
- ✅ **Carga automática** al iniciar la app
- ✅ **Guardado automático** al cambiar eventos
- ✅ **Cálculo de días** desde última inspección
- ✅ **Filtrado por fecha** para panel del día

#### Notificaciones
- ✅ **Generación desde colmenas** (estado, última inspección)
- ✅ **Generación desde tareas** (fecha de vencimiento)
- ✅ **Generación desde eventos** (cosechas programadas)
- ✅ **Marcado como leídas** con persistencia

---

### 7. Diseño Visual

#### Paleta de Colores
- ✅ **Verde** (#a3bf7f): Inspección, saludable
- ✅ **Ámbar** (#f0a41c): Cosecha, revisión
- ✅ **Rojo** (#e4603f): Tratamiento, alerta
- ✅ **Púrpura** (#bd93b8): Tarea, sin reina
- ✅ **Azul** (#6fa8dc): Recordatorio

#### Tipografía
- ✅ **Títulos**: font-display, text-2xl, font-bold
- ✅ **Labels**: font-mono, text-xs, uppercase, tracking-wider
- ✅ **Cuerpo**: text-sm, text-cream/text-husk
- ✅ **Metadatos**: font-mono, text-[10px]

#### Espaciado
- ✅ **Cards**: padding 24px (p-6)
- ✅ **Grid gaps**: 8px (gap-2)
- ✅ **Sections**: margin-bottom 24px (mb-6)

---

### 8. Responsive Design

#### Desktop (> 1024px)
- ✅ Calendario completo con 7 columnas
- ✅ Panel lateral de 448px
- ✅ Grid de botones en 3 columnas

#### Tablet (768px - 1024px)
- ✅ Calendario adaptado
- ✅ Panel lateral de 448px
- ✅ Grid de botones en 2 columnas

#### Móvil (< 768px)
- ✅ Calendario con días más pequeños
- ✅ Panel lateral full-width
- ✅ Grid de botones en 2 columnas
- ✅ Touch-friendly (mínimo 44px)

---

### 9. Animaciones con Framer Motion

#### Calendario
- ✅ **Días**: fade-in + scale (stagger 0.01s)
- ✅ **Mes**: fade-in + y (-10 → 0)
- ✅ **Hover**: scale 1.05
- ✅ **Tap**: scale 0.95

#### Panel de Eventos
- ✅ **Entrada**: x (100% → 0) con spring
- ✅ **Eventos**: fade-in + x (20 → 0) stagger 0.05s
- ✅ **Hover**: scale 1.02

#### Formulario
- ✅ **Modal**: scale (0.9 → 1) + fade
- ✅ **Backdrop**: fade (0 → 1)
- ✅ **Botones**: scale hover/tap

#### Notificaciones
- ✅ **Panel**: x (100% → 0) con spring
- ✅ **Notificaciones**: fade-in + x (20 → 0) stagger 0.05s
- ✅ **Badge**: scale (0 → 1)
- ✅ **Campana**: scale hover 1.1

---

### 10. Persistencia de Datos

#### localStorage Keys
- ✅ `panal_events`: Array de eventos del calendario
- ✅ `panal_notifications`: Array de notificaciones (generadas)

#### Sincronización
- ✅ **Carga al iniciar**: useEffect con loadFromStorage
- ✅ **Guardado al cambiar**: useEffect con saveToStorage
- ✅ **Actualización en tiempo real**: dependencias en useEffect

---

## 📊 Comparación Antes/Después

### Antes:
- ❌ Sin calendario
- ❌ Sin sistema de eventos
- ❌ Sin notificaciones
- ❌ Sin recordatorios automáticos
- ❌ Sin planificación de actividades

### Después:
- ✅ Calendario mensual completo
- ✅ Sistema de eventos con 5 tipos
- ✅ Panel de eventos del día
- ✅ Formulario completo de eventos
- ✅ Sistema de notificaciones automático
- ✅ Campana con badge en header
- ✅ Generación automática basada en lógica
- ✅ Persistencia en localStorage
- ✅ Integración con colmenas y tareas

---

## 🎯 Características Destacadas

1. **Calendario Profesional**: Grid mensual con navegación y marcadores
2. **5 Tipos de Eventos**: Inspección, Cosecha, Tratamiento, Tarea, Recordatorio
3. **Panel Lateral**: Deslizante con lista de eventos del día
4. **Formulario Completo**: Todos los campos necesarios con validación
5. **Notificaciones Automáticas**: Generadas desde lógica de negocio
6. **Campana con Badge**: Indicador visual de notificaciones no leídas
7. **Persistencia Completa**: Eventos y notificaciones en localStorage
8. **Animaciones Profesionales**: Framer Motion en todos los componentes
9. **Diseño Responsive**: Optimizado para móvil, tablet y desktop
10. **Integración Total**: Conecta con colmenas, tareas e inspecciones

---

## 🚀 Cómo Usar

### Ver Calendario
1. Navegar a sección "Calendario"
2. Ver mes actual con eventos marcados
3. Usar flechas para cambiar de mes
4. Click en día con eventos para ver detalles

### Agregar Evento
1. Click en día del calendario
2. Click en "Agregar Evento" en panel lateral
3. Llenar formulario (tipo, título, fecha, etc.)
4. Click en "Crear Evento"

### Editar Evento
1. Click en día del calendario
2. Click en "Editar" en evento específico
3. Modificar datos necesarios
4. Click en "Guardar Cambios"

### Eliminar Evento
1. Click en día del calendario
2. Click en "Eliminar" en evento específico
3. Confirmar eliminación

### Ver Notificaciones
1. Click en campana (header, esquina superior derecha)
2. Ver lista de notificaciones
3. Click en notificación para marcar como leída
4. Navegación automática al evento si aplica

### Marcar Todas como Leídas
1. Abrir panel de notificaciones
2. Click en "Marcar todas como leídas"

---

## ✅ Estado del Proyecto

- ✅ Build exitoso (821KB JS, 44KB CSS)
- ✅ Sin errores de TypeScript
- ✅ Calendario mensual completo
- ✅ Panel de eventos del día
- ✅ Formulario de eventos
- ✅ Sistema de notificaciones
- ✅ Generación automática
- ✅ Persistencia en localStorage
- ✅ Diseño responsive
- ✅ Animaciones profesionales
- ✅ Integración completa

---

## 🎉 ¡Listo!

La aplicación PANAL ahora cuenta con:
- 📅 Calendario mensual interactivo
- 🎯 Sistema de eventos con 5 tipos
- 📋 Panel lateral de eventos del día
- 📝 Formulario completo de eventos
- 🔔 Sistema de notificaciones automático
- 🎨 Diseño responsive y animado
- 💾 Persistencia completa en localStorage
- 🔗 Integración con colmenas y tareas
- ✨ Animaciones profesionales con Framer Motion

**Happy Beekeeping! 🐝**
