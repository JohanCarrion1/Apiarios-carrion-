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

// ------------------------------------------------------------
// Proxy de Gemini con ROTACIÓN de claves (dev y preview)
// ------------------------------------------------------------
// Igual que la función de Firebase, la clave se queda en el servidor de
// desarrollo. `GEMINI_API_KEY` admite varias claves separadas por comas; si una
// devuelve cuota agotada (429/403 con "quota") o un 5xx, se reintenta con la
// siguiente. Debe coincidir con functions/index.js.
const parseGeminiKeys = (raw) =>
  String(raw || "")
    .split(/[\s,]+/)
    .map((k) => k.trim())
    .filter(Boolean);

const convieneRotar = (status, data) => {
  if (status === 429 || status >= 500) return true;
  if (status === 403) {
    const msg = JSON.stringify(data || {}).toLowerCase();
    return msg.includes("quota") || msg.includes("exhausted") || msg.includes("rate");
  }
  return false;
};

async function llamarGemini(keys, body) {
  let ultimo = { status: 502, data: { error: "Error de conexión con Gemini." } };
  for (const key of keys) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
          key
        )}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body }
      );
      const data = await r.json().catch(() => ({}));
      ultimo = { status: r.status, data };
      if (!convieneRotar(r.status, data)) return ultimo;
    } catch {
      ultimo = { status: 502, data: { error: "Error de conexión con Gemini." } };
    }
  }
  return ultimo;
}

function installGeminiMiddleware(middlewares, keys) {
  middlewares.use("/api/gemini", async (req, res) => {
    const json = (status, data) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(typeof data === "string" ? data : JSON.stringify(data));
    };
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });
    if (keys.length === 0) return json(500, { error: "Falta GEMINI_API_KEY." });
    const chunks = [];
    try {
      for await (const chunk of req) chunks.push(chunk);
    } catch {
      return json(400, { error: "No se pudo leer la petición." });
    }
    const { status, data } = await llamarGemini(keys, Buffer.concat(chunks));
    json(status, data);
  });
}

function geminiProxyPlugin(keys) {
  return {
    name: "gemini-key-rotation",
    configureServer(server) {
      installGeminiMiddleware(server.middlewares, keys);
    },
    configurePreviewServer(server) {
      installGeminiMiddleware(server.middlewares, keys);
    },
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
      // El navegador llama a /api/gemini y este middleware añade la clave
      // GEMINI_API_KEY (leída de .env), rotando entre varias si la primera está
      // agotada. Así la clave nunca se incrusta en el bundle del cliente. En
      // producción cumple esta misma función la función de Firebase (rewrite de
      // Hosting).
      geminiProxyPlugin(parseGeminiKeys(env.GEMINI_API_KEY)),
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
    },
    preview: {
      headers: securityHeaders(),
    },
  };
});
