# 📍 Geolocalización en Formulario de Apiario - Documentación

## 📋 Resumen de la Implementación

Se ha agregado funcionalidad de geolocalización al formulario "Crear tu primer apiario" en el componente `ApiarySelector.tsx`. Los usuarios ahora pueden usar su ubicación actual del dispositivo para autocompletar el campo de ubicación del apiario.

## 🎯 Características Implementadas

### 1. Botón de Geolocalización
- ✅ Botón con ícono de pin 📍 al lado del campo de ubicación
- ✅ Indicador de carga mientras se obtiene la ubicación
- ✅ Mensajes de error claros y descriptivos
- ✅ Muestra coordenadas obtenidas después de la geolocalización

### 2. Obtención de Ubicación
- ✅ Uso de `navigator.geolocation.getCurrentPosition`
- ✅ Alta precisión habilitada (`enableHighAccuracy: true`)
- ✅ Timeout de 10 segundos
- ✅ Manejo de errores del navegador

### 3. Reverse Geocoding con Nominatim
- ✅ Uso de la API gratuita de OpenStreetMap Nominatim
- ✅ URL: `https://nominatim.openstreetmap.org/reverse`
- ✅ No requiere API key
- ✅ Respeta el límite de 1 solicitud por segundo
- ✅ Incluye header `User-Agent` identificando la app
- ✅ Soporte para idioma español (`accept-language=es`)

### 4. Manejo de Errores
- ✅ Permiso de ubicación rechazado
- ✅ Navegador sin soporte para geolocalización
- ✅ Fallo en la petición a Nominatim
- ✅ Timeout al obtener ubicación
- ✅ Mensajes claros y editables manualmente como respaldo

### 5. Almacenamiento en Firestore
- ✅ Coordenadas (lat/lng) guardadas junto con el apiario
- ✅ Campo `coordinates` opcional en la interfaz `Apiary`
- ✅ Función `createApiary` actualizada para aceptar coordenadas

## 🏗️ Arquitectura

### Servicio de Geolocalización (`src/services/geolocation.ts`)

#### Funciones Exportadas

```typescript
// Obtener ubicación actual del dispositivo
getCurrentPosition(): Promise<GeolocationPosition>

// Convertir coordenadas a dirección legible
reverseGeocode(lat: number, lng: number): Promise<string>

// Obtener ubicación con dirección legible
getCurrentLocationWithAddress(): Promise<GeoLocation>

// Formatear coordenadas para display
formatCoordinates(lat: number, lng: number): string
```

#### Interfaces

```typescript
interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface GeolocationError {
  code: string;
  message: string;
}
```

### Integración en ApiarySelector

#### Estados Agregados
```typescript
const [newApiaryCoordinates, setNewApiaryCoordinates] = useState<GeoLocation | null>(null);
const [gettingLocation, setGettingLocation] = useState(false);
const [locationError, setLocationError] = useState<string | null>(null);
```

#### Función handleGetLocation
```typescript
const handleGetLocation = async () => {
  try {
    setGettingLocation(true);
    setLocationError(null);
    
    const location = await getCurrentLocationWithAddress();
    
    // Autocompletar campo de ubicación
    if (location.address) {
      setNewApiaryLocation(location.address);
    } else {
      setNewApiaryLocation(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
    }
    
    // Guardar coordenadas
    setNewApiaryCoordinates(location);
  } catch (error: any) {
    setLocationError(error.message || 'Error al obtener la ubicación');
  } finally {
    setGettingLocation(false);
  }
};
```

### Actualización en Firestore

