// ============================================================
// Proxy de tiles satélite Mapbox para VERCEL
// ============================================================
// GET /api/map-tiles?z=&x=&y=
// Estilo: mapbox/satellite-v9 (vista satélite pura)
// Tiles 256px — compatibles con Leaflet por defecto

export const config = {
  maxDuration: 15,
  runtime: 'nodejs',
};

const STYLE = 'mapbox/satellite-v9';

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

  const q = req.query || {};
  const z = Number(q.z);
  const x = Number(q.x);
  const y = Number(String(q.y || '').replace(/\.(png|jpg|jpeg|webp)$/i, ''));

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y)) {
    res.status(400).json({ error: 'Faltan z, x, y válidos' });
    return;
  }
  if (z < 0 || z > 22 || x < 0 || y < 0) {
    res.status(400).json({ error: 'Coordenadas de tile fuera de rango' });
    return;
  }

  const token = String(process.env.MAPBOX_ACCESS_TOKEN || '').trim();
  if (!token) {
    res.status(500).json({ error: 'Falta MAPBOX_ACCESS_TOKEN' });
    return;
  }

  // Raster tiles 256px (estándar Leaflet)
  const url =
    `https://api.mapbox.com/styles/v1/${STYLE}/tiles/${z}/${x}/${y}` +
    `?access_token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('[map-tiles] Mapbox', r.status, text.slice(0, 200));
      res.status(r.status).json({ error: `Mapbox tiles ${r.status}` });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).send(buf);
  } catch (err) {
    console.error('[map-tiles]', err?.message || err);
    res.status(502).json({ error: 'Error al obtener tile de Mapbox' });
  }
}
