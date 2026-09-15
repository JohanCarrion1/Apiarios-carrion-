FIX: Al convertir núcleo en colmena, debe mantener TODO el historial y tomar el siguiente código secuencial disponible

**Problema:**
Al convertir un núcleo (ej: N-04 o N-08) en colmena, debe:
1. Mantener TODO su historial: inspecciones, fotos, reina registrada, notas, estado
2. Tomar el siguiente código de colmena disponible (si ya existen C-01 a C-07, la nueva debe ser C-08)
3. NO generar un código aleatorio o reutilizar uno existente

**Comportamiento esperado:**

**Ejemplo concreto:**
- Apiario tiene: C-01, C-02, C-03, C-04, C-05, C-06, C-07 (7 colmenas)
- Apiario tiene: N-01, N-02, N-03, N-04, N-05, N-06, N-07, N-08 (8 núcleos)
- Usuario convierte N-04 en colmena
- Resultado:
  - N-04 desaparece de la lista de núcleos (ahora hay 7 núcleos)
  - Aparece C-08 (siguiente código disponible) con:
    - Todas las inspecciones que tenía N-04
    - Todas las fotos que tenía N-04
    - La reina registrada en N-04 (si existe)
    - El estado (saludable, alerta, etc.)
    - La fecha de última revisión
    - Cualquier nota o dato asociado
  - Contadores: 8 colmenas, 7 núcleos

**Implementación técnica:**

1. **Función para calcular siguiente código de colmena:**
```typescript
const getNextHiveCode = (colmenas: Hive[]): string => {
  if (colmenas.length === 0) return 'C-01';
  
  // Extraer números de los códigos existentes (C-01, C-02, etc.)
  const numeros = colmenas
    .map(c => parseInt(c.code.replace('C-', '')))
    .filter(n => !isNaN(n));
  
  // Encontrar el máximo y sumar 1
  const maxNum = Math.max(...numeros);
  const nextNum = maxNum + 1;
  
  // Formatear con ceros a la izquierda (2 dígitos)
  return `C-${nextNum.toString().padStart(2, '0')}`;
};
```

2. **Función de conversión completa:**
```typescript
const convertNucleoToColmena = (nucleoId: string) => {
  // 1. Obtener el núcleo completo con todo su historial
  const nucleo = nucleos.find(n => n.id === nucleoId);
  if (!nucleo) return;
  
  // 2. Calcular siguiente código de colmena
  const nuevoCodigo = getNextHiveCode(colmenas);
  
  // 3. Crear nueva colmena con TODOS los datos del núcleo
  const nuevaColmena: Hive = {
    id: generateId(),
    code: nuevoCodigo,
    status: nucleo.status,
    lastInspection: nucleo.lastInspection,
    queen: nucleo.queen, // Transferir reina
    photos: nucleo.photos, // Transferir fotos
    inspections: nucleo.inspections, // Transferir inspecciones
    notes: nucleo.notes,
    createdAt: new Date().toISOString(),
    apiaryId: nucleo.apiaryId,
    type: 'colmena',
  };
  
  // 4. Agregar nueva colmena al array
  colmenas.push(nuevaColmena);
  
  // 5. Eliminar el núcleo
  nucleos = nucleos.filter(n => n.id !== nucleoId);
  
  // 6. Guardar en localStorage
  saveColmenas(colmenas);
  saveNucleos(nucleos);
  
  // 7. Registrar en el cuaderno
  const registroCuaderno = {
    id: generateId(),
    fecha: new Date().toISOString(),
    tipo: 'conversion',
    texto: `Núcleo ${nucleo.code} convertido en colmena ${nuevoCodigo}. Se transfirieron ${nucleo.inspections?.length || 0} inspecciones, ${nucleo.photos?.length || 0} fotos${nucleo.queen ? ' y reina registrada' : ''}.`,
    apiaryId: nucleo.apiaryId,
  };
  addNotebookEntry(registroCuaderno);
  
  // 8. Actualizar contadores y UI
  updateCounters();
  
  // 9. Mostrar toast de confirmación
  showToast(`Núcleo ${nucleo.code} convertido en colmena ${nuevoCodigo}`, 'success');
};
```

