# Guía de Despliegue - PANAL Apiarios Carrión

## 🚀 Opciones de Despliegue

### 1. Vercel (Recomendado)

**Ventajas:**
- Despliegue automático desde GitHub
- CDN global
- Variables de entorno fáciles de configurar
- Preview deployments para cada PR

**Pasos:**

1. Sube tu código a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/panal.git
git push -u origin main
```

2. Ve a [https://vercel.com](https://vercel.com)
3. Haz clic en "Import Project"
4. Selecciona tu repositorio de GitHub
5. Vercel detectará automáticamente que es un proyecto Vite
6. Configura las variables de entorno:
   - Haz clic en "Environment Variables"
   - Agrega:
     - `VITE_SUPABASE_URL` = tu URL de Supabase
     - `VITE_SUPABASE_ANON_KEY` = tu anon key
7. Haz clic en "Deploy"
8. ¡Listo! Tu aplicación estará en `https://panal-tu-usuario.vercel.app`

**Configuración adicional (opcional):**
```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 2. Netlify

**Ventajas:**
- Despliegue continuo
- Formularios y funciones serverless
- Split testing

**Pasos:**

1. Sube tu código a GitHub (igual que Vercel)

2. Ve a [https://netlify.com](https://netlify.com)
3. Haz clic en "Add new site" → "Import an existing project"
4. Selecciona GitHub y autoriza Netlify
5. Selecciona tu repositorio
6. Configura:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
7. Agrega variables de entorno:
   - Ve a "Site settings" → "Environment variables"
   - Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
8. Haz clic en "Deploy site"

**Configuración adicional:**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. Railway

**Ventajas:**
- Fácil configuración
- Base de datos integrada (si la necesitas)
- Escalado automático

**Pasos:**

1. Ve a [https://railway.app](https://railway.app)
2. Crea un nuevo proyecto
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu repositorio
5. Configura las variables de entorno en "Variables"
6. Railway detectará automáticamente que es un proyecto Node.js
7. Configura el puerto:
   - Agrega variable `PORT` = `3000`
8. Despliega

### 4. Render

**Ventajas:**
- Gratis para proyectos estáticos
- SSL automático
- CDN global

**Pasos:**

1. Ve a [https://render.com](https://render.com)
2. Haz clic en "New Static Site"
3. Conecta tu repositorio de GitHub
4. Configura:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. Agrega variables de entorno
6. Haz clic en "Create Static Site"

### 5. GitHub Pages

**Ventajas:**
- Gratis para repositorios públicos
- Integración nativa con GitHub

**Pasos:**

1. Instala la dependencia necesaria:
```bash
npm install -D gh-pages
```

2. Agrega scripts en `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Configura `vite.config.js`:
```javascript
export default defineConfig({
  base: '/panal/', // nombre de tu repositorio
  // ... resto de configuración
})
```

4. Despliega:
```bash
npm run deploy
```

5. Tu sitio estará en `https://tu-usuario.github.io/panal/`

## 🔒 Configuración de Supabase para Producción

### 1. Actualizar URLs de Callback

En tu proyecto de Supabase:

**Google OAuth:**
- Ve a Google Cloud Console
- Edita tu OAuth 2.0 Client
- Agrega la URL de tu dominio en producción:
  - `https://tu-dominio.com/auth/v1/callback`

**GitHub OAuth:**
- Ve a GitHub Developer Settings
- Edita tu OAuth App
- Actualiza:
  - **Homepage URL**: `https://tu-dominio.com`
  - **Authorization callback URL**: `https://tu-dominio.com/auth/v1/callback`

### 2. Configurar Dominio Personalizado en Supabase

1. Ve a **Authentication > URL Configuration**
2. Actualiza **Site URL** a tu dominio:
   - `https://tu-dominio.com`
3. Agrega **Redirect URLs**:
   - `https://tu-dominio.com/**`

### 3. Habilitar HTTPS

Todas las plataformas mencionadas ofrecen HTTPS automático.

## 📊 Monitoreo y Analytics

### Vercel Analytics
```bash
npm install @vercel/analytics
```

```javascript
// main.tsx
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Analytics />
  </>
);
```

### Plausible Analytics (Privacidad-first)
```html
<!-- index.html -->
<script defer data-domain="tu-dominio.com" src="https://plausible.io/js/script.js"></script>
```

## 🔄 CI/CD con GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run typecheck
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
```

## 🎯 Checklist Pre-Despliegue

- [ ] Probar todas las funcionalidades en desarrollo
- [ ] Configurar variables de entorno en producción
- [ ] Actualizar URLs de callback en OAuth providers
- [ ] Habilitar RLS en Supabase
- [ ] Configurar dominio personalizado (opcional)
- [ ] Probar autenticación en producción
- [ ] Verificar que los datos se guardan correctamente
- [ ] Configurar backups de Supabase
- [ ] Monitoreo y analytics configurado
- [ ] SSL/HTTPS habilitado

## 💰 Costos Estimados

### Supabase (Free Tier)
- 500 MB base de datos
- 1 GB almacenamiento
- 2 GB transferencia
- 50,000 usuarios activos mensuales
- **Gratis** para empezar

### Vercel (Free Tier)
- 100 GB bandwidth
- 100 GB-hours serverless function execution
- **Gratis** para proyectos personales

### Netlify (Free Tier)
- 100 GB bandwidth
- 300 build minutes/month
- **Gratis** para proyectos personales

**Total: $0/mes** para empezar (suficiente para desarrollo y producción pequeña)

## 🚨 Troubleshooting

### "Build failed" en producción
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs de build en tu plataforma
- Asegúrate de que `npm run build` funciona localmente

### "Authentication not working"
- Verifica las URLs de callback en OAuth providers
- Asegúrate de que los providers estén activados en Supabase
- Revisa la consola del navegador para errores CORS

### "White screen after deploy"
- Verifica que el build se completó correctamente
- Revisa la consola del navegador para errores JavaScript
- Asegúrate de que las variables de entorno están disponibles en build time

## 📞 Soporte

- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **Netlify**: [answers.netlify.com](https://answers.netlify.com)
- **Supabase**: [supabase.com/support](https://supabase.com/support)

---

**¡Tu aplicación está lista para el mundo! 🐝**
