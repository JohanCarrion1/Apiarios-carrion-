// ============================================================
// Proxy de tiles satélite Mapbox para VERCEL
// ============================================================
// El navegador pide GET /api/map-tiles/{z}/{x}/{y}
// Este handler añade MAPBOX_ACCESS_TOKEN y reenvía la imagen a Mapbox.
// Así el token no necesita el prefijo VITE_ ni llega al bundle del cliente.
//
// Estilo: mapbox/satellite-streets-v12 (satélite + etiquetas)

export const config = { maxDuration: 15 };

const STYLE = 'mapbox/satellite-streets-v12';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Vercel: /api/map-tiles?z=&x=&y=  o path catch-all según routing
  const q = req.query || {};
  let z = q.z;
  let x = q.x;
  let y = q.y;

  // Soporta /api/map-tiles/12/1234/5678 si Vercel pasa path segments
  if ((z === undefined || x === undefined || y === undefined) && q.path) {
    const parts = String(Array.isArray(q.path) ? q.path.join('/') : q.path).split('/');
    if (parts.length >= 3) {
      z = parts[0];
      x = parts[1];
      y = parts[2];
    }
  }

  // Algunos setups pasan el resto de la ruta en req.query como array
  if (z === undefined && Array.isArray(q.slug) && q.slug.length >= 3) {
    z = q.slug[0];
    x = q.slug[1];
    y = q.slug[2];
  }

  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(String(y).replace(/\.png$/i, ''));

  if (!Number.isFinite(zi) || !Number.isFinite(xi) || !Number.isFinite(yi)) {
    res.status(400).json({ error: 'Faltan z, x, y válidos' });
    return;
  }
  if (zi < 0 || zi > 22 || xi < 0 || yi < 0) {
    res.status(400).json({ error: 'Coordenadas de tile fuera de rango' });
    return;
  }

  const token = String(process.env.MAPBOX_ACCESS_TOKEN || '').trim();
  if (!token) {
    res.status(500).json({ error: 'Falta MAPBOX_ACCESS_TOKEN' });
    return;
  }

  // tiles @2x: 512px — Leaflet con tileSize 512 + zoomOffset -1
  const url =
    `https://api.mapbox.com/styles/v1/${STYLE}/tiles/512/${zi}/${xi}/${yi}@2x` +
    `?access_token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      res.status(r.status).json({ error: `Mapbox tiles ${r.status}` });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).send(buf);
  } catch (err) {
    console.error('[map-tiles]', err?.message || err);
    res.status(502).json({ error: 'Error al obtener tile de Mapbox' });
  }
}
