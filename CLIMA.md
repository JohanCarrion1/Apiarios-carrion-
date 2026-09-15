Fix: los datos del clima (temperatura, viento, condición) deben basarse en la ubicación GPS real del dispositivo, no en datos estáticos

**Problema actual:**
El widget del clima en el Dashboard muestra temperatura y viento que no corresponden a la ubicación real del usuario. Debe usar geolocalización del dispositivo y una API de clima en tiempo real.

**Solución técnica:**

1. **Geolocalización del dispositivo:**
- Usar `navigator.geolocation.getCurrentPosition()` al cargar el Dashboard
- Pedir permiso al usuario (ya lo hace el navegador automáticamente)
- Si el usuario deniega el permiso: usar última ubicación guardada en localStorage, o fallback por IP
- Guardar lat/lon en localStorage con clave `user_${userId}_lastLocation` para no pedir permiso cada vez
- Actualizar ubicación cada 30 minutos o al cambiar de apiario

2. **API de clima: Open-Meteo (100% gratis, sin API key):**
- Endpoint: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`
- Sin registro, sin clave, CORS habilitado
- Cache de respuesta: 30 minutos en localStorage (`user_${userId}_weatherCache`)
- Si falla la API: mostrar último dato cacheado con indicador "datos de hace X min"

3. **Mapeo de weather_code a íconos y texto en español:**
- 0: "Despejado" ☀️
- 1-3: "Parcialmente nublado" ⛅
- 45-48: "Niebla" ️
- 51-57: "Llovizna" ️
- 61-67: "Lluvia" 🌧️
- 71-77: "Nieve" ❄️
- 80-82: "Chubascos" 🌧️
- 95-99: "Tormenta" ⛈️
- Usar los íconos que ya existen en el widget (sol, viento) manteniendo el estilo visual

4. **Integración con el widget existente del Dashboard:**
- Reemplazar los valores hardcodeados de temperatura y viento por los de la API
- Mantener el diseño actual (sol ☀️ + temperatura, viento  + km/h)
- Agregar indicador sutil de actualización: "actualizado hace 5 min" en texto pequeño
- Si está cargando: mostrar spinner pequeño o "actualizando..."
- Si hay error: mostrar último dato cacheado con ícono de advertencia

5. **Consideraciones por apiario:**
- Si el usuario tiene múltiples apiarios en distintas ubicaciones, el clima debe corresponder al apiario activo
- Guardar coordenadas por apiario: `apiary_${apiaryId}_coords`
- Al cambiar de apiario, refrescar el clima con las nuevas coordenadas

6. **Optimización:**
- No llamar a la API en cada render: usar useEffect con dependencia de apiario activo
- Cancelar petición si el componente se desmonta
- Manejar estado de carga, error y éxito con useState

**Criterios de verificación:**
- Al cargar el Dashboard, el navegador pide permiso de ubicación (primera vez)
- La temperatura mostrada coincide con el clima real de Huaraz/Caraz (verificar en Google Weather)
- Al cambiar de apiario con diferente ubicación, el clima se actualiza
- Al recargar la página, usa datos cacheados (no pide permiso otra vez si ya fue concedido)
- Si no hay internet: muestra último dato cacheado con indicador "hace X min"
- Si se deniega el permiso: muestra mensaje "Activa la ubicación para ver el clima real" con botón de reintentar
- El diseño visual del widget no se rompe (mismo estilo ámbar/oscuro)

**No tocar:**
- Diseño visual del widget (solo los datos internos)
- Otras funcionalidades del Dashboard
- El selector de apiarios

TECNOLOGÍAS: React, TypeScript, TailwindCSS, Geolocation API, fetch, Open-Meteo API (sin API key)
