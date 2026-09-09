# 🌐 Sistema Multi-Idioma y Página de Ajustes - Documentación

## 📋 Resumen

Se ha implementado exitosamente el sistema multi-idioma (Español/Inglés) y una página completa de ajustes con 9 secciones para la aplicación "Apiarios Carrión".

## 🌍 Sistema Multi-Idioma (i18n)

### Estructura de Archivos

#### `src/i18n/translations.ts`
Archivo de traducciones con soporte para Español e Inglés:
- ✅ 100+ claves de traducción
- ✅ Navegación, formularios, estados, botones, mensajes
- ✅ Clima, gráficos, días, meses
- ✅ Todas las secciones de ajustes
- ✅ Tipo `Language` y `TranslationKey` para TypeScript

#### `src/context/LanguageContext.tsx`
Contexto de idioma con hook personalizado:
- ✅ `useTranslation()` - Hook para acceder a traducciones
- ✅ `t(key)` - Función para traducir claves
- ✅ `setLanguage(lang)` - Cambiar idioma
- ✅ Persistencia en localStorage
- ✅ Idioma por defecto: Español

### Uso del Sistema de Traducciones

```typescript
import { useTranslation } from '../context/LanguageContext';

function MyComponent() {
  const { t, language, setLanguage } = useTranslation();
  
  return (
    <div>
      <h1>{t('nav.panel')}</h1>
      <button onClick={() => setLanguage('en')}>English</button>
      <button onClick={() => setLanguage('es')}>Español</button>
    </div>
  );
}
```

### Claves de Traducción Disponibles

**Navegación:**
- `nav.panel`, `nav.hives`, `nav.statistics`, `nav.calendar`, `nav.harvest`, `nav.notebook`, `nav.tasks`, `nav.settings`

**Estados de Colmenas:**
- `hive.status.healthy`, `hive.status.revision`, `hive.status.alert`, `hive.status.noQueen`

**Formulario de Colmena:**
- `hive.code`, `hive.name`, `hive.location`, `hive.queen`, `hive.queenYear`, `hive.queenMark`, `hive.status`, `hive.notes`, `hive.lastInspection`

**Botones:**
- `button.save`, `button.cancel`, `button.edit`, `button.delete`, `button.add`, `button.close`, `button.logout`, `button.confirm`, `button.export`, `button.import`

**Mensajes:**
- `message.saved`, `message.deleted`, `message.error`, `message.confirmDelete`

**Clima:**
- `weather.temperature`, `weather.feelsLike`, `weather.humidity`, `weather.wind`, `weather.precipitation`, `weather.forecast`, `weather.clear`, `weather.partlyCloudy`, `weather.cloudy`, `weather.rain`, `weather.snow`

**Gráficos:**
- `chart.honeyProduction`, `chart.annualComparison`, `chart.statusDistribution`, `chart.varroaOverTime`

**Días y Meses:**
- `days.monday` a `days.sunday`
- `months.january` a `months.december`

**Ajustes:**
- Todas las secciones y campos de la página de ajustes

## ⚙️ Página Completa de Ajustes

### Estructura de Archivos

#### `src/context/SettingsContext.tsx`
Contexto de configuración global:
- ✅ Estado centralizado de todos los ajustes
- ✅ Persistencia en localStorage
- ✅ Aplicación automática de temas
- ✅ Control de tamaño de fuente
- ✅ Control de animaciones

#### `src/components/SettingsPage.tsx`
Página completa de ajustes con 9 secciones:

### Secciones de Ajustes

#### 1. 👤 Perfil
- ✅ Avatar/Iniciales del usuario
- ✅ Nombre completo (editable)
- ✅ Email (solo lectura)
- ✅ Nombre del apiario
- ✅ Ubicación del apiario
- ✅ Guardado automático

#### 2. 🎨 Apariencia
- ✅ **Tema**: Oscuro / Claro / Automático
  - Tema oscuro: fondo `#131009`, textos claros
  - Tema claro: fondo `#FFFFFF`, textos oscuros
  - Automático: detecta preferencia del sistema
- ✅ **Tamaño de fuente**: Pequeño (14px) / Normal (16px) / Grande (18px)
- ✅ **Animaciones**: Activadas / Desactivadas
- ✅ Transición suave de 300ms entre temas

