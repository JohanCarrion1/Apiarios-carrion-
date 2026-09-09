# Sistema de Autenticación - PANAL

## 📋 Descripción General

Este proyecto implementa un sistema completo de autenticación para la aplicación PANAL (Control de Colmenas) con las siguientes características:

### ✅ Características Implementadas

1. **Autenticación Multi-Provider**
   - Google OAuth
   - GitHub OAuth
   - Email/Password tradicional
   - Modo demo para pruebas

2. **Gestión de Estado con Context API**
   - `AuthContext` centralizado
   - Hook `useAuth()` para acceder al estado
   - Persistencia de sesión con localStorage

3. **Protección de Rutas**
   - Componente `ProtectedRoute`
   - Redirección automática al login
   - Loading state durante verificación

4. **UI/UX Completo**
   - Página de login con diseño responsive
   - Animaciones suaves
   - Estados de carga
   - Manejo de errores
   - Toggle para mostrar/ocultar contraseña

## 🏗️ Arquitectura

### Estructura de Archivos

```
src/
├── context/
│   └── AuthContext.tsx          # Contexto de autenticación
├── components/
│   ├── Login.tsx                # Página de login
│   └── ProtectedRoute.tsx       # Wrapper de rutas protegidas
├── lib/
│   └── supabase.ts              # Cliente de Supabase
└── App.tsx                      # Componente principal con routing
```

### Flujo de Autenticación

```
1. Usuario abre la aplicación
   ↓
2. App.tsx envuelve todo con <AuthProvider>
   ↓
3. AuthContext verifica sesión existente (localStorage + Supabase)
   ↓
4. <ProtectedRoute> verifica si hay usuario autenticado
   ↓
5a. Si NO hay usuario → Muestra <Login />
5b. Si HAY usuario → Muestra <Dashboard />
   ↓
6. Usuario interactúa con la aplicación
   ↓
7. Usuario cierra sesión → signOut() limpia estado y localStorage
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

### Configuración de Supabase

1. **Crear proyecto en Supabase**
   - Ve a https://supabase.com
   - Crea un nuevo proyecto
   - Guarda las credenciales

2. **Configurar Authentication**
   - Ve a Authentication > Providers
   - Habilita los providers que necesites:
     - Email (habilitado por defecto)
     - Google OAuth
     - GitHub OAuth

3. **Configurar URLs de redirección**
   - En cada provider, agrega:
     - Site URL: `http://localhost:5173`
     - Redirect URLs: `http://localhost:5173/auth/callback`

### Configuración de OAuth Providers

#### Google OAuth

1. Ve a Google Cloud Console
2. Crea un proyecto o selecciona uno existente
3. Ve a "Credenciales" > "Crear credenciales" > "ID de cliente OAuth"
4. Configura:
   - Tipo: Aplicación web
   - Orígenes JavaScript autorizados: `http://localhost:5173`
   - URIs de redireccionamiento autorizados: `http://localhost:5173/auth/callback`
5. Copia el Client ID y Client Secret
6. En Supabase, ve a Authentication > Providers > Google
7. Pega las credenciales

#### GitHub OAuth

1. Ve a GitHub Settings > Developer settings > OAuth Apps
2. Crea una nueva OAuth App
3. Configura:
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/auth/callback`
4. Copia el Client ID y Client Secret
5. En Supabase, ve a Authentication > Providers > GitHub
6. Pega las credenciales

## 💻 Uso

### Modo Demo

Para probar la aplicación sin configurar Supabase:

```
Email: demo@apiarioscarrion.com
Password: demo123
```

### Hooks Disponibles

```typescript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const {
    user,              // Usuario actual o null
    loading,           // Estado de carga
    signInWithGoogle,  // Función para login con Google
    signInWithGithub,  // Función para login con GitHub
    signInWithEmail,   // Función para login con email/password
    signOut,           // Función para cerrar sesión
    error,             // Error actual o null
    clearError         // Función para limpiar errores
  } = useAuth();

  // Tu lógica aquí
}
```

### Ejemplo de Uso

```typescript
// Login con email
const handleLogin = async () => {
  try {
    await signInWithEmail('user@example.com', 'password123');
    // Redirigir al dashboard
  } catch (error) {
    // Manejar error
  }
};

