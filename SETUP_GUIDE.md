# 🐝 Configuración Completa - PANAL con Supabase

## ✅ Sistema 100% Funcional con Datos Reales

La aplicación PANAL ahora está completamente integrada con Supabase para persistencia real de datos. Cada usuario tendrá sus propios datos aislados y seguros.

---

## 📋 Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Inicia sesión o crea una cuenta
4. Haz clic en "New Project"
5. Completa el formulario:
   - **Name**: Apiarios Carrión
   - **Database Password**: (guarda esta contraseña)
   - **Region**: Selecciona la más cercana
   - **Pricing Plan**: Free (suficiente para empezar)
6. Haz clic en "Create new project"
7. Espera 2-3 minutos mientras se provisiona

---

## 📋 Paso 2: Ejecutar el Schema SQL

1. En el dashboard de Supabase, ve a **SQL Editor** (ícono de base de datos en el menú lateral)
2. Haz clic en "New Query"
3. Copia todo el contenido del archivo `supabase-schema.sql`
4. Pégalo en el editor SQL
5. Haz clic en "Run" (botón verde)
6. Verifica que todas las tablas se crearon correctamente en **Table Editor**

**Tablas creadas:**
- ✅ `profiles` - Perfiles de usuarios
- ✅ `hives` - Colmenas
- ✅ `inspections` - Inspecciones
- ✅ `harvests` - Cosechas
- ✅ `tasks` - Tareas

---

## 📋 Paso 3: Obtener Credenciales

1. Ve a **Settings** (ícono de engranaje) → **API**
2. Copia estos valores:
   - **Project URL** (ejemplo: `https://abcdefghijk.supabase.co`)
   - **anon public key** (clave larga que empieza con `eyJ...`)

---

## 📋 Paso 4: Configurar Variables de Entorno

1. En la raíz del proyecto, crea un archivo `.env` (si no existe):

```bash
cp .env.example .env
```

2. Edita `.env` con tus credenciales:

```env
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANTE:** Reemplaza con tus valores reales de Supabase.

---

## 📋 Paso 5: Configurar Authentication

### Habilitar Email/Password (ya viene activado)

1. Ve a **Authentication** → **Providers**
2. Verifica que **Email** esté habilitado
3. En **Email Templates**, puedes personalizar los correos

### Configurar Google OAuth (Opcional)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en "Create Credentials" → "OAuth client ID"
5. Configura:
   - **Application type**: Web application
   - **Name**: PANAL Apiarios Carrión
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (desarrollo)
     - `https://tu-dominio.com` (producción)
   - **Authorized redirect URIs**:
     - `https://abcdefghijk.supabase.co/auth/v1/callback`
       (reemplaza con tu Project URL)
6. Copia el **Client ID** y **Client Secret**
7. En Supabase → **Authentication** → **Providers** → **Google**
8. Pega las credenciales y activa el provider

### Configurar GitHub OAuth (Opcional)

