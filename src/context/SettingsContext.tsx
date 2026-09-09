import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
    
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
