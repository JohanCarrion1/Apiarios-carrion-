// Servicio de clima usando Open-Meteo API (gratuita, sin API key)

export interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
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

// Códigos de clima WMO
export const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Cielo despejado', icon: 'sun' },
  1: { description: 'Principalmente despejado', icon: 'sun' },
  2: { description: 'Parcialmente nublado', icon: 'cloud-sun' },
  3: { description: 'Nublado', icon: 'cloud' },
  45: { description: 'Niebla', icon: 'fog' },
  48: { description: 'Niebla con escarcha', icon: 'fog' },
  51: { description: 'Llovizna ligera', icon: 'drizzle' },
  53: { description: 'Llovizna moderada', icon: 'drizzle' },
  55: { description: 'Llovizna densa', icon: 'drizzle' },
  61: { description: 'Lluvia ligera', icon: 'rain' },
  63: { description: 'Lluvia moderada', icon: 'rain' },
  65: { description: 'Lluvia fuerte', icon: 'rain-heavy' },
  71: { description: 'Nieve ligera', icon: 'snow' },
  73: { description: 'Nieve moderada', icon: 'snow' },
  75: { description: 'Nieve fuerte', icon: 'snow-heavy' },
  80: { description: 'Chubascos ligeros', icon: 'rain' },
  81: { description: 'Chubascos moderados', icon: 'rain' },
  82: { description: 'Chubascos violentos', icon: 'rain-heavy' },
  95: { description: 'Tormenta', icon: 'thunderstorm' },
  96: { description: 'Tormenta con granizo', icon: 'thunderstorm' },
  99: { description: 'Tormenta con granizo fuerte', icon: 'thunderstorm' },
};

export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  locationName: string = 'Ubicación actual'
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const weatherData: WeatherData = {
      current: {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
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

    // Guardar en cache
    localStorage.setItem('weather_cache', JSON.stringify({
      data: weatherData,
      timestamp: Date.now(),
    }));

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    
    // Intentar usar cache si existe
    const cached = localStorage.getItem('weather_cache');
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }

    throw error;
  }
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
  const weatherInfo = WEATHER_CODES[code];
  if (!weatherInfo) return 'sun';
  
  // Ajustar icono según día/noche
  if (!isDay && weatherInfo.icon === 'sun') {
    return 'moon';
  }
  
  return weatherInfo.icon;
}

export function getWeatherDescription(code: number): string {
  const weatherInfo = WEATHER_CODES[code];
  return weatherInfo ? weatherInfo.description : 'Desconocido';
}
