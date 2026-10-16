// ============================================================
// Proxy de geocodificación inversa (Mapbox) para VERCEL
// ============================================================
// Igual que /api/gemini: la clave se queda en el servidor y nunca llega al
// navegador. El cliente hace GET /api/geocode?lat=..&lng=.. y este handler
// añade MAPBOX_ACCESS_TOKEN y reenvía a la API de Mapbox.
//
// CONFIGURACIÓN (Vercel → Project → Settings → Environment Variables):
//   MAPBOX_ACCESS_TOKEN = pk.eyJ...   (token público o secreto de Mapbox)
// Sin prefijo VITE_: así la clave no se incrusta en el bundle del cliente.
// Después de crearla, hay que volver a desplegar.
//
// Documentación Mapbox:
//   https://docs.mapbox.com/api/search/geocoding/

export const config = { maxDuration: 15 };

const MAPBOX_REVERSE = (lng, lat, token) =>
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    lng
  )},${encodeURIComponent(lat)}.json?access_token=${encodeURIComponent(
    token
  )}&language=es&limit=1&types=address,place,locality,neighborhood,region,country`;

/** Construye una dirección legible a partir de features de Mapbox. */
function direccionDesdeFeatures(features) {
  if (!Array.isArray(features) || features.length === 0) return null;
  const f = features[0];
  // place_name ya viene localizado (language=es) y es la forma más natural.
  if (f.place_name) return String(f.place_name);
  if (f.text) return String(f.text);
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'Faltan lat y lng numéricos válidos.' });
    return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: 'Coordenadas fuera de rango.' });
    return;
  }

  const token = String(process.env.MAPBOX_ACCESS_TOKEN || '').trim();
  if (!token) {
    res.status(500).json({
      error:
        'Geocodificación no configurada (falta MAPBOX_ACCESS_TOKEN en Vercel).',
    });
    return;
  }

  try {
    const r = await fetch(MAPBOX_REVERSE(lng, lat, token), {
      headers: { Accept: 'application/json' },
    });
    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const msg =
        data?.message || data?.error || `Mapbox respondió ${r.status}`;
      res.status(r.status >= 400 && r.status < 600 ? r.status : 502).json({
        error: msg,
      });
      return;
    }

    const address = direccionDesdeFeatures(data.features);
    if (!address) {
      res.status(404).json({ error: 'No se encontró dirección para esas coordenadas.' });
      return;
    }

    res.status(200).json({
      address,
      lat,
      lng,
      // Datos útiles por si el cliente quiere más detalle
      place_name: data.features?.[0]?.place_name,
      place_type: data.features?.[0]?.place_type,
    });
  } catch (err) {
    console.error('[geocode] Error al llamar a Mapbox:', err?.message || err);
    res.status(502).json({ error: 'Error de conexión con Mapbox.' });
  }
}
