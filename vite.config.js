import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Debe coincidir con AI_MODEL en src/services/aiAssistant.ts.
const GEMINI_MODEL = "gemini-3.5-flash";

// Headers de seguridad (dev/preview). Para producción, aplicarlos también
// en el hosting estático/CDN (Netlify _headers, Vercel, Nginx, etc.).
function securityHeaders() {
  return {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "X-XSS-Protection": "1; mode=block",
  };
}

export default defineConfig(({ mode }) => {
  // El tercer argumento "" carga TODAS las variables (también las que no
  // empiezan por VITE_), para poder leer GEMINI_API_KEY solo en el servidor.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        injectRegister: false,
        includeAssets: ["icon-192x192.png", "icon-512x512.png", "apple-touch-icon.png"],
        manifest: false,
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          globIgnores: ["**/sw.js", "**/workbox-*.js", "**/*.map"],
          // El bundle principal supera los 2 MiB con el SDK de Firestore
          // (gestión de admins en el panel de la tienda).
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
      }),
    ],
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      // Al exponer el puerto con un túnel (Serveo, ngrok, cloudflared…) el
      // servidor recibe peticiones con un Host que no es localhost y Vite las
      // bloquea con "Blocked request. This host (...) is not allowed". `true`
      // desactiva esa comprobación. Ojo: `allowedHosts` es un array de hostnames
      // o el booleano `true`; el string "all" es de Vite 7 y en Vite 6 se ignora
      // en silencio. Con `host: "0.0.0.0"` y un túnel público el servidor queda
      // accesible desde internet, así que conviene apagar el túnel al terminar.
      allowedHosts: true,
      hmr: {
        port: 3000,
      },
      headers: securityHeaders(),
      // El navegador llama a /api/gemini y este proxy añade la clave
      // GEMINI_API_KEY (leída de .env) antes de reenviar a Gemini. Así la clave
      // nunca se incrusta en el bundle del cliente. En producción cumple esta
      // misma función la función de Firebase (rewrite de Hosting).
      proxy: {
        "/api/gemini": {
          target: "https://generativelanguage.googleapis.com",
          changeOrigin: true,
          secure: true,
          rewrite: () =>
            `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY || ""}`,
        },
      },
    },
    preview: {
      headers: securityHeaders(),
    },
  };
});