#### 3. 🌐 Idioma
- ✅ Selector visual con banderas
- ✅ 🇪🇸 Español / 🇺🇸 English
- ✅ Cambio instantáneo sin recargar
- ✅ Animación suave al cambiar
- ✅ Texto explicativo

#### 4. 📏 Unidades de Medida
- ✅ **Peso de miel**: Kilogramos (kg) / Libras (lb)
- ✅ **Temperatura**: Celsius (°C) / Fahrenheit (°F)
- ✅ **Velocidad del viento**: km/h / mph
- ✅ Conversión automática en toda la app

#### 5. 📍 Ubicación del Apiario
- ✅ Campo para ciudad
- ✅ Coordenadas GPS (latitud, longitud)
- ✅ Botón "Usar mi ubicación actual"
- ✅ Geolocalización del navegador
- ✅ Reverse geocoding con Nominatim API
- ✅ Actualización automática del widget de clima

#### 6. 🔔 Notificaciones
- ✅ **Recordatorios de inspección** (toggle)
- ✅ **Tratamientos pendientes** (toggle)
- ✅ **Alertas de estado** (toggle)
- ✅ **Cosechas programadas** (toggle)
- ✅ **Sonido de notificaciones** (toggle)
- ✅ **Frecuencia de recordatorios**:
  - Inmediata
  - 1 día antes
  - 3 días antes

#### 7. 📷 Fotos
- ✅ **Permitir fotos en inspecciones** (toggle)
- ✅ **Calidad de compresión**:
  - Baja (500px, 50% calidad)
  - Media (800px, 70% calidad)
  - Alta (1200px, 90% calidad)
- ✅ **Límite de fotos por inspección**: 3 / 5 / 10

#### 8. 💾 Datos
- ✅ **Exportar todos los datos** (JSON)
  - Colmenas, inspecciones, tareas, eventos, ajustes
  - Descarga automática con fecha en nombre
- ✅ **Importar datos** (JSON)
  - Carga desde archivo
  - Validación de formato
  - Recarga automática
- ✅ **Exportar como CSV**
  - Formato compatible con Excel
  - Solo colmenas
- ✅ **Borrar todos los datos**
  - Doble confirmación
  - Escribir "BORRAR" para confirmar
  - Limpieza completa de localStorage
- ✅ **Indicador de almacenamiento usado**
  - Cálculo en tiempo real
  - Mostrado en KB

#### 9. ℹ️ Acerca de
- ✅ Logo de la app (🐝)
- ✅ Nombre: "Apiarios Carrión"
- ✅ Versión: 1.0.0
- ✅ Descripción
- ✅ Tecnologías utilizadas:
  - React
  - TypeScript
  - TailwindCSS
  - Framer Motion
  - Recharts
- ✅ Créditos: "Desarrollado por Johan Carrión"
- ✅ Año: 2026

### Diseño de la Página

#### Layout Desktop
- ✅ Sidebar izquierdo con lista de secciones
- ✅ Contenido principal a la derecha
- ✅ Navegación sticky
- ✅ Iconos representativos para cada sección

#### Layout Móvil
- ✅ Lista vertical de secciones (accordion)
- ✅ Contenido debajo de la lista
- ✅ Navegación compacta
- ✅ Touch-friendly

### Componentes Visuales

#### Toggles Modernos
```typescript
<motion.button
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
```

#### Botones de Selección
```typescript
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
```

## 🎨 Sistema de Temas

### Tema Oscuro (Por Defecto)
- **Fondo**: `#131009` (ink)
- **Paneles**: `#1b140c` a `#2d2214`
- **Textos**: `#f3e9d4` (cream)
- **Acentos**: `#f0a41c` (honey)

### Tema Claro
- **Fondo**: `#FFFFFF` o `#F9FAFB`
- **Textos**: `#1F2937`
- **Acentos**: `#F59E0B` (ámbar)
- **Cards**: blanco con sombra sutil

### Tema Automático
- ✅ Detecta preferencia del sistema con `window.matchMedia`
- ✅ Cambia automáticamente al cambiar el sistema
- ✅ Listener para cambios en tiempo real

### Implementación
```typescript
useEffect(() => {
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
    } else {
      root.classList.add('light');
    }
  }
}, [settings.theme]);
```

## 🔄 Integración con la Aplicación