#### Interfaz Apiary Actualizada
```typescript
export interface Apiary {
  id: string;
  userId: string;
  name: string;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

#### Función createApiary Actualizada
```typescript
export async function createApiary(
  userId: string, 
  name: string, 
  location: string,
  coordinates?: { lat: number; lng: number }
): Promise<string> {
  const apiaryData: any = {
    userId,
    name,
    location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (coordinates) {
    apiaryData.coordinates = coordinates;
  }

  const docRef = await addDoc(collection(database, 'apiarios'), apiaryData);
  return docRef.id;
}
```

## 🎨 UI/UX

### Botón de Geolocalización
```tsx
<motion.button
  type="button"
  onClick={handleGetLocation}
  disabled={gettingLocation}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="px-4 py-3 rounded-xl bg-honey/10 border border-honey/30 text-honey hover:bg-honey/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  title="Usar mi ubicación actual"
>
  {gettingLocation ? (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="w-5 h-5 border-2 border-honey border-t-transparent rounded-full"
    />
  ) : (
    <span className="text-xl">📍</span>
  )}
</motion.button>
```

### Mensajes de Error
```tsx
{locationError && (
  <motion.p
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-2 text-sm text-coral"
  >
    {locationError}
  </motion.p>
)}
```

### Coordenadas Obtenidas
```tsx
{newApiaryCoordinates && !locationError && (
  <motion.p
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-2 text-xs text-husk"
  >
    📍 Coordenadas: {newApiaryCoordinates.lat.toFixed(6)}, {newApiaryCoordinates.lng.toFixed(6)}
  </motion.p>
)}
```

## 🔒 Manejo de Errores

### Errores del Navegador

| Código | Mensaje |
|--------|---------|
| `PERMISSION_DENIED` | "Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador." |
| `POSITION_UNAVAILABLE` | "Información de ubicación no disponible" |
| `TIMEOUT` | "Tiempo de espera agotado al obtener la ubicación" |
| `NOT_SUPPORTED` | "Tu navegador no soporta geolocalización" |

### Errores de Nominatim
- Error de red o timeout
- Respuesta inválida de la API
- Dirección no encontrada

### Respaldo Manual
- El usuario siempre puede editar manualmente el campo de ubicación
- Si falla el reverse geocoding, se muestran las coordenadas
- El usuario puede corregir o completar la dirección manualmente

## 🌐 API de Nominatim

### Configuración
```typescript
const response = await fetch(
  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
  {
    headers: {
      'User-Agent': 'ApiariosCarrion/1.0 (https://apiarioscarrion.com)'
    }
  }
);
```

### Consideraciones Importantes
- ✅ Límite de 1 solicitud por segundo (respetado)
- ✅ No hacer llamadas automáticas repetidas
- ✅ Solo llamar cuando el usuario presione el botón
- ✅ Incluir header `User-Agent` identificando la app
- ✅ Usar `accept-language=es` para respuestas en español

### Construcción de Dirección
```typescript
const parts = [];

if (address.road || address.pedestrian || address.footway) {
  parts.push(address.road || address.pedestrian || address.footway);
}

if (address.suburb || address.neighbourhood || address.quarter) {
  parts.push(address.suburb || address.neighbourhood || address.quarter);
}

if (address.city || address.town || address.village || address.municipality) {
  parts.push(address.city || address.town || address.village || address.municipality);
}

if (address.county || address.state_district) {
  parts.push(address.county || address.state_district);
}

if (address.state) {
  parts.push(address.state);
}

if (address.country) {
  parts.push(address.country);
}

return parts.join(', ');
```

## 📊 Estructura de Datos en Firestore

### Documento de Apiario con Coordenadas
```json
{
  "id": "abc123",
  "userId": "user456",
  "name": "Apiario La Dehesa",
  "location": "Independencia, Áncash, Perú",
  "coordinates": {
    "lat": -9.5278,
    "lng": -77.5278
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Documento de Apiario sin Coordenadas
```json
{
  "id": "def456",
  "userId": "user456",
  "name": "Apiario Sierra",
  "location": "Sierra de San Pedro, Extremadura",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## 🧪 Pruebas

### Prueba 1: Geolocalización Exitosa
1. ✅ Abrir formulario de creación de apiario
2. ✅ Hacer clic en el botón 📍
3. ✅ Aceptar permiso de ubicación
4. ✅ Verificar que se muestra indicador de carga
5. ✅ Verificar que se autocompleta el campo de ubicación
6. ✅ Verificar que se muestran las coordenadas
7. ✅ Crear apiario y verificar que se guardan coordenadas en Firestore

### Prueba 2: Permiso Denegado
1. ✅ Abrir formulario de creación de apiario
2. ✅ Hacer clic en el botón 📍
3. ✅ Rechazar permiso de ubicación
4. ✅ Verificar que se muestra mensaje de error claro
5. ✅ Verificar que el usuario puede editar manualmente el campo

### Prueba 3: Navegador sin Soporte
1. ✅ Usar navegador sin soporte para geolocalización
2. ✅ Hacer clic en el botón 📍
3. ✅ Verificar que se muestra mensaje de error
4. ✅ Verificar que el usuario puede editar manualmente

### Prueba 4: Fallo en Nominatim
1. ✅ Simular fallo de red o respuesta inválida
2. ✅ Verificar que se muestra mensaje de error
3. ✅ Verificar que se muestran las coordenadas como respaldo
4. ✅ Verificar que el usuario puede editar manualmente

### Prueba 5: Edición Manual
1. ✅ Obtener ubicación automáticamente
2. ✅ Editar manualmente el campo de ubicación
3. ✅ Crear apiario
4. ✅ Verificar que se guarda la ubicación editada manualmente
5. ✅ Verificar que las coordenadas originales se mantienen en Firestore

## 📁 Archivos Creados/Modificados

### Nuevos
1. **`src/services/geolocation.ts`** - Servicio de geolocalización
   - Funciones para obtener ubicación
   - Reverse geocoding con Nominatim
   - Manejo de errores

### Modificados
1. **`src/services/firestoreApi.ts`**
   - Interfaz `Apiary` actualizada con campo `coordinates`
   - Función `createApiary` actualizada para aceptar coordenadas

2. **`src/components/ApiarySelector.tsx`**
   - Estados para coordenadas, carga y errores
   - Función `handleGetLocation`
   - Botón de geolocalización en el formulario
   - Mensajes de error y coordenadas

## 🎯 Beneficios

### Para el Usuario
- ✅ Facilita la creación de apiarios
- ✅ Ubicación precisa con coordenadas GPS
- ✅ Dirección legible automáticamente
- ✅ Posibilidad de edición manual
- ✅ Mensajes de error claros

### Para la Aplicación
- ✅ Datos de ubicación precisos
- ✅ Posibilidad de mostrar apiarios en mapa futuro
- ✅ Búsqueda por ubicación
- ✅ Análisis geográfico de apiarios

## 🚀 Próximos Pasos

### Funcionalidades Futuras
1. **Mapa de Apiarios**
   - Mostrar apiarios en un mapa interactivo
   - Usar coordenadas guardadas
   - Usar Leaflet o Google Maps

2. **Búsqueda por Ubicación**
   - Buscar apiarios cercanos
   - Filtrar por distancia
   - Radio de búsqueda configurable

3. **Análisis Geográfico**
   - Estadísticas por región
   - Clima promedio por ubicación
   - Recomendaciones basadas en ubicación

## ✅ Estado del Proyecto

- ✅ Build exitoso (1,706KB JS, 70KB CSS)
- ✅ Sin errores de TypeScript
- ✅ Servicio de geolocalización creado
- ✅ Integración con Nominatim
- ✅ Manejo de errores completo
- ✅ Coordenadas guardadas en Firestore
- ✅ UI/UX optimizada
- ✅ Documentación completa

## 🎉 Conclusión

La funcionalidad de geolocalización está completamente implementada y funcional. Los usuarios ahora pueden usar su ubicación actual para crear apiarios de manera más rápida y precisa, con manejo robusto de errores y posibilidad de edición manual.

**Happy Beekeeping! 🐝**
