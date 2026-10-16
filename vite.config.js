import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const GEMINI_MODEL = "gemini-3.5-flash";
const MAPBOX_STYLE = "mapbox/satellite-v9";

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

function installGeocodeMiddleware(middlewares, token) {
  middlewares.use("/api/geocode", async (req, res) => {
    const json = (status, data) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(typeof data === "string" ? data : JSON.stringify(data));
    };

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "GET") return json(405, { error: "Method not allowed" });

    const url = new URL(req.url || "", "http://localhost");
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json(400, { error: "Faltan lat y lng numéricos válidos." });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return json(400, { error: "Coordenadas fuera de rango." });
    }
    if (!token) {
      return json(500, {
        error: "Geocodificación no configurada (falta MAPBOX_ACCESS_TOKEN).",
      });
    }

    try {
      const mapboxUrl =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${encodeURIComponent(lng)},${encodeURIComponent(lat)}.json` +
        `?access_token=${encodeURIComponent(token)}` +
        `&language=es&limit=1&types=address,place,locality,neighborhood,region,country`;

      const r = await fetch(mapboxUrl, { headers: { Accept: "application/json" } });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        return json(r.status >= 400 && r.status < 600 ? r.status : 502, {
          error: data?.message || data?.error || `Mapbox respondió ${r.status}`,
        });
      }

      const feature = Array.isArray(data.features) ? data.features[0] : null;
      const address = feature?.place_name || feature?.text || null;
      if (!address) {
        return json(404, {
          error: "No se encontró dirección para esas coordenadas.",
        });
      }

      return json(200, {
        address,
        lat,
        lng,
        place_name: feature?.place_name,
        place_type: feature?.place_type,
      });
    } catch {
      return json(502, { error: "Error de conexión con Mapbox." });
    }
  });
}

function installMapTilesMiddleware(middlewares, token) {
  middlewares.use("/api/map-tiles", async (req, res) => {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const url = new URL(req.url || "", "http://localhost");
    const z = Number(url.searchParams.get("z"));
    const x = Number(url.searchParams.get("x"));
    const y = Number(String(url.searchParams.get("y") || "").replace(/\.png$/i, ""));

    if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Faltan z, x, y válidos" }));
      return;
    }
    if (!token) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Falta MAPBOX_ACCESS_TOKEN" }));
      return;
    }

    try {
      const mapboxUrl =
        `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/${z}/${x}/${y}` +
        `?access_token=${encodeURIComponent(token)}`;
      const r = await fetch(mapboxUrl);
      if (!r.ok) {
        res.statusCode = r.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: `Mapbox tiles ${r.status}` }));
        return;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      res.statusCode = 200;
      res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(buf);
    } catch {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Error al obtener tile de Mapbox" }));
    }
  });
}

function mapboxProxyPlugin(token) {
  return {
    name: "mapbox-proxy",
    configureServer(server) {
      installGeocodeMiddleware(server.middlewares, token);
      installMapTilesMiddleware(server.middlewares, token);
    },
    configurePreviewServer(server) {
      installGeocodeMiddleware(server.middlewares, token);
      installMapTilesMiddleware(server.middlewares, token);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const mapboxToken = String(env.MAPBOX_ACCESS_TOKEN || "").trim();

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
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
      }),
      geminiProxyPlugin(parseGeminiKeys(env.GEMINI_API_KEY)),
      mapboxProxyPlugin(mapboxToken),
    ],
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
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
