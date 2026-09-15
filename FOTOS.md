Fix: la subida de fotos existe en la UI pero no funciona — diagnosticar y reparar

**Problema:**
La aplicación tiene botones/inputs para subir fotos (en colmenas, inspecciones, apiarios, etc.) pero al seleccionar una imagen no se guarda, no se muestra o da error. El usuario no puede registrar fotos de panales, postura, reservas, reina, etc.

**Diagnóstico obligatorio (ejecutar antes de tocar nada):**
- Buscar en src todos los componentes que usen input type="file" o accept="image" o referencias a fotos/imágenes
- Identificar qué hace cada uno al seleccionar archivo: ¿guarda en localStorage? ¿sube a servidor? ¿convierte a base64? ¿está el handler conectado?
- Verificar si existe algún servicio o utilidad de manejo de imágenes (ej: src/services/photoService.ts o similar)
- Revisar si hay límites de tamaño que estén rompiendo el guardado
- Revisar si el almacenamiento local tiene límite de ~5MB y las fotos en base64 lo superan

**Reparación exigida:**
- La foto debe poder seleccionarse desde la galería o cámara del dispositivo
- Debe previsualizarse antes de guardar
- Debe guardarse de forma persistente asociada a la entidad (colmena, inspección, apiario, lote de cría)
- Debe mostrarse en la vista de detalle de la entidad
- Debe poder eliminarse
- Si hay muchas fotos, mostrarlas en galería con scroll

**Estrategia técnica recomendada:**
- Convertir la imagen a base64 al seleccionarla
- Comprimir/redimensionar antes de guardar (máx 800px de ancho, calidad 0.7) para no saturar localStorage
- Guardar en la misma clave de la entidad (ej: colmena.fotos = [base64, base64, ...])
- Si supera el límite de localStorage, mostrar mensaje claro: "Almacenamiento lleno, elimina fotos antiguas"
- Usar input type="file" con accept="image/*" y capture="environment" para permitir cámara directa en móvil

**Puntos a reparar (lista completa):**
- Fotos en colmenas (detalle de colmena)
- Fotos en inspecciones (cuaderno)
- Fotos en apiarios (gestión de apiarios)
- Fotos en lotes de cría de reinas
- Cualquier otro punto donde exista botón de foto

**Criterios de verificación:**
- En detalle de colmena C-01: tocar "Agregar foto" → seleccionar imagen de galería → se previsualiza → se guarda → aparece en galería → persiste al recargar → se puede eliminar
- Lo mismo en inspección, apiario y lote de cría
- Subir 3 fotos seguidas funciona sin errores
- Foto tomada con cámara directa (capture="environment") funciona
- Al recargar la página, las fotos siguen ahí

**No tocar:**
- Diseño visual de los botones de foto (solo reparar la funcionalidad)
- Otras funcionalidades de las pestañas

TECNOLOGÍAS: React, TypeScript, TailwindCSS, almacenamiento local, FileReader API, canvas para compresión