// Login con Google
const handleGoogleLogin = async () => {
  try {
    await signInWithGoogle();
    // Supabase redirigirá automáticamente
  } catch (error) {
    // Manejar error
  }
};

// Cerrar sesión
const handleLogout = async () => {
  try {
    await signOut();
    // Redirigir al login
  } catch (error) {
    // Manejar error
  }
};
```

## 🔒 Seguridad

### Mejores Prácticas Implementadas

1. **Persistencia Segura**
   - Uso de localStorage para mantener sesión
   - Verificación de sesión con Supabase al cargar
   - Limpieza automática de datos al cerrar sesión

2. **Protección de Rutas**
   - Todas las rutas protegidas usan `ProtectedRoute`
   - Verificación de autenticación antes de renderizar
   - Redirección automática al login si no hay sesión

3. **Manejo de Errores**
   - Mensajes de error claros para el usuario
   - Logging de errores en consola para debugging
   - Limpieza automática de errores

### Recomendaciones Adicionales

1. **HTTPS en Producción**
   - Asegúrate de usar HTTPS en producción
   - Configura las URLs de redirección correctamente

2. **Rate Limiting**
   - Supabase incluye rate limiting por defecto
   - Considera implementar rate limiting adicional si es necesario

3. **Validación de Email**
   - Supabase puede enviar emails de verificación
   - Configura esto en Authentication > Settings

4. **Políticas de Contraseña**
   - Configura requisitos de contraseña en Supabase
   - Considera implementar 2FA para mayor seguridad

## 🧪 Testing

### Pruebas Manuales

1. **Login con Email**
   ```
   Email: demo@apiarioscarrion.com
   Password: demo123
   ```

2. **Persistencia de Sesión**
   - Inicia sesión
   - Recarga la página
   - Verifica que sigues autenticado

3. **Cerrar Sesión**
   - Haz clic en "Cerrar sesión"
   - Verifica que te redirige al login
   - Verifica que localStorage se limpia

4. **OAuth Providers**
   - Prueba login con Google
   - Prueba login con GitHub
   - Verifica que los datos del usuario se muestran correctamente

### Pruebas Automatizadas (Futuro)

```typescript
// Ejemplo de test con React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';

describe('Login', () => {
  it('debería mostrar el formulario de login', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
  });

  it('debería mostrar error con credenciales inválidas', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'invalid@email.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'wrongpassword' }
    });
    
    fireEvent.click(screen.getByText('Iniciar sesión'));
    
    expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument();
  });
});
```

## 🚀 Despliegue

### Vercel

1. Conecta tu repositorio a Vercel
2. Agrega las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Despliega

### Netlify

1. Conecta tu repositorio a Netlify
2. Agrega las variables de entorno en Site settings
3. Despliega

### Configuración de Producción

1. **Actualizar URLs de redirección**
   - En Supabase, actualiza las URLs de redirección a tu dominio de producción
   - Ejemplo: `https://tu-dominio.com/auth/callback`

2. **Configurar CORS**
   - Asegúrate de que Supabase permita requests desde tu dominio

3. **HTTPS**
   - Asegúrate de que tu dominio use HTTPS
   - OAuth providers requieren HTTPS en producción

## 📚 Recursos

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [React Context API](https://react.dev/reference/react/createContext)
- [OAuth 2.0](https://oauth.net/2/)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth](https://docs.github.com/en/developers/apps/building-oauth-apps)

## 🐛 Troubleshooting

### Error: "Invalid API key"
- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que el archivo `.env` esté en la raíz del proyecto
- Reinicia el servidor de desarrollo

### Error: "Redirect URL not allowed"
- Verifica que las URLs de redirección estén configuradas en Supabase
- Asegúrate de que coincidan exactamente con las de tu aplicación

### Error: "CORS policy"
- Verifica que tu dominio esté permitido en la configuración de Supabase
- En desarrollo, usa `http://localhost:5173`

### La sesión no persiste
- Verifica que localStorage esté habilitado en el navegador
- Revisa que no haya errores en la consola
- Asegúrate de que `AuthProvider` envuelva toda la aplicación

## 📝 Licencia

Este proyecto es parte de PANAL - Sistema de Control de Colmenas.

## 👥 Autores

- Equipo de Desarrollo PANAL

---

**Última actualización:** 2026-03-19