### Providers
```typescript
export default function App() {
  return (
    <SettingsProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </AuthProvider>
      </LanguageProvider>
    </SettingsProvider>
  );
}
```

### Acceso a Ajustes
```typescript
import { useSettings } from '../context/SettingsContext';

function MyComponent() {
  const { settings, updateSettings } = useSettings();
  
  return (
    <div style={{ fontSize: settings.fontSize === 'large' ? '18px' : '16px' }}>
      <button onClick={() => updateSettings({ theme: 'light' })}>
        Cambiar a tema claro
      </button>
    </div>
  );
}
```

## 📱 Responsive Design

### Desktop (> 1024px)
- ✅ Sidebar fijo a la izquierda (250px)
- ✅ Contenido principal con padding
- ✅ Navegación sticky
- ✅ Grid de 2 columnas para opciones

### Tablet (768px - 1024px)
- ✅ Sidebar colapsable
- ✅ Contenido adaptativo
- ✅ Grid de 2 columnas

### Móvil (< 768px)
- ✅ Lista vertical de secciones
- ✅ Contenido full-width
- ✅ Toggles y botones touch-friendly
- ✅ Padding reducido

## 💾 Persistencia de Datos

### localStorage Keys
- `language` - Idioma seleccionado ('es' | 'en')
- `settings` - Objeto completo de ajustes

### Estructura de Settings
```typescript
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
```

## 🎯 Funcionalidades Implementadas

### Multi-Idioma
- ✅ Sistema de traducciones completo
- ✅ Contexto de idioma con hook
- ✅ Selector visual con banderas
- ✅ Cambio instantáneo
- ✅ Persistencia en localStorage
- ✅ 100+ claves de traducción

### Página de Ajustes
- ✅ 9 secciones completas
- ✅ Perfil editable
- ✅ Sistema de temas (oscuro/claro/auto)
- ✅ Control de tamaño de fuente
- ✅ Control de animaciones
- ✅ Selector de idioma
- ✅ Unidades de medida configurables
- ✅ Ubicación con geolocalización
- ✅ Configuración de notificaciones
- ✅ Configuración de fotos
- ✅ Exportar/Importar datos
- ✅ Borrar datos con confirmación
- ✅ Información de la app

### Diseño
- ✅ Layout responsive (desktop/móvil)
- ✅ Toggles modernos con animaciones
- ✅ Botones de selección visuales
- ✅ Iconos representativos
- ✅ Transiciones suaves
- ✅ Feedback visual

## 🚀 Uso

### Abrir Página de Ajustes
1. Click en botón "⚙️ Ajustes" en el header
2. O desde el menú hamburguesa en móvil
3. Se abre la página completa

### Cambiar Idioma
1. Ir a sección "Idioma"
2. Click en 🇪🇸 Español o 🇺🇸 English
3. Cambio instantáneo en toda la app

### Cambiar Tema
1. Ir a sección "Apariencia"
2. Seleccionar Oscuro / Claro / Automático
3. Transición suave de 300ms

### Exportar Datos
1. Ir a sección "Datos"
2. Click en "Exportar todos los datos"
3. Se descarga archivo JSON

### Importar Datos
1. Ir a sección "Datos"
2. Click en "Importar datos"
3. Seleccionar archivo JSON
4. Recarga automática

## ✅ Estado del Proyecto

- ✅ Build exitoso (876KB JS, 56KB CSS)
- ✅ Sin errores de TypeScript
- ✅ Sistema multi-idioma completo
- ✅ Página de ajustes con 9 secciones
- ✅ Sistema de temas (oscuro/claro/auto)
- ✅ Persistencia en localStorage
- ✅ Diseño responsive
- ✅ Animaciones profesionales
- ✅ Documentación completa

## 🎉 Conclusión

La aplicación "Apiarios Carrión" ahora cuenta con:
- 🌐 Sistema multi-idioma completo (Español/Inglés)
- ⚙️ Página de ajustes profesional con 9 secciones
- 🎨 Sistema de temas (oscuro/claro/automático)
- 📏 Unidades de medida configurables
- 📍 Geolocalización integrada
- 🔔 Notificaciones configurables
- 💾 Exportar/Importar datos
- 📱 Diseño responsive optimizado
- ✨ Animaciones suaves con Framer Motion

**Happy Beekeeping! 🐝**
