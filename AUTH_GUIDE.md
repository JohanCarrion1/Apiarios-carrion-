# Guía de Autenticación - Apiarios Carrión

## 🎯 Resumen del Sistema de Autenticación

El sistema de autenticación de PANAL ofrece **3 métodos de login**:

1. **Google OAuth** - Inicio de sesión con cuenta de Google
2. **GitHub OAuth** - Autenticación con cuenta de GitHub  
3. **Email/Password** - Método tradicional con validación

## 🚀 Prueba Rápida (Modo Demo)

Sin necesidad de configurar Supabase, puedes probar la aplicación:

```bash
npm run dev
```

Abre http://localhost:5173 y usa:
- **Email**: `demo@apiarioscarrion.com`
- **Password**: `demo123`

## 🔧 Configuración Completa de Supabase

### Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Crea una cuenta o inicia sesión
4. Haz clic en "New Project"
5. Completa el formulario:
   - **Name**: Apiarios Carrión
   - **Database Password**: (guarda esta contraseña)
   - **Region**: Selecciona la más cercana
   - **Pricing Plan**: Free (suficiente para desarrollo)
6. Haz clic en "Create new project"
7. Espera 2-3 minutos mientras se provisiona

### Paso 2: Obtener Credenciales

1. En el dashboard de tu proyecto, ve a **Settings** (ícono de engranaje)
2. Haz clic en **API**
3. Copia estos valores:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

4. Edita tu archivo `.env`:
```env
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 3: Configurar Google OAuth

#### En Google Cloud Console:

1. Ve a [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services > Credentials**
4. Haz clic en "+ CREATE CREDENTIALS" → "OAuth client ID"
5. Si es la primera vez, configura la pantalla de consentimiento:
   - **User Type**: External
   - Completa los campos requeridos
   - Agrega tu email como "Test user"
6. Crea las credenciales:
   - **Application type**: Web application
   - **Name**: PANAL Apiarios Carrión
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (desarrollo)
     - `https://tu-dominio.com` (producción)
   - **Authorized redirect URIs**:
     - `https://abcdefghijk.supabase.co/auth/v1/callback`
       (reemplaza con tu Project URL)
7. Haz clic en "Create"
8. Copia el **Client ID** y **Client Secret**

#### En Supabase:

1. Ve a **Authentication > Providers**
2. Haz clic en **Google**
3. Activa el toggle "Enable"
4. Pega el **Client ID** de Google
5. Pega el **Client Secret** de Google
6. Haz clic en "Save"

### Paso 4: Configurar GitHub OAuth

#### En GitHub:

1. Ve a [https://github.com/settings/developers](https://github.com/settings/developers)
2. Haz clic en "New OAuth App"
3. Completa el formulario:
   - **Application name**: PANAL Apiarios Carrión
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: 
     `https://abcdefghijk.supabase.co/auth/v1/callback`
     (reemplaza con tu Project URL)
4. Haz clic en "Register application"
5. Copia el **Client ID**
6. Haz clic en "Generate a new client secret"
7. Copia el **Client Secret**

#### En Supabase:

1. Ve a **Authentication > Providers**
2. Haz clic en **GitHub**
3. Activa el toggle "Enable"
4. Pega el **Client ID** de GitHub
5. Pega el **Client Secret** de GitHub
6. Haz clic en "Save"

### Paso 5: Probar la Autenticación

1. Reinicia el servidor de desarrollo:
```bash
npm run dev
```

2. Abre http://localhost:5173

3. Prueba cada método:
   - Haz clic en "Continuar con Google"
   - Haz clic en "Continuar con GitHub"
   - Usa email/password (primero crea un usuario en Supabase)

## 👤 Crear Usuarios Manualmente

### Desde el Dashboard de Supabase:

1. Ve a **Authentication > Users**
2. Haz clic en "Add user" → "Create new user"
3. Completa:
   - **Email**: usuario@apiarioscarrion.com
   - **Password**: (mínimo 6 caracteres)
   - **Auto Confirm User**: ✅ (marca esta opción)
4. Haz clic en "Create user"

### Desde la Aplicación:

1. En la página de login, haz clic en "Crear cuenta nueva"
2. (Nota: Necesitas implementar el formulario de registro)

## 🔒 Seguridad

### Row Level Security (RLS)

Si agregas tablas a Supabase, **siempre** activa RLS:

```sql
-- Ejemplo: Tabla de inspecciones
CREATE TABLE inspections (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  hive_id text NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT NOW(),
  data jsonb NOT NULL
);

-- Habilitar RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven sus propias inspecciones
CREATE POLICY "Users can view own inspections"
  ON inspections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inspections"
  ON inspections FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Variables de Entorno en Producción

**NUNCA commitees el archivo `.env`**

En producción, configura las variables en tu plataforma:
- **Vercel**: Settings > Environment Variables
- **Netlify**: Site settings > Environment variables
- **Railway**: Variables tab

## 🐛 Solución de Problemas

### "Invalid API key"
- Verifica que copiaste correctamente `VITE_SUPABASE_ANON_KEY`
- Asegúrate de que no haya espacios al inicio o final

### "User not found"
- El usuario no existe en Supabase
- Crea el usuario manualmente en Authentication > Users

### "Invalid login credentials"
- Email o password incorrectos
- Verifica que el usuario esté confirmado

### OAuth no funciona
- Verifica las URLs de callback en Google/GitHub
- Asegúrate de que los providers estén activados en Supabase
- Revisa la consola del navegador para errores

### "CORS error"
- Agrega `http://localhost:5173` a las URLs autorizadas en Google/GitHub

## 📊 Monitoreo de Usuarios

En Supabase puedes ver:
- **Authentication > Users**: Lista de usuarios registrados
- **Authentication > Logs**: Eventos de autenticación
- **Authentication > Providers**: Estado de cada provider

## 🎓 Recursos Adicionales

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [GitHub OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**¿Necesitas ayuda?** Abre un issue en el repositorio del proyecto.
