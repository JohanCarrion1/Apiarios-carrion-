Fix: cambiar formato de hora de 24h a 12h con AM/PM en toda la aplicación

**Problema:**
El reloj del panel y todas las marcas de hora muestran formato 24 horas (ej: "13:27 h"). Debe ser formato 12 horas con AM/PM.

**Cambios:**
- Crear utilidad `src/utils/formatTime.ts` con función `formatHour(date: Date): string` que retorne formato 12h: "1:27 p.m.", "9:59 a.m.", "12:00 p.m." (mediodía), "12:00 a.m." (medianoche).
- Reemplazar todos los usos de hora en la app por esta utilidad:
  - Reloj del panel principal
  - Marcas de tiempo en inspecciones (cuaderno)
  - Registros de cosecha
  - Eventos del calendario
  - Tareas con hora
  - Actividad reciente
- Eliminar el sufijo "h" actual del reloj del panel.
- Las fechas (día/mes/año) no cambian, solo la parte de hora.

**Reglas:**
- Sin cero inicial en horas de mañana: "9:59 a.m." no "09:59 a.m."
- Mediodía: "12:00 p.m."
- Medianoche: "12:00 a.m."
- Una de la tarde: "1:00 p.m." no "13:00"

**Verificación:**
- Buscar en src cualquier formato manual de hora y reemplazar por la utilidad.
- El reloj del panel debe mostrar "1:27 p.m." en lugar de "13:27 h".

TECNOLOGÍAS: React, TypeScript, TailwindCSS
