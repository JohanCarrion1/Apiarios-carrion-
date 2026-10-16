// ============================================
// SERVICIO DE GEOLOCALIZACIÓN
// ============================================
// GPS: API del navegador (navigator.geolocation).
// Reverse geocoding: proxy /api/geocode → Mapbox (clave en Vercel,
// nunca en el bundle). Mismo patrón que /api/gemini del asistente IA.

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
    if (!navigator.geolocation) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Tu navegador no soporta geolocalización',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        let errorMessage = 'Error al obtener la ubicación';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage =
              'Tiempo de espera agotado al obtener la ubicación. Prueba "Marcar en mapa" o vuelve a intentar.';
            break;
        }

        reject({
          code: error.code.toString(),
          message: errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        // 20s: en móvil con GPS frío a menudo supera los 10s.
        timeout: 20000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Convertir coordenadas a dirección legible vía proxy Mapbox.
 * El cliente llama a /api/geocode; el servidor añade MAPBOX_ACCESS_TOKEN
 * y reenvía a la API de Mapbox (igual patrón que el asistente IA).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    });
    const response = await fetch(`/api/geocode?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        (data as { error?: string })?.error ||
          'Error al obtener la dirección desde Mapbox'
      );
    }

    const address = (data as { address?: string })?.address;
    if (!address || typeof address !== 'string') {
      throw new Error('No se pudo obtener la dirección');
    }

    return address;
  } catch (error) {
    console.error('❌ [GEOLOCATION] Error en reverse geocoding:', error);
    throw error;
  }
}

/**
 * Obtener ubicación actual con dirección legible
 */
export async function getCurrentLocationWithAddress(): Promise<GeoLocation> {
  const position = await getCurrentPosition();
  const { latitude, longitude, accuracy } = position.coords;

  try {
    const address = await reverseGeocode(latitude, longitude);
    return {
      lat: latitude,
      lng: longitude,
      address,
      accuracy,
    };
  } catch {
    console.warn(
      '⚠️ [GEOLOCATION] Reverse geocoding falló, devolviendo solo coordenadas'
    );
    return {
      lat: latitude,
      lng: longitude,
      accuracy,
    };
  }
}

/**
 * Formatear coordenadas para display
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
