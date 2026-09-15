Nueva funcionalidad: gestión de cría de reinas por traslarve y sistema Nicot, con control por lote

**Estructura:**
- Nueva pestaña "Cría" en el menú, ubicada inmediatamente después de "Colmenas" (antes que Estadísticas)
- Datos separados por usuario y apiario activo, igual que el resto de la app
- Almacenamiento en clave independiente: `user_${userId}_apiary_${apiaryId}_breedingLots`

**Modelo de datos — Lote de cría:**
- id: string único
- tipo: "Traslarve" | "Nicot"
- coloniaDonante: id de la colmena/núcleo que dona larvas
- coloniasReceptoras: array de ids de colmenas/núcleos receptores
- fechaInicio: date (fecha del traslarve o inserción de Nicot)
- cantidadPortacupulas: number (preguntar al usuario: "¿Cuántos portacúpulas tiene el bastidor?" — rango 10-40)
- fechaEnjauladoEstimada: date (calculada: fechaInicio + 10 días en traslarve, configurable en Nicot)
- fechaNacimientoEstimada: date (calculada: fechaInicio + 12-13 días)
- metodoRetiro: "enjaular" | "realeras" (configurable por lote)
- estado: "enRealeras" | "enjauladas" | "nacidas" | "fecundando" | "aceptadas" | "perdidas"
- notas: string opcional
- fechaCreacion: timestamp

**Vista principal de la pestaña "Cría":**
- Encabezado: "Cría de Reinas" con resumen "X lotes activos · Y en fecundación"
- Botón flotante "+" para crear nuevo lote
- Lista de lotes activos ordenados por fecha (más reciente primero)
- Cada lote muestra: tipo (badge "Traslarve" o "Nicot"), colonia donante, fecha inicio, días transcurridos, estado con color, alertas si está próximo a enjaulado/nacimiento
- Acciones por lote: Ver detalle, Cambiar estado, Eliminar (con confirmación)
- Sección inferior: "Historial de lotes" (lotes completados o perdidos de los últimos 3 meses)

**Formulario de creación de lote:**
- Selector de tipo: Traslarve / Nicot (toggle)
- Selector de colonia donante (lista de colmenas y núcleos del apiario)
- Selector múltiple de colonias receptoras (mínimo 1, máximo 5)
- Campo numérico: "¿Cuántos portacúpulas tiene el bastidor?" (mín 10, máx 40, valor por defecto 20)
- Fecha de inicio (datepicker, por defecto hoy)
- Fecha estimada de enjaulado (calculada automáticamente: +10 días para traslarve, editable para Nicot)
- Selector: "Método de retiro" → Enjaular / Retirar en realeras
- Campo opcional de notas

**Detalle del lote:**
- Encabezado con tipo, colonia donante, fecha inicio, días transcurridos
- Info: cantidad de portacúpulas, colonias receptoras, método de retiro
- Fechas clave destacadas: Enjaulado estimado, Nacimiento estimado
- Estado actual con badge de color
- Botones de acción:
  - "Cambiar estado" (dropdown con los estados posibles según el ciclo)
  - "Registrar enjaulado" (si el método es enjaular y estamos en fecha)
  - "Registrar nacimiento"
  - "Marcar como fecundada"
  - "Marcar como perdida"
  - Eliminar lote
- Historial de cambios de estado con fechas

**Alertas automáticas:**
- Badge naranja en el lote: "Mañana es día de enjaulado" (cuando faltan 1 día para fechaEnjauladoEstimada)
- Badge verde: "Listas para nacer" (cuando faltan 1-2 días para fechaNacimientoEstimada)
- Badge rojo: "Atrasado" (si pasó fechaNacimientoEstimada y no se registró nacimiento)
- Notificación en el panel principal: "X lotes próximos a enjaulado"

**Integración con Calendario:**
- Al crear un lote, se crean eventos automáticos en el calendario:
  - "Enjaulado - Lote #X" en fechaEnjauladoEstimada
  - "Nacimiento esperado - Lote #X" en fechaNacimientoEstimada
- Estos eventos se eliminan si el lote se elimina

**Integración con Cuaderno:**
- Registro automático en el cuaderno: "Iniciado lote de cría de reinas (Traslarve/Nicot) con colonia donante C-XX"
- Al cambiar estado: "Lote de cría cambiado a [estado]"

**Criterios de verificación:**
- Crear un lote de traslarve con 25 portacúpulas, colonia donante C-01, 2 receptoras → aparece en la lista con fecha de enjaulado calculada (D+10)
- Cambiar estado a "enjauladas" → se registra en el cuaderno
- Al llegar a fecha de enjaulado, el lote muestra badge naranja de alerta
- El historial muestra lotes completados de los últimos 3 meses
- Cambiar de apiario: solo se ven los lotes del apiario activo
- La pestaña "Cría" aparece en el menú entre "Colmenas" y "Estadísticas"

**No tocar:**
- Geometría de colmenas/núcleos
- Otras pestañas existentes (salvo agregar "Cría" en el menú)
- Datos de inspecciones, cosechas, tareas existentes

TECNOLOGÍAS: React, TypeScript, TailwindCSS, almacenamiento local por usuario y apiario
