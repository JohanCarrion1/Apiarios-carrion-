Nueva funcionalidad: seguimiento de reinas en cada colmena/núcleo

**Modelo de datos - Reina:**
- id: string único
- hiveId: id de la colmena/núcleo donde está
- fechaNacimiento: date
- edadSemanas: number (calculado automáticamente)
- origen: "propia" | "comprada" | "lote" (si es de lote de cría, vincular al lote)
- loteId?: string (si viene de cría de reinas)
- colorAño: string (blanco, amarillo, rojo, verde, azul - código de color por año)
- lineaGenetica?: string (Carnica, Italiana, Buckfast, etc.)
- caracteristicas: string[] (mansedumbre, productividad, resistencia)
- estado: "activa" | "perdida" | "cambiada" | "enjaulada"
- fechaCambio?: date
- notas: string

**Integración con colmenas:**
- En el detalle de cada colmena/núcleo, sección "Reina":
  - Fecha de nacimiento
  - Edad actual (semanas + días)
  - Badge de color según año (blanco/amarillo/rojo/verde/azul)
  - Origen (con link al lote si aplica)
  - Línea genética si está registrada
  - Estado actual
- Alertas visuales:
  - Badge verde: "Reina joven" (< 4 semanas)
  - Badge amarillo: "Considerar recambio" (6-12 semanas)
  - Badge rojo: "Reina vieja" (> 12 semanas)
- Botones de acción:
  - "Registrar cambio de reina"
  - "Marcar como perdida"
  - "Editar información"

**Formulario de registro de reina:**
- Fecha de nacimiento (datepicker, por defecto hoy)
- Origen: selector (Propia / Comprada / De lote)
- Si "De lote": dropdown con lotes disponibles de cría de reinas
- Color del año: selector de color (5 opciones)
- Línea genética: input texto opcional
- Características: checkboxes (Mansedumbre, Productividad, Resistencia a enfermedades, Limpieza)
- Notas opcionales

**Historial:**
- Guardar historial de cambios de reina por colmena
- Fecha de cada cambio, razón (pérdida, recambio programado, enjambzón)

**Integración con cría de reinas:**
- Cuando un lote de cría se marca como "aceptadas", ofrecer: "¿Asignar a colmena?"
- Al asignar, crear automáticamente la reina vinculada al lote

**Criterios de verificación:**
- Crear colmena C-01 → registrar reina nacida hoy → aparece con edad "0 semanas", badge verde
- Cambiar fecha a 8 semanas atrás → badge amarillo "Considerar recambio"
- Asignar reina de lote #3 → se vincula correctamente, aparece link al lote
- Registrar cambio de reina → queda en historial
- Las alertas se muestran en el panel principal: "X colmenas con reinas viejas"

TECNOLOGÍAS: React, TypeScript, TailwindCSS, almacenamiento local por usuario y apiario

