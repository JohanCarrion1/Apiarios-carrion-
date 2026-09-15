import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { skipWaiting } from "workbox-core";

declare let self: any;

skipWaiting();

self.addEventListener("message", (event: MessageEvent) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Cache-First para los assets estáticos (JS, CSS, HTML, íconos y fuentes)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Network-First para los datos de clima con fallback a cache
registerRoute(
  ({ url }) => url.hostname === "api.open-meteo.com",
  new NetworkFirst({
    cacheName: "weather-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 1800, // 30 minutos
      }),
    ],
  })
);

// Navegación SPA: primero el app-shell cacheado (funciona offline);
// si no hay red y el shell no está disponible, muestra offline.html
const shellHandler = createHandlerBoundToURL("index.html");
const offlineHandler = createHandlerBoundToURL("offline.html");

registerRoute(
  new NavigationRoute(async (ctx) => {
    try {
      return await shellHandler(ctx);
    } catch (error) {
      try {
        return await offlineHandler(ctx);
      } catch (offlineError) {
        return Response.error();
      }
    }
  })
);