// ============================================
// SERVICIO DE GEOLOCALIZACIÓN
// ============================================

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number; // Precisión en metros
}

export interface GeolocationError {
  code: string;
  message: string;
}

/**
 * Obtener ubicación actual del dispositivo
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    // Verificar soporte del navegador
    if (!navigator.geolocation) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Tu navegador no soporta geolocalización'
      });
      return;
    }

    // Obtener posición actual
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        let errorMessage = 'Error al obtener la ubicación';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado al obtener la ubicación';
            break;
        }
        
        reject({
          code: error.code.toString(),
          message: errorMessage
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Convertir coordenadas a dirección legible usando Nominatim (OpenStreetMap)
 * IMPORTANTE: Nominatim tiene límite de 1 solicitud por segundo
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Nominatim requiere un User-Agent identificando la aplicación
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
      {
        headers: {
          'User-Agent': 'ApiariosCarrion/1.0 (https://apiarioscarrion.com)'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener la dirección desde Nominatim');
    }

    const data = await response.json();

    // Construir dirección legible
    if (data.address) {
      const address = data.address;
      const parts = [];

      // Agregar componentes de la dirección en orden de especificidad
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

      // Si no pudimos construir una dirección, usar display_name
      if (parts.length === 0 && data.display_name) {
        return data.display_name;
      }

      return parts.join(', ');
    }

    // Si no hay address, usar display_name
    if (data.display_name) {
      return data.display_name;
    }

    throw new Error('No se pudo obtener la dirección');
  } catch (error) {
    console.error('❌ [GEOLOCATION] Error en reverse geocoding:', error);
    throw error;
  }
}

/**
 * Obtener ubicación actual con dirección legible
 */
export async function getCurrentLocationWithAddress(): Promise<GeoLocation> {
  // Obtener posición actual
  const position = await getCurrentPosition();
  const { latitude, longitude, accuracy } = position.coords;

  // Obtener dirección legible
  try {
    const address = await reverseGeocode(latitude, longitude);
    return {
      lat: latitude,
      lng: longitude,
      address,
      accuracy
    };
  } catch (error) {
    // Si falla el reverse geocoding, devolver solo coordenadas
    console.warn('⚠️ [GEOLOCATION] Reverse geocoding falló, devolviendo solo coordenadas');
    return {
      lat: latitude,
      lng: longitude,
      accuracy
    };
  }
}

/**
 * Formatear coordenadas para display
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
