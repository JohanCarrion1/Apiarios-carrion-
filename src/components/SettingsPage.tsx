import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface SettingsPageProps {
  onClose: () => void;
}

export default function SettingsPage({ onClose }: SettingsPageProps) {
  const { t, language, setLanguage } = useTranslation();
  const { user, updateUser } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [activeSection, setActiveSection] = useState('profile');
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    // Calcular almacenamiento usado
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    setStorageUsed(Math.round(total / 1024)); // en KB
  }, []);

  const sections = [
    { id: 'profile', icon: '👤', label: t('settings.profile') },
    { id: 'appearance', icon: '🎨', label: t('settings.appearance') },
    { id: 'language', icon: '🌐', label: t('settings.language') },
    { id: 'units', icon: '📏', label: t('settings.units') },
    { id: 'location', icon: '📍', label: t('settings.location') },
    { id: 'notifications', icon: '🔔', label: t('settings.notifications') },
    { id: 'photos', icon: '📷', label: t('settings.photos') },
    { id: 'data', icon: '💾', label: t('settings.data') },
    { id: 'about', icon: 'ℹ️', label: t('settings.about') },
  ];

  const handleExportData = () => {
    const data = {
      hives: JSON.parse(localStorage.getItem('hives') || '[]'),
      inspections: JSON.parse(localStorage.getItem('inspections') || '[]'),
      tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
      events: JSON.parse(localStorage.getItem('events') || '[]'),
      settings: JSON.parse(localStorage.getItem('settings') || '{}'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apiarios-carrion-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.hives) localStorage.setItem('hives', JSON.stringify(data.hives));
        if (data.inspections) localStorage.setItem('inspections', JSON.stringify(data.inspections));
        if (data.tasks) localStorage.setItem('tasks', JSON.stringify(data.tasks));
        if (data.events) localStorage.setItem('events', JSON.stringify(data.events));
        if (data.settings) localStorage.setItem('settings', JSON.stringify(data.settings));
        alert(t('message.saved'));
        window.location.reload();
      } catch (error) {
        alert(t('message.error'));
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const hives = JSON.parse(localStorage.getItem('hives') || '[]');
    const csv = [
      ['Código', 'Nombre', 'Estado', 'Reina', 'Ubicación', 'Notas'].join(','),
      ...hives.map((h: any) => [h.code, h.name, h.status, h.queenYear, h.location, h.notes].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colmenas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAllData = () => {
    const confirmation = prompt(t('settings.data.typeToConfirm'));
    if (confirmation === 'BORRAR') {
      localStorage.clear();
      alert(t('message.deleted'));
      window.location.reload();
    }
  };

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        updateSettings({
          location: {
            name: 'Mi ubicación',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }
        });
      });
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center text-3xl font-bold text-amber-500">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-cream">{user?.name}</h3>
                <p className="text-sm text-cream/60">{user?.email}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-2">
                {t('settings.fullName')}
              </label>
              <input
                type="text"
                value={user?.name || ''}
                onChange={(e) => updateUser({ name: e.target.value })}
                className="w-full bg-ink/50 border border-line rounded-lg px-4 py-2 text-cream focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-2">
                {t('settings.email')}
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-ink/30 border border-line rounded-lg px-4 py-2 text-cream/60 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-2">
                {t('settings.apiaryName')}
              </label>
              <input
                type="text"
                value={settings.apiaryName || ''}
                onChange={(e) => updateSettings({ apiaryName: e.target.value })}
                className="w-full bg-ink/50 border border-line rounded-lg px-4 py-2 text-cream focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-2">
                {t('settings.apiaryLocation')}
              </label>
              <input
                type="text"
                value={settings.apiaryLocation || ''}
                onChange={(e) => updateSettings({ apiaryLocation: e.target.value })}
                className="w-full bg-ink/50 border border-line rounded-lg px-4 py-2 text-cream focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-3">
                {t('settings.theme')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['dark', 'light', 'auto'] as const).map((theme) => (
                  <motion.button
                    key={theme}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings({ theme })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.theme === theme
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-line bg-ink/50'
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🔄'}
                    </div>
                    <div className="text-sm font-medium text-cream">
                      {t(`settings.theme.${theme}` as any)}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-3">
                {t('settings.fontSize')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['small', 'normal', 'large'] as const).map((size) => (
                  <motion.button
                    key={size}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings({ fontSize: size })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.fontSize === size
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-line bg-ink/50'
                    }`}
                  >
                    <div className={`font-medium text-cream ${
                      size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
                    }`}>
                      Aa
                    </div>
                    <div className="text-xs text-cream/60 mt-1">
                      {t(`settings.fontSize.${size}` as any)}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-ink/50 rounded-lg">
              <div>
                <div className="font-medium text-cream">{t('settings.animations')}</div>
                <div className="text-sm text-cream/60">
                  {settings.animations ? t('settings.animations.enabled') : t('settings.animations.disabled')}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => updateSettings({ animations: !settings.animations })}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.animations ? 'bg-amber-500' : 'bg-line'
                }`}
              >
                <motion.div
                  animate={{ x: settings.animations ? 28 : 4 }}
                  className="absolute top-1 w-5 h-5 bg-cream rounded-full"
                />
              </motion.button>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <p className="text-sm text-cream/60">{t('settings.language.applied')}</p>
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLanguage('es')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  language === 'es'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-line bg-ink/50'
                }`}
              >
                <div className="text-4xl mb-3">🇪🇸</div>
                <div className="text-lg font-medium text-cream">Español</div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLanguage('en')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  language === 'en'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-line bg-ink/50'
                }`}
              >
                <div className="text-4xl mb-3">🇺🇸</div>
                <div className="text-lg font-medium text-cream">English</div>
              </motion.button>
            </div>
          </div>
        );

      case 'units':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-3">
                {t('settings.units.weight')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['kg', 'lb'] as const).map((unit) => (
                  <motion.button
                    key={unit}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings({ weightUnit: unit })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.weightUnit === unit
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-line bg-ink/50'
                    }`}
                  >
                    <div className="text-lg font-medium text-cream">
                      {unit === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-3">
                {t('settings.units.temperature')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['celsius', 'fahrenheit'] as const).map((unit) => (
                  <motion.button
                    key={unit}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings({ temperatureUnit: unit })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.temperatureUnit === unit
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-line bg-ink/50'
                    }`}
                  >
                    <div className="text-lg font-medium text-cream">
                      {unit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-3">
                {t('settings.units.windSpeed')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['kmh', 'mph'] as const).map((unit) => (
                  <motion.button
                    key={unit}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings({ windSpeedUnit: unit })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.windSpeedUnit === unit
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-line bg-ink/50'
                    }`}
                  >
                    <div className="text-lg font-medium text-cream">
                      {unit === 'kmh' ? 'km/h' : 'mph'}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-cream/80 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                value={settings.location.name}
                onChange={(e) => updateSettings({ location: { ...settings.location, name: e.target.value } })}
                className="w-full bg-ink/50 border border-line rounded-lg px-4 py-2 text-cream focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cream/80 mb-2">
                  Latitud
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={settings.location.latitude}
                  onChange={(e) => updateSettings({ location: { ...settings.location, latitude: parseFloat(e.target.value) } })}
                  className="w-full bg-ink/50 border border-line rounded-lg px-4 py-2 text-cream focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cream/80 mb-2">
                  Longitud
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={settings.location.longitude}
                  onChange={(e) => updateSettings({ location: { ...settings.location, longitude: parseFloat(e.target.value) } })}
                  className="w-full bg-ink/50 border border-line rounded-lg px-4 py-2 text-cream focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGeolocation}
              className="w-full p-4 bg-amber-500/20 border border-amber-500 rounded-lg text-amber-500 font-medium hover:bg-amber-500/30 transition-colors"
            >
              📍 {language === 'es' ? 'Usar mi ubicación actual' : 'Use my current location'}
            </motion.button>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            {[
              { key: 'inspectionReminders', label: t('settings.notifications.inspectionReminders') },
              { key: 'treatments', label: t('settings.notifications.treatments') },
              { key: 'alerts', label: t('settings.notifications.alerts') },
              { key: 'harvests', label: t('settings.notifications.harvests') },
              { key: 'sound', label: t('settings.notifications.sound') },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-ink/50 rounded-lg">
                <div className="font-medium text-cream">{label}</div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => updateSettings({ notifications: { ...settings.notifications, [key]: !settings.notifications[key as keyof typeof settings.notifications] } })}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    settings.notifications[key as keyof typeof settings.notifications] ? 'bg-amber-500' : 'bg-line'
                  }`}
                >
                  <motion.div
                    animate={{ x: settings.notifications[key as keyof typeof settings.notifications] ? 28 : 4 }}
                    className="absolute top-1 w-5 h-5 bg-cream rounded-full"
                  />
                </motion.button>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-3">
                {t('settings.notifications.frequency')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['immediate', '1day', '3days'] as const).map((freq) => (
                  <motion.button
                    key={freq}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings({ notifications: { ...settings.notifications, frequency: freq } })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.notifications.frequency === freq
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-line bg-ink/50'
                    }`}
                  >
                    <div className="text-sm font-medium text-cream">
                      {t(`settings.notifications.frequency.${freq}` as any)}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'photos':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-ink/50 rounded-lg">
              <div>
                <div className="font-medium text-cream">{t('settings.photos.enabled')}</div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => updateSettings({ photos: { ...settings.photos, enabled: !settings.photos.enabled } })}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.photos.enabled ? 'bg-amber-500' : 'bg-line'
                }`}
              >
                <motion.div
                  animate={{ x: settings.photos.enabled ? 28 : 4 }}
                  className="absolute top-1 w-5 h-5 bg-cream rounded-full"
                />
              </motion.button>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-3">
                {t('settings.photos.compression')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as const).map((quality) => (
                  <motion.button
                    key={quality}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings({ photos: { ...settings.photos, compression: quality } })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.photos.compression === quality
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-line bg-ink/50'
                    }`}
                  >
                    <div className="text-sm font-medium text-cream">
                      {t(`settings.photos.compression.${quality}` as any)}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream/80 mb-3">
                {t('settings.photos.limit')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[3, 5, 10].map((limit) => (
                  <motion.button
                    key={limit}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => updateSettings({ photos: { ...settings.photos, limit } })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      settings.photos.limit === limit
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-line bg-ink/50'
                    }`}
                  >
                    <div className="text-lg font-bold text-cream">{limit}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-ink/50 rounded-lg">
              <div className="text-sm text-cream/60 mb-1">{t('settings.data.storageUsed')}</div>
              <div className="text-2xl font-bold text-cream">{storageUsed} KB</div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportData}
              className="w-full p-4 bg-amber-500/20 border border-amber-500 rounded-lg text-amber-500 font-medium hover:bg-amber-500/30 transition-colors"
            >
              📥 {t('settings.data.exportAll')}
            </motion.button>

            <label className="block">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-4 bg-ink/50 border border-line rounded-lg text-cream font-medium hover:bg-ink/70 transition-colors cursor-pointer text-center"
              >
                📤 {t('settings.data.importData')}
              </motion.div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportCSV}
              className="w-full p-4 bg-ink/50 border border-line rounded-lg text-cream font-medium hover:bg-ink/70 transition-colors"
            >
              📊 {t('settings.data.exportCSV')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteAllData}
              className="w-full p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-500 font-medium hover:bg-red-500/30 transition-colors"
            >
              🗑️ {t('settings.data.deleteAll')}
            </motion.button>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-amber-500/20 flex items-center justify-center text-5xl">
              🐝
            </div>
            <div>
              <h3 className="text-2xl font-bold text-cream mb-2">Apiarios Carrión</h3>
              <p className="text-sm text-cream/60">{t('settings.about.version')} 1.0.0</p>
            </div>
            <p className="text-sm text-cream/80">{t('settings.about.description')}</p>
            
            <div className="p-4 bg-ink/50 rounded-lg text-left">
              <div className="text-sm font-medium text-cream/80 mb-2">{t('settings.about.technologies')}</div>
              <div className="flex flex-wrap gap-2">
                {['React', 'TypeScript', 'TailwindCSS', 'Framer Motion', 'Recharts'].map((tech) => (
                  <span key={tech} className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs text-amber-500">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-ink/50 rounded-lg">
              <div className="text-sm text-cream/60 mb-1">{t('settings.about.developedBy')}</div>
              <div className="text-lg font-bold text-cream">Johan Carrión</div>
              <div className="text-sm text-cream/60 mt-2">{t('settings.about.year')} 2026</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-ink/95 overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-cream">{t('settings.title')}</h1>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-ink/50 flex items-center justify-center text-cream hover:bg-ink/70 transition-colors"
          >
            ✕
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-2">
              {sections.map((section) => (
                <motion.button
                  key={section.id}
                  whileHover={{ x: 4 }}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    activeSection === section.id
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'text-cream/60 hover:bg-ink/50'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Mobile - Accordion */}
          <div className="lg:hidden space-y-2 mb-6">
            {sections.map((section) => (
              <motion.button
                key={section.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg transition-all ${
                  activeSection === section.id
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-ink/50 text-cream/60'
                }`}
              >
                <span className="text-xl">{section.icon}</span>
                <span className="font-medium">{section.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-pane/50 rounded-xl p-6 border border-line"
            >
              {renderSection()}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
