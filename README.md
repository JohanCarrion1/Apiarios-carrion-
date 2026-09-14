# 🐝 PANAL - Apiarios Carrión

Sistema completo de gestión apícola con autenticación Firebase y separación de datos por usuario.

## 🚀 Características

- ✅ **Autenticación Firebase**: Google, Facebook, GitHub, Email/Password
- ✅ **Datos separados por usuario**: Cada usuario tiene su propio historial
- ✅ **Gestión de colmenas**: Mapa hexagonal interactivo
- ✅ **Registro de inspecciones**: Cuaderno de campo completo
- ✅ **Control de cosechas**: Registro de producción de miel
- ✅ **Gestión de tareas**: Sistema de tareas pendientes
- ✅ **Calendario de eventos**: Planificación de actividades
- ✅ **Estadísticas**: Gráficos y métricas en tiempo real
- ✅ **Diseño responsive**: Optimizado para móvil y desktop
- ✅ **Persistencia local**: Datos guardados en localStorage

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase (gratuita)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd panal
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Firebase

#### 3.1 Crear proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Sigue los pasos para crear el proyecto

#### 3.2 Habilitar Authentication

1. En el panel de Firebase, ve a "Authentication"
2. Haz clic en "Comenzar"
3. Ve a la pestaña "Sign-in method"
4. Habilita los proveedores que quieras usar:
   - **Email/Password**: Activar directamente
   - **Google**: Activar y configurar
   - **Facebook**: Requiere configuración adicional (ver abajo)
   - **GitHub**: Activar y configurar

#### 3.3 Configurar Facebook (opcional)

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una app o selecciona una existente
3. Agrega el producto "Facebook Login"
4. En "Configuración" > "Básico", copia el "App ID" y "App Secret"
5. En "Facebook Login" > "Configuración", agrega esta URL de redireccionamiento:
   ```
   https://tu-proyecto.firebaseapp.com/__/auth/handler
   ```
6. En Firebase Authentication > Facebook, pega el App ID y App Secret

#### 3.4 Obtener credenciales de Firebase

1. Ve a "Configuración del proyecto" (ícono de engranaje)
2. En "Tus aplicaciones", haz clic en "Agregar aplicación" y selecciona "Web"
3. Registra la app con un nombre (ej: "Apiarios Carrión Web")
4. Copia el objeto `firebaseConfig`

### 4. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu-api-key-aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-project-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 6. Compilar para producción

```bash
npm run build
```

Los archivos compilados estarán en la carpeta `dist/`

## 🔐 Sistema de Autenticación

### Registro de usuario

1. Abre la aplicación
2. Haz clic en "Crear cuenta nueva"
3. Ingresa email y contraseña (mínimo 6 caracteres)
4. Haz clic en "Crear Cuenta"

### Inicio de sesión

Puedes iniciar sesión de 4 formas:

1. **Email/Password**: Ingresa email y contraseña
2. **Google**: Haz clic en "Continuar con Google"
3. **Facebook**: Haz clic en "Continuar con Facebook"
4. **GitHub**: Haz clic en "Continuar con GitHub"

### Separación de datos

Cada usuario tiene sus propios datos completamente separados:

- `hives_USERID` → Colmenas del usuario
- `inspections_USERID` → Inspecciones del usuario
- `harvests_USERID` → Cosechas del usuario
- `tasks_USERID` → Tareas del usuario
- `events_USERID` → Eventos del usuario

Cuando cierras sesión, tus datos quedan guardados pero no visibles. Al iniciar sesión con otra cuenta, se cargan los datos de esa cuenta.

## 📱 Uso de la Aplicación

### Panel Principal

- Vista general del colmenar
- Estadísticas rápidas
- Acceso rápido a todas las secciones

### Colmenas

- Mapa hexagonal interactivo
- Agregar, editar y eliminar colmenas
- Ver detalles de cada colmena
- Filtrar por estado (saludable, revisión, alerta, sin reina)
- Sistema de búsqueda
- Indicadores visuales de salud

### Cuaderno de Campo

