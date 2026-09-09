import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWeatherData, getWeatherAlerts, getWeatherIcon, getWeatherDescription, type WeatherData, type WeatherAlert } from '../services/weather';

interface WeatherWidgetProps {
  location?: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

// Componente de icono de clima animado
function WeatherIcon({ icon, size = 'large' }: { icon: string; size?: 'small' | 'large' }) {
  const sizeClass = size === 'large' ? 'w-20 h-20' : 'w-8 h-8';

  const icons: Record<string, JSX.Element> = {
    sun: (
      <motion.svg
        className={sizeClass}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="12" cy="12" r="5" fill="#FFD700" />
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <motion.line
              key={angle}
              x1="12"
              y1="2"
              x2="12"
              y2="4"
              stroke="#FFD700"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${angle} 12 12)`}
            />
          ))}
        </motion.g>
      </motion.svg>
    ),
    moon: (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#E0E0E0" />
      </svg>
    ),
    cloud: (
      <motion.svg
        className={sizeClass}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{ x: [0, 2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#B0BEC5" />
      </motion.svg>
    ),
    'cloud-sun': (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="3" fill="#FFD700" />
        <motion.path
          d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
          fill="#B0BEC5"
          animate={{ x: [0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    ),
    rain: (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#78909C" />
        <motion.g animate={{ y: [0, 2, 0] }} transition={{ duration: 1, repeat: Infinity }}>
          <line x1="8" y1="16" x2="8" y2="20" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12" y2="20" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="16" x2="16" y2="20" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </svg>
    ),
    'rain-heavy': (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#546E7A" />
        <motion.g animate={{ y: [0, 3, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
          <line x1="7" y1="16" x2="7" y2="21" stroke="#29B6F6" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="16" x2="10" y2="21" stroke="#29B6F6" strokeWidth="2" strokeLinecap="round" />
          <line x1="13" y1="16" x2="13" y2="21" stroke="#29B6F6" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="16" x2="16" y2="21" stroke="#29B6F6" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </svg>
    ),
    snow: (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#B0BEC5" />
        <motion.g animate={{ y: [0, 2, 0], rotate: [0, 180, 360] }} transition={{ duration: 2, repeat: Infinity }}>
          <circle cx="8" cy="18" r="1" fill="#E1F5FE" />
          <circle cx="12" cy="18" r="1" fill="#E1F5FE" />
          <circle cx="16" cy="18" r="1" fill="#E1F5FE" />
        </motion.g>
      </svg>
    ),
    drizzle: (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#90A4AE" />
        <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <circle cx="8" cy="18" r="0.5" fill="#4FC3F7" />
          <circle cx="12" cy="18" r="0.5" fill="#4FC3F7" />
          <circle cx="16" cy="18" r="0.5" fill="#4FC3F7" />
        </motion.g>
      </svg>
    ),
    fog: (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.g animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
          <line x1="3" y1="10" x2="21" y2="10" stroke="#B0BEC5" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="14" x2="21" y2="14" stroke="#B0BEC5" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="18" x2="21" y2="18" stroke="#B0BEC5" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </svg>
    ),
    thunderstorm: (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#546E7A" />
        <motion.path
          d="M13 16l-2 4h4l-2 4"
          stroke="#FFD700"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </svg>
    ),
  };

  return icons[icon] || icons.sun;
}

export default function WeatherWidget({ location }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);

  const defaultLocation = {
    name: 'Huaraz, Áncash',
    latitude: -9.5278,
    longitude: -77.5278,
  };

  const currentLocation = location || defaultLocation;

  useEffect(() => {
    const loadWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        // Verificar cache (30 minutos)
        const cached = localStorage.getItem('weather_cache');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          const thirtyMinutes = 30 * 60 * 1000;

          if (now - timestamp < thirtyMinutes) {
            setWeather(data);
            setAlerts(getWeatherAlerts(data));
            setLoading(false);
            return;
          }
        }

        // Fetch new data
        const data = await fetchWeatherData(
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.name
        );
        setWeather(data);
        setAlerts(getWeatherAlerts(data));
      } catch (err) {
        setError('No se pudo cargar el clima');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadWeather();

    // Actualizar cada 30 minutos
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentLocation]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="h-20 bg-white/10 rounded"></div>
          <div className="grid grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
        <p className="text-white/60 text-center">{error || 'No se pudo cargar el clima'}</p>
      </div>
    );
  }

  const weatherIcon = getWeatherIcon(weather.current.weatherCode, weather.current.isDay);
  const weatherDescription = getWeatherDescription(weather.current.weatherCode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-2xl"
    >
      {/* Alertas climáticas */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 space-y-2"
          >
            {alerts.map((alert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  alert.severity === 'danger'
                    ? 'bg-red-500/20 border border-red-500/30'
                    : 'bg-amber-500/20 border border-amber-500/30'
                }`}
              >
                <span className="text-xl">⚠️</span>
                <p className={`text-sm font-medium ${
                  alert.severity === 'danger' ? 'text-red-300' : 'text-amber-300'
                }`}>
                  {alert.message}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clima actual */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/60 text-sm mb-1">{weather.location.name}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-bold text-white">{weather.current.temperature}°</span>
            <span className="text-white/60 text-lg">C</span>
          </div>
          <p className="text-white/80 text-sm mt-1">{weatherDescription}</p>
          <p className="text-white/60 text-xs mt-1">
            Sensación térmica: {weather.current.feelsLike}°C
          </p>
        </div>
        <WeatherIcon icon={weatherIcon} size="large" />
      </div>

      {/* Detalles */}
      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-white/10">
        <div className="text-center">
          <p className="text-white/60 text-xs mb-1">Humedad</p>
          <p className="text-white text-lg font-semibold">{weather.current.humidity}%</p>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-xs mb-1">Viento</p>
          <p className="text-white text-lg font-semibold">{weather.current.windSpeed} km/h</p>
        </div>
        <div className="text-center">
          <p className="text-white/60 text-xs mb-1">Precipitación</p>
          <p className="text-white text-lg font-semibold">{weather.current.precipitation} mm</p>
        </div>
      </div>

      {/* Pronóstico 5 días */}
      <div>
        <p className="text-white/60 text-xs mb-3">PRONÓSTICO 5 DÍAS</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weather.daily.map((day, index) => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayIcon = getWeatherIcon(day.weatherCode);

            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex-shrink-0 w-20 bg-white/5 rounded-lg p-3 text-center"
              >
                <p className="text-white/60 text-xs mb-2">{dayName}</p>
                <div className="flex justify-center mb-2">
                  <WeatherIcon icon={dayIcon} size="small" />
                </div>
                <div className="space-y-1">
                  <p className="text-white text-sm font-semibold">{day.tempMax}°</p>
                  <p className="text-white/60 text-xs">{day.tempMin}°</p>
                </div>
                {day.precipitationProbability > 0 && (
                  <p className="text-blue-300 text-xs mt-1">
                    💧 {day.precipitationProbability}%
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
