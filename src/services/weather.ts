// Servicio de clima usando Open-Meteo API (gratuita, sin API key)

export interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection?: number;
    precipitation: number;
    weatherCode: number;
    isDay: boolean;
  };
  daily: {
    date: string;
    weatherCode: number;
    tempMax: number;
    tempMin: number;
    precipitationProbability: number;
  }[];
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

export interface WeatherAlert {
  type: 'rain' | 'wind' | 'cold';
  message: string;
  severity: 'warning' | 'danger';
}

export interface WeatherInfo {
  description: string;
  icon: string;
  emoji: string;
}

// Mapeo de weather_code (WMO) a íconos y texto en español
const WEATHER_GROUPS: Array<{ range: [number, number]; info: WeatherInfo }> = [
  { range: [0, 0], info: { description: 'Despejado', icon: 'sun', emoji: '☀️' } },
  { range: [1, 3], info: { description: 'Parcialmente nublado', icon: 'cloud-sun', emoji: '⛅' } },
  { range: [45, 48], info: { description: 'Niebla', icon: 'fog', emoji: '🌫️' } },
  { range: [51, 57], info: { description: 'Llovizna', icon: 'drizzle', emoji: '🌦️' } },
  { range: [61, 67], info: { description: 'Lluvia', icon: 'rain', emoji: '🌧️' } },
  { range: [71, 77], info: { description: 'Nieve', icon: 'snow', emoji: '❄️' } },
  { range: [80, 82], info: { description: 'Chubascos', icon: 'rain', emoji: '🌧️' } },
  { range: [85, 86], info: { description: 'Chubascos', icon: 'snow', emoji: '🌨️' } },
  { range: [95, 99], info: { description: 'Tormenta', icon: 'thunderstorm', emoji: '⛈️' } },
];

const FALLBACK_WEATHER_INFO: WeatherInfo = {
  description: 'Despejado',
  icon: 'sun',
  emoji: '☀️',
};

export function getWeatherInfo(code: number): WeatherInfo {
  const group = WEATHER_GROUPS.find(({ range }) => code >= range[0] && code <= range[1]);
  return group ? group.info : FALLBACK_WEATHER_INFO;
}

// Tabla de códigos WMO (compatibilidad con el cliente existente)
export const WEATHER_CODES: Record<number, WeatherInfo> = (() => {
  const map: Record<number, WeatherInfo> = {};
  WEATHER_GROUPS.forEach(({ range, info }) => {
    for (let code = range[0]; code <= range[1]; code++) {
      map[code] = info;
    }
  });
  return map;
})();

const DEFAULT_URL_PARAMS =
  'current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5';

export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  locationName: string = 'Ubicación actual'
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&${DEFAULT_URL_PARAMS}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  return {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      windDirection: data.current.wind_direction_10m,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
    },
    daily: data.daily.time.map((date: string, index: number) => ({
      date,
      weatherCode: data.daily.weather_code[index],
      tempMax: Math.round(data.daily.temperature_2m_max[index]),
      tempMin: Math.round(data.daily.temperature_2m_min[index]),
      precipitationProbability: data.daily.precipitation_probability_max[index] || 0,
    })),
    location: {
      name: locationName,
      latitude,
      longitude,
    },
  };
}

export function getWeatherAlerts(weather: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // Alerta de lluvia fuerte
  const todayForecast = weather.daily[0];
  if (todayForecast && todayForecast.precipitationProbability > 70) {
    alerts.push({
      type: 'rain',
      message: 'Lluvia fuerte prevista, considerar proteger colmenas',
      severity: 'warning',
    });
  }

  // Alerta de viento fuerte
  if (weather.current.windSpeed > 30) {
    alerts.push({
      type: 'wind',
      message: 'Viento fuerte, revisar ubicaciones expuestas',
      severity: 'warning',
    });
  }

  // Alerta de temperatura baja
  if (weather.current.temperature < 10) {
    alerts.push({
      type: 'cold',
      message: 'Temperatura baja, verificar alimentación de colmenas',
      severity: 'danger',
    });
  }

  return alerts;
}

export function getWeatherIcon(code: number, isDay: boolean = true): string {
  const { icon } = getWeatherInfo(code);

  // Ajustar icono según día/noche
  if (!isDay && icon === 'sun') {
    return 'moon';
  }

  return icon;
}

export function getWeatherDescription(code: number): string {
  return getWeatherInfo(code).description;
}

export function getWeatherEmoji(code: number): string {
  return getWeatherInfo(code).emoji;
}