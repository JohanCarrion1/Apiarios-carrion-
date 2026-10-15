// ============================================================
// Proxy del Asistente Apícola IA para VERCEL (Google Gemini)
// ============================================================
// La app está desplegada en Vercel, donde NO existe el rewrite de Firebase
// Hosting que apunta /api/gemini a la función de `functions/index.js`. Sin este
// archivo, /api/gemini devuelve el index.html de la SPA, el cliente no puede
// leer JSON y el chat muestra "Error de conexión. Intenta de nuevo.".
//
// Hace lo mismo que la función de Firebase y que el proxy de Vite: guarda la
// clave en el servidor, la añade a la petición y reenvía a Gemini.
//
// CONFIGURACIÓN (Vercel → Project → Settings → Environment Variables):
//   GEMINI_API_KEY = AIza...            (una clave)
//   GEMINI_API_KEY = AIza...a,AIza...b  (varias, separadas por comas: si una
//                                        agota su cuota se prueba la siguiente)
// Sin prefijo VITE_: así la clave nunca llega al navegador. Después de crearla,
// hay que volver a desplegar.
//
// Debe coincidir con AI_MODEL en src/services/aiAssistant.ts.

const GEMINI_MODEL = 'gemini-3.5-flash';

export const config = { maxDuration: 60 };

const urlGemini = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

const listaDeClaves = () =>
  String(process.env.GEMINI_API_KEY || '')
    .split(/[\s,]+/)
    .map((k) => k.trim())
    .filter(Boolean);

// 429 / 5xx = cuota agotada o servidor saturado → probar la siguiente clave.
// 403 solo si el mensaje habla de cuota. 400 o 200: la clave es válida, no rotar.
const convieneRotar = (status, data) => {
  if (status === 429 || status >= 500) return true;
  if (status === 403) {
    const msg = JSON.stringify(data || {}).toLowerCase();
    return msg.includes('quota') || msg.includes('exhausted') || msg.includes('rate');
  }
  return false;
};

async function llamarGemini(keys, body) {
  let ultimo = { status: 502, data: { error: 'Error de conexión con Gemini.' } };
  for (const key of keys) {
    try {
      const r = await fetch(urlGemini(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await r.json().catch(() => ({}));
      ultimo = { status: r.status, data };
      if (!convieneRotar(r.status, data)) return ultimo;
    } catch {
      ultimo = { status: 502, data: { error: 'Error de conexión con Gemini.' } };
    }
  }
  return ultimo;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Vercel ya parsea el JSON; por si llega como texto, se intenta leer igual.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || !Array.isArray(body.contents) || body.contents.length === 0) {
    res.status(400).json({ error: "Falta el campo 'contents'." });
    return;
  }

  const keys = listaDeClaves();
  if (keys.length === 0) {
    res.status(500).json({ error: 'El asistente no está configurado (falta GEMINI_API_KEY en Vercel).' });
    return;
  }

  const { status, data } = await llamarGemini(keys, JSON.stringify(body));
  res.status(status).json(data);
}
