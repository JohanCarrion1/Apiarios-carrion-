Nueva funcionalidad: Transferencias de núcleos y colmenas

**Contexto apícola:**
- Un núcleo maduro puede "promoverse" a colmena completa cuando está fuerte
- A veces se mueven núcleos/colmenas entre apiarios por floración, espacio o manejo
- Cada transferencia debe quedar registrada en el historial

---

## FUNCIONALIDAD 1: Convertir núcleo en colmena

**Ubicación:**
- En el detalle de un núcleo (BreedingDetail.tsx o HiveDetail.tsx cuando es núcleo)
- Agregar botón "Convertir en colmena" junto a "Editar" y "Eliminar"

**Comportamiento:**
1. Click en "Convertir en colmena" → abre modal de confirmación
2. Modal muestra:
   - Título: "Convertir núcleo en colmena"
   - Texto: "¿Convertir N-XX en una colmena completa? El núcleo dejará de existir y se creará una nueva colmena con el mismo código."
   - Advertencia: "Esta acción no se puede deshacer. Se transferirán todas las inspecciones y fotos asociadas."
   - Botones: "Cancelar" y "Convertir"

3. Al confirmar:
   - El núcleo N-XX se elimina
   - Se crea una nueva colmena C-XX (siguiente código disponible)
   - Se transfieren: inspecciones, fotos, reina registrada (si existe)
   - Se registra en el cuaderno: "Núcleo N-XX convertido en colmena C-XX"
   - Los contadores se actualizan: -1 núcleo, +1 colmena

---

## FUNCIONALIDAD 2: Transferir núcleo a otro apiario

**Ubicación:**
- En el detalle de un núcleo
- Agregar botón "Mover a otro apiario"

**Comportamiento:**
1. Click en "Mover a otro apiario" → abre modal
2. Modal muestra:
   - Título: "Mover núcleo a otro apiario"
   - Selector de apiarios disponibles (excepto el actual)
   - Campo opcional: "Motivo del traslado" (floración, espacio, manejo, etc.)
   - Fecha del traslado (por defecto hoy)
   - Botones: "Cancelar" y "Transferir"

3. Al confirmar:
   - El núcleo se mueve al apiario seleccionado (cambia de apiaryId)
   - Se mantiene el código N-XX
   - Se registra en el cuaderno: "Núcleo N-XX transferido de [Apiario A] a [Apiario B] - Motivo: [motivo]"
   - Los contadores se actualizan en ambos apiarios

---

## FUNCIONALIDAD 3: Transferir colmena a otro apiario

**Ubicación:**
- En el detalle de una colmena (HiveDetail.tsx)
- Agregar botón "Mover a otro apiario"

**Comportamiento:**
1. Click en "Mover a otro apiario" → abre modal (igual que núcleos)
2. Modal muestra:
   - Título: "Mover colmena a otro apiario"
   - Selector de apiarios disponibles
   - Campo opcional: "Motivo del traslado"
   - Fecha del traslado
   - Botones: "Cancelar" y "Transferir"

3. Al confirmar:
   - La colmena se mueve al apiario seleccionado
   - Se mantiene el código C-XX
   - Se transfieren: inspecciones, fotos, reina, historial
   - Se registra en el cuaderno: "Colmena C-XX transferida de [Apiario A] a [Apiario B] - Motivo: [motivo]"
   - Los contadores se actualizan en ambos apiarios

---

## MODELO DE DATOS - Historial de transferencias

**Estructura:**
```typescript
interface TransferRecord {
  id: string;
  tipo: 'nucleo_a_colmena' | 'nucleo_apiario' | 'colmena_apiario';
  entidadCodigo: string; // N-01, C-05, etc.
  desdeApiarioId?: string;
  hastaApiarioId?: string;
  desdeApiarioNombre?: string;
  hastaApiarioNombre?: string;
  motivo?: string;
  fecha: string; // ISO date
  registradaPor: string; // userId
}
```

**Almacenamiento:**
- Clave: `user_${userId}_transferHistory`
- Array de TransferRecord ordenado por fecha (más reciente primero)

---

## VISTA DE HISTORIAL DE TRANSFERENCIAS

**Ubicación:**
- Nueva sección en el menú o dentro de "Colmenas" como sub-pestaña
- Opción: agregar en el menú principal "Transferencias"

**Contenido:**
- Lista de todas las transferencias realizadas
- Cada registro muestra:
  - Fecha
  - Tipo (ícono: núcleo→colmena, o apiario→apiario)
  - Código de la entidad
  - Desde/Hasta (apiarios)
  - Motivo (si existe)
- Filtros: por tipo, por fecha, por apiario

---

## INTEGRACIONES

**Cuaderno:**
- Cada transferencia genera un registro automático en el cuaderno
- Formato: "[Fecha] Núcleo N-XX convertido en colmena C-XX" o "Colmena C-XX transferida de Apiario A a Apiario B"

**Alertas:**
- Si un núcleo se convierte en colmena: verificar que tenga reina registrada, si no, alertar "La nueva colmena no tiene reina registrada"

**Contadores:**
- Dashboard: actualizar "X colmenas · Y núcleos" inmediatamente después de la transferencia
- Si cambia de apiario: actualizar ambos dashboards

---

## CRITERIOS DE VERIFICACIÓN

**Convertir núcleo en colmena:**
1. Crear núcleo N-01 con 2 inspecciones y 1 foto
2. Click en "Convertir en colmena" → confirmar
3. N-01 desaparece de la lista de núcleos
4. Aparece nueva colmena C-XX (siguiente código) con las 2 inspecciones y 1 foto transferidas
5. Contador: -1 núcleo, +1 colmena
6. Cuaderno: registro automático de la conversión

**Transferir núcleo a otro apiario:**
1. Tener 2 apiarios: "Huaraz" y "Caraz"
2. En Huaraz, núcleo N-01
3. Click en "Mover a otro apiario" → seleccionar "Caraz" → motivo: "Floración de eucalipto"
4. N-01 desaparece de Huaraz
5. N-01 aparece en Caraz con todas sus inspecciones
6. Contadores: Huaraz -1 núcleo, Caraz +1 núcleo
7. Cuaderno: registro con motivo

**Transferir colmena a otro apiario:**
1. Mismo flujo que núcleos pero con colmena C-01
2. Se transfieren inspecciones, fotos, reina
3. Contadores actualizados en ambos apiarios

**Historial:**
1. Después de 3 transferencias, ver la lista completa
2. Cada registro muestra fecha, tipo, códigos, apiarios, motivo
3. Filtros funcionan correctamente

---

## NO TOCAR

- Lógica existente de creación/eliminación de colmenas/núcleos
- Otras pestañas (salvo agregar historial si se decide ponerlo en menú)
- Datos de inspecciones, cosechas, tareas (solo transferir, no modificar)

TECNOLOGÍAS: React, TypeScript, TailwindCSS, almacenamiento local por usuario y apiario