1. Ve a [GitHub Developer Settings](https://github.com/settings/developers)
2. Haz clic en "New OAuth App"
3. Configura:
   - **Application name**: PANAL Apiarios Carrión
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: 
     `https://abcdefghijk.supabase.co/auth/v1/callback`
4. Copia el **Client ID** y genera un **Client Secret**
5. En Supabase → **Authentication** → **Providers** → **GitHub**
6. Pega las credenciales y activa el provider

---

## 📋 Paso 6: Probar la Aplicación

1. Instala dependencias:
```bash
npm install
```

2. Ejecuta en modo desarrollo:
```bash
npm run dev
```

3. Abre http://localhost:5173

4. **Regístrate** con tu email o usa Google/GitHub

5. ¡Empieza a agregar colmenas!

---

## 🎯 Flujo Completo de la Aplicación

### 1. Registro/Login
- Usuario se registra con email/password o OAuth
- Se crea automáticamente un perfil en la tabla `profiles`
- Se establece sesión persistente

### 2. Dashboard
- Usuario ve SU colmenar (vacío si es nuevo)
- Puede agregar colmenas con código único
- Cada colmena tiene estado, reina, notas, etc.

### 3. Inspecciones
- Usuario registra inspecciones para cada colmena
- Datos: reina vista, patrón de cría, reservas, temperamento
- Varroa: conteo y nivel (bajo/medio/alto/crítico)
- Notas y fotos opcionales

### 4. Cosechas
- Usuario registra cosechas por colmena
- Datos: miel (kg), polen (kg), propóleo (g), cera (g)
- Calidad: premium/estándar/baja

### 5. Tareas
- Usuario crea tareas pendientes
- Puede asignar a colmena específica
- Prioridades: baja/media/alta/urgente
- Marcar como completadas

### 6. Persistencia
- Todos los datos se guardan en Supabase
- Al cerrar sesión y volver, los datos persisten
- Cada usuario solo ve SUS datos (RLS)

---

## 🔒 Seguridad Implementada

### Row Level Security (RLS)
- ✅ Cada usuario solo puede ver SUS propios datos
- ✅ Políticas aplicadas a todas las tablas
- ✅ Inserciones verifican `user_id = auth.uid()`
- ✅ Actualizaciones y eliminaciones protegidas

### Autenticación
- ✅ JWT tokens en cada request
- ✅ Sesiones persistentes con localStorage
- ✅ OAuth providers seguros (Google, GitHub)
- ✅ Email verification (configurable)

---

## 📊 Estructura de Datos

### Tabla `profiles`
```sql
- id (UUID, primary key, references auth.users)
- email (TEXT, unique)
- full_name (TEXT)
- apiary_name (TEXT, default: 'Mi Apiario')
- location (TEXT)
- created_at (TIMESTAMP)
```

### Tabla `hives`
```sql
- id (UUID, primary key)
- user_id (UUID, references auth.users)
- code (TEXT, ej: 'C-01')
- name (TEXT, opcional)
- status (TEXT: 'saludable' | 'revision' | 'alerta' | 'sin_reina')
- queen_year (INTEGER, ej: 2024)
- queen_marked_color (TEXT, ej: 'roja')
- location (TEXT)
- notes (TEXT)
- last_inspection_date (DATE)
- created_at (TIMESTAMP)
```

### Tabla `inspections`
```sql
- id (UUID, primary key)
- hive_id (UUID, references hives)
- user_id (UUID, references auth.users)
- inspection_date (DATE)
- queen_present (BOOLEAN)
- queen_seen (BOOLEAN)
- brood_pattern (TEXT: 'excelente' | 'bueno' | 'regular' | 'malo')
- food_stores (TEXT: 'alto' | 'medio' | 'bajo')
- temperament (TEXT: 'tranquila' | 'normal' | 'nerviosa' | 'agresiva')
- varroa_count (INTEGER)
- varroa_level (TEXT: 'bajo' | 'medio' | 'alto' | 'critico')
- diseases (TEXT)
- treatments (TEXT)
- notes (TEXT)
- photos (TEXT[])
- created_at (TIMESTAMP)
```

### Tabla `harvests`
```sql
- id (UUID, primary key)
- hive_id (UUID, references hives)
- user_id (UUID, references auth.users)
- harvest_date (DATE)
- honey_kg (DECIMAL)
- pollen_kg (DECIMAL)
- propolis_g (DECIMAL)
- wax_g (DECIMAL)
- quality (TEXT: 'premium' | 'estandar' | 'baja')
- notes (TEXT)
- created_at (TIMESTAMP)
```

### Tabla `tasks`
```sql
- id (UUID, primary key)
- user_id (UUID, references auth.users)
- hive_id (UUID, references hives, nullable)
- title (TEXT)
- description (TEXT)
- due_date (DATE)
- priority (TEXT: 'baja' | 'media' | 'alta' | 'urgente')
- completed (BOOLEAN)
- completed_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

---

## 🚀 Despliegue en Producción

### Vercel (Recomendado)

1. Sube tu código a GitHub
2. Ve a [https://vercel.com](https://vercel.com)
3. Importa tu repositorio
4. Agrega variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Despliega

### Netlify

1. Sube tu código a GitHub
2. Ve a [https://netlify.com](https://netlify.com)
3. Importa tu repositorio
4. Configura:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Agrega variables de entorno
6. Despliega

### Actualizar URLs de OAuth

En producción, actualiza las URLs de callback en:
- Google Cloud Console
- GitHub Developer Settings
- Supabase → Authentication → URL Configuration

---

## 🐛 Troubleshooting

### "Invalid API key"
- Verifica que copiaste correctamente `VITE_SUPABASE_ANON_KEY`
- Asegúrate de que no haya espacios al inicio o final

### "relation does not exist"
- Ejecuta el SQL en Supabase SQL Editor
- Verifica que todas las tablas se crearon

### "new row violates row-level security policy"
- Verifica que el `user_id` coincide con `auth.uid()`
- Revisa las políticas RLS en Supabase

### Los datos no persisten
- Verifica que las variables de entorno están configuradas
- Revisa la consola del navegador para errores
- Asegúrate de que el usuario está autenticado

### OAuth no funciona
- Verifica las URLs de callback en Google/GitHub
- Asegúrate de que los providers estén activados en Supabase
- Revisa la consola para errores CORS

---

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Authentication](https://supabase.com/docs/guides/auth)
- [React Context API](https://react.dev/reference/react/createContext)

---

## ✅ Checklist Final

- [ ] Proyecto creado en Supabase
- [ ] SQL ejecutado correctamente
- [ ] Variables de entorno configuradas en `.env`
- [ ] Authentication providers configurados (opcional)
- [ ] Aplicación probada localmente
- [ ] Registro/login funciona
- [ ] Datos se guardan en Supabase
- [ ] RLS funcionando (cada usuario ve solo sus datos)
- [ ] Desplegado en producción (opcional)

---

## 🎉 ¡Listo!

Tu aplicación PANAL ahora es 100% funcional con datos reales persistentes en Supabase. Cada usuario tiene su propio colmenar aislado y seguro.

**Happy Beekeeping! 🐝**
