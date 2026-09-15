Nueva pestaña: Inventario de material, herramientas e insumos

**Ubicación en el menú:**
- Pestaña "Inventario" entre "Tareas" y "Ajustes"
- Ícono: caja/cajón (lucide: Package o similar)
- Badge opcional: número de ítems con stock bajo

**Modelo de datos:**
- Almacenamiento: `user_${userId}_inventory` (compartido entre apiarios, es material del apicultor)
- Estructura de ítem:
  - id: string único
  - nombre: string
  - categoria: "material" | "herramientas" | "insumos" | "envases"
  - cantidadTotal: number
  - cantidadEnUso: number
  - cantidadDisponible: number (calculado: total - enUso)
  - umbralAlerta: number (por defecto 10, configurable)
  - unidad: string (unidades, kg, litros, etc.)
  - proveedor?: string
  - fechaVencimiento?: date (para medicamentos)
  - notas?: string
  - movimientos: array de {fecha, tipo: "entrada"|"salida"|"transferencia", cantidad, nota, proveedor?}

**Categorías con presets iniciales:**

1. Material de colmenas: Alzas, Cámaras de cría, Cuadros con cera, Cuadros sin cera, Paredes, Pisos, Entretapas, Rejillas excluidoras, Alimentadores
2. Herramientas: Ahumadores, Palancas, Trajes, Guantes, Cepillos, Cuchillos desoperculadores, Centrífuga
3. Insumos: Cera laminada (kg), Jarabe (litros), Medicamentos, Cúpulas para cría, Jaulas para reinas
4. Envases: Frascos 250g, 500g, 1kg, Etiquetas

**Vista principal:**
- Encabezado: "Inventario" con resumen "X ítems · Y con stock bajo"
- Filtros: por categoría (chips) + búsqueda por nombre + toggle "Solo stock bajo"
- Lista de ítems agrupados por categoría
- Cada ítem muestra: nombre, disponible/total, unidad, barra de progreso visual (verde/amarillo/rojo según umbral)
- Botón flotante "+" para agregar ítem nuevo

**Formulario de ítem nuevo:**
- Nombre (input texto)
- Categoría (selector)
- Cantidad total (numérico)
- Cantidad en uso (numérico, por defecto 0)
- Unidad (selector: unidades, kg, litros, metros)
- Umbral de alerta (numérico, por defecto 10)
- Proveedor (opcional)
- Fecha de vencimiento (opcional, para medicamentos)
- Notas (opcional)

**Detalle del ítem:**
- Información completa del ítem
- Historial de movimientos (entrada/salida/transferencia) con fechas
- Botones: "Registrar movimiento", "Editar", "Eliminar"

**Registro de movimiento:**
- Tipo: Entrada (compra) / Salida (uso) / Transferencia (entre apiarios)
- Cantidad (positiva)
- Fecha (por defecto hoy)
- Nota (opcional)
- Proveedor (si es entrada)
- Al guardar: actualiza automáticamente cantidadTotal o cantidadEnUso según tipo

**Alertas:**
- Badge en el menú con número de ítems bajo stock
- Widget en Dashboard: "Inventario - Alertas" con los 3-5 ítems críticos
- En la lista: ítems bajo umbral destacados en rojo/amarillo
- Notificación en campanita: "Stock bajo: Cera laminada (2kg restantes)"

**Criterios de verificación:**
- Crear ítem "Cuadros con cera": 50 totales, 30 en uso → muestra 20 disponibles
- Registrar salida de 5 cuadros → stock disponible baja a 15
- Si umbral es 10 y disponible es 8 → aparece alerta visual y badge en menú
- Filtrar por "Solo stock bajo" → muestra solo ítems críticos
- Pestaña Inventario aparece en menú entre Tareas y Ajustes
- Al cambiar de usuario, el inventario es independiente
- Al recargar, los datos persisten

**No tocar:**
- Otras pestañas existentes (salvo agregar Inventario en el menú)
- Datos de colmenas, núcleos, cría, cosechas, tareas

TECNOLOGÍAS: React, TypeScript, TailwindCSS, almacenamiento local por usuario
