import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWeatherData, type WeatherData } from "./services/weather";

/** Revela el elemento cuando entra en el viewport (una sola vez). */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/** Cuenta de 0 a `target` con easing cuando `start` es true. */
export function useCountUp(target: number, start: boolean, duration = 1500, decimals = 0) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((target * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration, decimals]);

  return val;
}

/** Hook para cargar datos desde Supabase con refresco automático. */
export function useSupabaseData<T>(
  fetcher: () => Promise<T>,
  deps: any[] = []
): { data: T | null; loading: boolean; error: string | null; refresh: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh };
}

/** Reloj en vivo (HH:MM). */
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ============================================
// CLIMA EN TIEMPO REAL (geolocalización + Open-Meteo)
// ============================================

const WEATHER_REFRESH_MS = 30 * 60 * 1000; // 30 minutos

interface GeoCoords {
  lat: number;
  lon: number;
}

function getDevicePosition(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('NOT_SUPPORTED'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

async function fallbackByIP(): Promise<GeoCoords | null> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return { lat: data.latitude, lon: data.longitude };
    }
  } catch {
    /* sin conexión o el servicio no responde */
  }
  return null;
}

export type WeatherError = 'denied' | 'error' | null;

export interface UseWeatherResult {
  weather: WeatherData | null;
  loading: boolean;
  error: WeatherError;
  lastUpdated: number | null;
  usingCache: boolean;
  retry: () => void;
}

/**
 * Clima basado en la ubicación GPS real del dispositivo.
 * - Usa coordenadas del apiario activo si existen (apiary_${apiaryId}_coords).
 * - Si no, pide permiso y guarda `user_${userId}_lastLocation` para no volver a pedirlo.
 * - Si se deniega el permiso: usa la última ubicación guardada o fallback por IP.
 * - Cache de la API en `user_${userId}_weatherCache` (30 min).
 */
export function useWeather(
  userId?: string | null,
  apiaryId?: string | null,
  apiaryCoords?: { lat: number; lng: number } | null
): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<WeatherError>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = userId ? `user_${userId}_weatherCache` : 'user_last_weatherCache';

    // 1. Cache de respuesta (30 minutos)
    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && cached.data && typeof cached.timestamp === 'number') {
          if (Date.now() - cached.timestamp < WEATHER_REFRESH_MS) {
            setWeather(cached.data);
            setUsingCache(true);
            setLastUpdated(cached.timestamp);
            setLoading(false);
            return;
          }
        }
      }
    } catch {
      /* cache corrupto: se ignora */
    }

    // 2. Resolver coordenadas
    let coords: GeoCoords | null = null;

    // 2a. Coordenadas por apiario (prioridad) / guardadas por apiario
    const storedApiaryKey = apiaryId ? `apiary_${apiaryId}_coords` : null;
    try {
      const storedApiaryRaw = storedApiaryKey ? localStorage.getItem(storedApiaryKey) : null;
      if (storedApiaryRaw) {
        const stored = JSON.parse(storedApiaryRaw);
        if (stored && typeof stored.lat === 'number' && typeof stored.lng === 'number') {
          coords = { lat: stored.lat, lon: stored.lng };
        }
      }
    } catch {
      /* ignore */
    }
    if (!coords && apiaryCoords && typeof apiaryCoords.lat === 'number' && typeof apiaryCoords.lng === 'number') {
      coords = { lat: apiaryCoords.lat, lon: apiaryCoords.lng };
    }

    // 2b. Última ubicación del dispositivo guardada (sin pedir permiso otra vez)
    const lastLocationKey = userId ? `user_${userId}_lastLocation` : 'user_lastLocation';
    let lastLocation: { lat: number; lon: number; timestamp: number } | null = null;
    try {
      const lastRaw = localStorage.getItem(lastLocationKey);
      if (lastRaw) {
        const parsed = JSON.parse(lastRaw);
        const storedLat = typeof parsed.lat === 'number' ? parsed.lat : null;
        const storedLon =
          typeof parsed.lon === 'number' ? parsed.lon : typeof parsed.lng === 'number' ? parsed.lng : null;
        if (storedLat !== null && storedLon !== null) {
          lastLocation = { lat: storedLat, lon: storedLon, timestamp: parsed.timestamp || 0 };
        }
      }
    } catch {
      /* ignore */
    }

    if (!coords && lastLocation && Date.now() - lastLocation.timestamp < WEATHER_REFRESH_MS) {
      coords = { lat: lastLocation.lat, lon: lastLocation.lon };
    }

    // 2c. GPS del dispositivo
    if (!coords) {
      try {
        const position = await getDevicePosition();
        coords = position;
        localStorage.setItem(
          lastLocationKey,
          JSON.stringify({ lat: position.lat, lon: position.lon, timestamp: Date.now() })
        );
        if (storedApiaryKey) {
          localStorage.setItem(
            storedApiaryKey,
            JSON.stringify({ lat: position.lat, lon: position.lon, timestamp: Date.now() })
          );
        }
      } catch {
        // 2d. Permiso denegado o sin señal → última guardada o fallback por IP
        if (lastLocation) {
          coords = { lat: lastLocation.lat, lon: lastLocation.lon };
        } else {
          coords = await fallbackByIP();
        }
        if (!coords) {
          setError('denied');
          setLoading(false);
          return;
        }
      }
    }

    // 3. Fetch Open-Meteo
    try {
      const data = await fetchWeatherData(coords.lat, coords.lon);
      const timestamp = Date.now();
      setWeather(data);
      setUsingCache(false);
      setLastUpdated(timestamp);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp }));
      } catch {
        /* almacenamiento lleno o no disponible */
      }
    } catch (err) {
      console.error('⚠️ [WEATHER] Error al obtener clima:', err);
      // 4. Si falla la API: mostrar último dato cacheado con indicador de antigüedad
      setError('error');
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && cached.data) {
            setWeather(cached.data);
            setUsingCache(true);
            setLastUpdated(cached.timestamp || Date.now());
          }
        }
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }, [userId, apiaryId, apiaryCoords]);

  useEffect(() => {
    load();
    const interval = setInterval(load, WEATHER_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const retry = useCallback(() => {
    load();
  }, [load]);

  return { weather, loading, error, lastUpdated, usingCache, retry };
}
