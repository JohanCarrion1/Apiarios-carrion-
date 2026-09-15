Convertir la aplicación en PWA (Progressive Web App) instalable con modo offline

**Requisitos:**

1. **manifest.json en public/:**
- Crear `public/manifest.json` con:
  - name: "Apiarios Carrión - Control de Colmenas"
  - short_name: "Apiarios Carrión"
  - description: "Gestión profesional de apiarios, colmenas y producción de miel"
  - start_url: "/dashboard"
  - display: "standalone" (que parezca app nativa, sin barra de navegador)
  - background_color: "#1a1410" (color de fondo oscuro)
  - theme_color: "#f59e0b" (ámbar de la marca)
  - orientation: "portrait" (preferentemente vertical)
  - icons: array de íconos en diferentes tamaños (192x192, 512x512)

2. **Íconos de la app:**
- Crear `public/icon-192x192.png` (ícono para Android)
- Crear `public/icon-512x512.png` (ícono grande)
- Crear `public/apple-touch-icon.png` (180x180 para iOS)
- Usar el logo de la abeja/colmena actual (estilo ámbar sobre fondo oscuro)
- Si no hay ícono, crear uno simple con emoji 🐝 + fondo ámbar/oscuro

3. **Meta tags en index.html:**
- Agregar en `<head>`:
  - `<link rel="manifest" href="/manifest.json">`
  - `<meta name="theme-color" content="#f59e0b">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<meta name="apple-mobile-web-app-title" content="Apiarios Carrión">`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
  - Favicon: `<link rel="icon" type="image/png" href="/icon-192x192.png">`

4. **Service Worker con Vite PWA Plugin:**
- Instalar: `npm install vite-plugin-pwa`
- Configurar en `vite.config.ts`:
```typescript
  import { VitePWA } from 'vite-plugin-pwa'
  
  export default defineConfig({
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'weather-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 1800 // 30 minutos
                }
              }
            }
          ]
        },
        manifest: {
          // ... configuración del manifest
        }
      })
    ]
  })
```

5. **Estrategia de cache:**
- Cache-First para assets estáticos (JS, CSS, íconos, fuentes)
- Network-First para datos de API (clima) con fallback a cache
- Stale-While-Revalidate para datos locales (localStorage se maneja solo)

6. **Offline fallback:**
- Crear `public/offline.html` página simple:
  - Logo de la app
  - Mensaje: "Estás sin conexión"
  - "Tus datos están guardados localmente"
  - Botón "Reintentar" que recargue la página
- Configurar en service worker: si no hay red, mostrar offline.html

7. **Prompt de instalación:**
- Detectar evento `beforeinstallprompt` en React
- Crear componente `InstallPrompt.tsx`:
  - Aparece como banner en la parte inferior (tipo toast)
  - Mensaje: "Instala Apiarios Carrión para usar sin internet"
  - Botón "Instalar" y "Ahora no"
  - Solo mostrar si el usuario no ha instalado/descartado antes
  - Guardar decisión en localStorage (`pwa_install_prompt: dismissed`)

8. **Detectar modo standalone:**
- CSS: `@media (display-mode: standalone)` para ajustar estilos cuando está instalada
- Ocultar el botón "Regresar a inicio" si está en modo standalone (ya es app)
- Ajustar safe areas para iOS (env(safe-area-inset-top))

9. **Actualizaciones:**
- Detectar cuando hay nueva versión del service worker
- Mostrar toast: "Nueva versión disponible - Recargar" con botón
- Auto-actualizar en background (registerType: 'autoUpdate')

10. **Testing:**
- Chrome DevTools → Application → Service Workers (verificar activo)
- Application → Manifest (verificar sin errores)
- Lighthouse audit: score PWA > 90
- Probar instalación en Chrome desktop y Android
- Probar modo offline (desactivar red → debe funcionar)

**Criterios de verificación:**
- Chrome muestra ícono de instalación en barra de dirección (desktop)
- En Android: "Agregar a pantalla de inicio" disponible
- Al instalar: se abre sin barra de navegador (standalone)
- Sin internet: la app carga y muestra datos cacheados
- Service worker registrado y activo (verificar en DevTools)
- Lighthouse PWA score > 90
- Íconos se ven bien en Android e iOS

**No tocar:**
- Funcionalidad existente de la app
- Datos de localStorage (deben persistir después de instalar)
- Diseño visual (solo agregar ajustes para modo standalone)

TECNOLOGÍAS: React, TypeScript, Vite, vite-plugin-pwa, Service Workers, Web App Manifest
