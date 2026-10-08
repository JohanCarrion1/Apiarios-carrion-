import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { loadSettings, saveSettings } from '../utils/storage';
import { onFirestoreHydrated } from '../services/firestoreSync';

interface Settings {
  theme: 'dark' | 'light' | 'auto';
  fontSize: 'small' | 'normal' | 'large';
  animations: boolean;
  apiaryName: string;
  apiaryLocation: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  notifications: {
    inspectionReminders: boolean;
    treatments: boolean;
    alerts: boolean;
    harvests: boolean;
    sound: boolean;
    frequency: 'immediate' | '1day' | '3days';
    daysBefore: number;
    kinds: {
      inspections: boolean;
      harvests: boolean;
      breeding: boolean;
      flowering: boolean;
      tasks: boolean;
    };
    delivery: 'visual' | 'push';
  };
  photos: {
    enabled: boolean;
    compression: 'low' | 'medium' | 'high';
    limit: number;
  };
  weightUnit: 'kg' | 'lb';
  temperatureUnit: 'celsius' | 'fahrenheit';
  windSpeedUnit: 'kmh' | 'mph';
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  theme: 'dark',
  fontSize: 'normal',
  animations: true,
  apiaryName: '',
  apiaryLocation: '',
  location: {
    name: 'Huaraz',
    latitude: -9.5278,
    longitude: -77.5278,
  },
  notifications: {
    inspectionReminders: true,
    treatments: true,
    alerts: true,
    harvests: true,
    sound: true,
    frequency: 'immediate',
    daysBefore: 3,
    kinds: {
      inspections: true,
      harvests: true,
      breeding: true,
      flowering: true,
      tasks: true,
    },
    delivery: 'visual',
  },
  photos: {
    enabled: true,
    compression: 'medium',
    limit: 5,
  },
  weightUnit: 'kg',
  temperatureUnit: 'celsius',
  windSpeedUnit: 'kmh',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Fusiona lo guardado con los defaults: los campos que una versión anterior no
 * tenía (o un guardado a medias) no se quedan undefined.
 */
const mergeSettings = (saved: any): Settings => {
  if (!saved || Object.keys(saved).length === 0) return defaultSettings;
  try {
    return {
      ...defaultSettings,
      ...saved,
      notifications: {
        ...defaultSettings.notifications,
        ...(saved.notifications || {}),
        kinds: {
          ...defaultSettings.notifications.kinds,
          ...(saved.notifications?.kinds || {}),
        },
      },
    };
  } catch {
    return defaultSettings;
  }
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => mergeSettings(loadSettings()));

  // Hidratación de Firestore → caché local. Hasta que no termina, los ajustes
  // se guardan SOLO en local: si se subieran desde el arranque, el guardado de
  // este dispositivo pisaría los del servidor (otro navegador/otro día) antes
  // de que la hidratación llegara a leerlos. Cuando termina, se marca "armado"
  // — a partir de ahí cada cambio sube — y se recarga el estado por si trajo
  // valores de otra sesión.
  const hydratedRef = useRef(false);
  useEffect(
    () =>
      onFirestoreHydrated(() => {
        hydratedRef.current = true;
        setSettings(mergeSettings(loadSettings()));
      }),
    []
  );

  useEffect(() => {
    saveSettings(settings, { sync: hydratedRef.current });
    
    // Aplicar tema
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (settings.theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      // Auto
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }

    // Aplicar tamaño de fuente
    root.style.fontSize = settings.fontSize === 'small' ? '14px' : settings.fontSize === 'large' ? '18px' : '16px';
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
