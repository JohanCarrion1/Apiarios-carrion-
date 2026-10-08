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

// Aviso del sistema pulsado: se cierra y se enfoca la pestaña del app
// (o se abre si no estaba). Sin este handler tocar la notificación no hace nada.
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: any[]) => {
      for (const client of clientList) {
        if (client.focus) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
      return undefined;
    })
  );
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