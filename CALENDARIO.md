Mejoras en Calendario: recordatorios automáticos y tareas recurrentes

**Nuevas funcionalidades:**

**1. Recordatorios automáticos:**
- Basados en fechas de eventos existentes:
  - "Mañana: Revisión programada de C-05"
  - "En 2 días: Enjaulado lote #3 de cría de reinas"
  - "Hoy: Cosecha programada"
- Notificaciones visuales en el panel principal: campanita con badge rojo si hay recordatorios pendientes
- Lista de recordatorios del día en el panel

**2. Tareas recurrentes:**
- Crear tarea con recurrencia:
  - "Revisar colmenas" → cada 7 días
  - "Alimentar" → cada 3 días en invierno
  - "Limpieza de material" → mensual
  - "Control de varroa" → cada 21 días
- Al cumplirse la fecha, se crea automáticamente la tarea en el calendario
- Opción: "Crear todas las instancias futuras" o "Solo la próxima"

**3. Calendario de floración:**
- Registrar flora melífera por apiario:
  - Apiario Huaraz: Eucalipto (feb-mar), Romero (may-jun)
  - Apiario Caraz: Laurel (ago-sep)
- Alertas: "Inicia floración de eucalipto en Huaraz - aumentar revisiones"
- Visualización en calendario con ícono de flor

**4. Configuración de alertas:**
- Cuántos días antes avisar (1, 3, 7 días)
- Qué tipos de recordatorios activar (revisiones, cosechas, cría, floración)
- Notificaciones push (si es PWA) o solo visuales en la app

**Integraciones:**
- Panel principal: widget "Próximos recordatorios" con las 3-5 tareas más cercanas
- Calendario: eventos de recordatorios en color diferente (naranja)
- Cría de reinas: alertas automáticas de enjaulado (D+10) y nacimiento (D+12-13)

**Criterios de verificación:**
- Crear tarea recurrente "Revisar cada 7 días" → se auto-crean las próximas 4 semanas en el calendario
- Registrar floración de eucalipto para mañana → alerta visible en panel
- Lote de cría creado hoy → alertas automáticas en D+9 ("mañana enjaulado") y D+11 ("mañana nacimiento")
- Campanita de notificaciones muestra badge con número de recordatorios pendientes

TECNOLOGÍAS: React, TypeScript, TailwindCSS, almacenamiento local, cálculo de fechas recurrentes