- Registro detallado de inspecciones
- Formulario completo con validaciones
- Historial de inspecciones
- Búsqueda y filtros avanzados
- Estadísticas en tiempo real
- Alertas automáticas
- Plantillas de inspección
- Exportar a CSV

### Cosecha

- Registro de producción de miel
- Tipos de miel (milflores, azahar, romero, etc.)
- Precio estimado de venta
- Meta de producción anual
- Ranking de colmenas más productivas
- Predicción de cosecha
- Alertas de producción
- Exportar reportes

### Tareas

- Gestión de tareas pendientes
- Prioridades (alta, media, baja)
- Fechas de vencimiento
- Marcar como completadas
- Filtros y ordenamiento

### Calendario

- Calendario mensual interactivo
- Crear eventos (inspecciones, tratamientos, cosechas)
- Eventos recurrentes
- Recordatorios automáticos
- Exportar calendario (ICS/CSV)
- Atajos de teclado

### Estadísticas

- Gráficos de producción
- Comparativas anuales
- Distribución de estados
- Evolución de varroa
- Métricas en tiempo real

## 🎨 Personalización

### Cambiar colores

Edita `src/index.css` para modificar la paleta de colores:

```css
:root {
  --color-honey: #f0a41c;
  --color-ink: #1a1a1a;
  --color-cream: #f5f5f5;
  /* ... más colores */
}
```

### Cambiar nombre del apiario

Edita `src/data.ts`:

```typescript
export const APIARY = {
  name: "Tu Nombre de Apiario",
  location: "Tu Ubicación",
  // ...
};
```

## 🐛 Solución de Problemas

### Error: "Invalid API key"

- Verifica que copiaste correctamente las credenciales de Firebase
- Asegúrate de que el archivo `.env` está en la raíz del proyecto
- Reinicia el servidor de desarrollo

### Error: "auth/network-request-failed"

- Verifica tu conexión a internet
- Verifica que las credenciales de Firebase son correctas
- Verifica que habilitaste Authentication en Firebase

### Los datos no se guardan

- Verifica que el usuario está autenticado
- Verifica que localStorage está habilitado en el navegador
- Revisa la consola del navegador para errores

### Error de CORS con Facebook

- Verifica que agregaste la URL de redireccionamiento correcta en Facebook Developers
- La URL debe ser: `https://tu-proyecto.firebaseapp.com/__/auth/handler`

## 📚 Estructura del Proyecto

```
panal/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Login.tsx        # Página de login
│   │   ├── Dashboard.tsx    # Panel principal
│   │   ├── HivesSection.tsx # Gestión de colmenas
│   │   ├── NotebookSection.tsx # Cuaderno de campo
│   │   ├── Production.tsx   # Gestión de cosechas
│   │   ├── TasksSection.tsx # Gestión de tareas
│   │   ├── CalendarSection.tsx # Calendario
│   │   ├── StatsSection.tsx # Estadísticas
│   │   └── ...
│   ├── context/             # Contextos de React
│   │   ├── AuthContext.tsx  # Autenticación
│   │   ├── LanguageContext.tsx # Idioma
│   │   └── SettingsContext.tsx # Configuración
│   ├── lib/                 # Librerías y configuración
│   │   └── firebase.ts      # Configuración de Firebase
│   ├── utils/               # Utilidades
│   │   └── storage.ts       # Funciones de localStorage
│   ├── types/               # Tipos TypeScript
│   │   └── hive.ts          # Tipos de datos
│   ├── App.tsx              # Componente principal
│   └── main.tsx             # Punto de entrada
├── .env.example             # Ejemplo de variables de entorno
├── package.json             # Dependencias
└── README.md                # Este archivo
```

## 🛠️ Tecnologías

- **React 18** - Framework de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **TailwindCSS** - Estilos
- **Firebase** - Autenticación
- **Framer Motion** - Animaciones
- **Recharts** - Gráficos
- **date-fns** - Manejo de fechas
- **React Router** - Navegación

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o soporte, abre un issue en el repositorio.

---

**Desarrollado con 🐝 para apicultores profesionales**