3. **Transferencia de datos específicos:**

**Inspecciones:**
- Cada inspección debe mantener su fecha, notas, clima, fotos
- Actualizar el campo `hiveId` o `hiveCode` de cada inspección para que apunte a la nueva colmena
- Mantener el orden cronológico

**Fotos:**
- Transferir array completo de fotos (base64)
- Mantener metadata (fecha, tamaño, descripción si existe)

**Reina:**
- Si el núcleo tiene reina registrada, transferir todos sus datos:
  - Fecha de nacimiento
  - Edad calculada
  - Color del año
  - Línea genética
  - Origen (si viene de lote de cría, mantener vínculo)
  - Características

**Estado y notas:**
- Mantener status (saludable, alerta, sin reina, etc.)
- Transferir notas generales
- Mantener fecha de última revisión

4. **Validaciones antes de convertir:**

```typescript
const validateConversion = (nucleo: Nucleo): ValidationResult => {
  const warnings: string[] = [];
  
  // Advertencia si no tiene reina
  if (!nucleo.queen) {
    warnings.push('El núcleo no tiene reina registrada. La nueva colmena quedará sin reina.');
  }
  
  // Advertencia si tiene pocas inspecciones
  if (!nucleo.inspections || nucleo.inspections.length < 2) {
    warnings.push('El núcleo tiene pocas inspecciones registradas.');
  }
  
  return {
    isValid: true, // Siempre se puede convertir, solo advertencias
    warnings,
  };
};
```

5. **Modal de confirmación mejorado:**

El modal debe mostrar:
- Título: "Convertir núcleo en colmena"
- Texto: "¿Convertir N-08 en una colmena completa?"
- **Información de lo que se transferirá:**
  - "Se creará la colmena C-08"
  - "Se transferirán 5 inspecciones"
  - "Se transferirán 3 fotos"
  - "Se transferirá la reina registrada" (si existe)
  - "Se transferirá el estado: Saludable"
- Advertencia: "El núcleo N-08 dejará de existir. Esta acción no se puede deshacer."
- Botones: "Cancelar" y "Convertir"

---

## CRITERIOS DE VERIFICACIÓN

**Escenario 1: Conversión básica**
1. Apiario tiene C-01 a C-07 (7 colmenas) y N-01 a N-08 (8 núcleos)
2. N-04 tiene: 3 inspecciones, 2 fotos, reina registrada, estado "Saludable"
3. Click en "Convertir en colmena" en N-04
4. Resultado esperado:
   - N-04 desaparece (ahora hay 7 núcleos: N-01, N-02, N-03, N-05, N-06, N-07, N-08)
   - Aparece C-08 con:
     - 3 inspecciones (mismas fechas, notas, fotos)
     - 2 fotos
     - Reina registrada (misma edad, color, origen)
     - Estado "Saludable"
   - Contadores: 8 colmenas, 7 núcleos
   - Cuaderno: registro "Núcleo N-04 convertido en colmena C-08..."

**Escenario 2: Conversión sin reina**
1. N-08 no tiene reina registrada
2. Al convertir, mostrar advertencia en modal: "El núcleo no tiene reina registrada"
3. C-09 se crea sin reina
4. Botón "+ Registrar reina" aparece en el detalle de C-09

**Escenario 3: Conversión con muchas inspecciones**
1. N-01 tiene 15 inspecciones de los últimos 6 meses
2. Al convertir, todas las 15 inspecciones aparecen en el historial de C-10
3. El gráfico de salud muestra la evolución completa

**Escenario 4: Códigos no secuenciales**
1. Apiario tiene C-01, C-03, C-05 (faltan C-02 y C-04 por eliminación)
2. Al convertir N-02, debe crear C-06 (no C-02 ni C-04)
3. La función getNextHiveCode debe buscar el máximo (05) y sumar 1 → 06

---

## NO TOCAR

- Lógica de eliminación de núcleos (solo modificar la conversión)
- Otras funcionalidades de colmenas
- Datos de otros apiarios

TECNOLOGÍAS: React, TypeScript, TailwindCSS, almacenamiento local

