// ============================================
// SERVICIO DE GEOLOCALIZACIÓN
// ============================================
// GPS: API del navegador (navigator.geolocation).
// Reverse geocoding: proxy /api/geocode → Mapbox.
// Elevación (msnm): Open-Meteo (sin clave).

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number;
  elevation?: number;
}

export interface GeolocationError {
  code: string;
  message: string;
}

/**
 * Obtener ubicación actual del dispositivo (alta precisión).
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
      (position) => resolve(position),
      (error) => {
        let errorMessage = 'Error al obtener la ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Permiso de ubicación denegado. Permite el acceso a tu ubicación en el navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage =
              'Tiempo de espera agotado. Prueba "Marcar en mapa" o vuelve a intentar.';
            break;
        }
        reject({ code: error.code.toString(), message: errorMessage });
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 0,
      },
    );
  });
}

/**
 * Convertir coordenadas a dirección legible vía /api/geocode (Mapbox).
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
          'Error al obtener la dirección desde Mapbox',
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
 * Altitud en msnm para unas coordenadas (Open-Meteo, sin API key).
 */
export async function fetchElevation(lat: number, lng: number): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
    });
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { elevation?: number[] };
    const elev = Array.isArray(data.elevation) ? data.elevation[0] : null;
    if (typeof elev !== 'number' || Number.isNaN(elev)) return null;
    return Math.round(elev);
  } catch (err) {
    console.warn('⚠️ [GEOLOCATION] Elevación no disponible:', err);
    return null;
  }
}

/**
 * Ubicación actual + dirección + elevación.
 */
export async function getCurrentLocationWithAddress(): Promise<GeoLocation> {
  const position = await getCurrentPosition();
  const { latitude, longitude, accuracy } = position.coords;

  let address: string | undefined;
  let elevation: number | undefined;

  try {
    address = await reverseGeocode(latitude, longitude);
  } catch {
    console.warn('⚠️ [GEOLOCATION] Reverse geocoding falló');
  }

  try {
    const elev = await fetchElevation(latitude, longitude);
    if (elev != null) elevation = elev;
  } catch {
    /* opcional */
  }

  return {
    lat: latitude,
    lng: longitude,
    accuracy,
    ...(address ? { address } : {}),
    ...(elevation != null ? { elevation } : {}),
  };
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
