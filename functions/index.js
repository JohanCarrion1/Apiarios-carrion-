// ============================================================
// Proxy del Asistente Apícola IA (Google Gemini)
// ============================================================
// Mantiene la clave GEMINI_API_KEY en el servidor (secreto de Firebase) para
// que nunca llegue al navegador. El cliente hace POST a /api/gemini (rewrite de
// Firebase Hosting) con el body de Gemini tal cual; esta función añade la clave
// y reenvía a generativelanguage.googleapis.com devolviendo la respuesta.
//
// ROTACIÓN DE CLAVES: GEMINI_API_KEY admite UNA clave o VARIAS separadas por
// comas (o saltos de línea). Cuando una clave agota su cuota (HTTP 429, o 403
// con mensaje de cuota) o el servidor falla (5xx), se prueba automáticamente la
// siguiente. Así, cuando a una cuenta se le acaban las peticiones del día, el
// asistente sigue funcionando con la siguiente.
//   Ej.: GEMINI_API_KEY="AIza...a,AIza...b,AIza...c"
// Cada clave debe ser de un proyecto/cuenta distintos para que la cuota sea
// independiente (claves del MISMO proyecto comparten el mismo límite).

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// Debe coincidir con AI_MODEL en src/services/aiAssistant.ts y con GEMINI_MODEL
// en vite.config.js.
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

function urlGemini(key) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    key
  )}`;
}

/** Divide el secreto en claves individuales (admite comas, espacios o saltos). */
function listaDeClaves() {
  return String(GEMINI_API_KEY.value() || "")
    .split(/[\s,]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * ¿Conviene probar la siguiente clave con este fallo?
 *  - 429 y 5xx → cuota agotada / servidor saturado: rotar.
 *  - 403 con mensaje de cuota (algunas cuentas responden así): rotar.
 *  - 400 (petición inválida) o 200: la clave es válida, NO rotar.
 */
function convieneRotar(status, data) {
  if (status === 429 || status >= 500) return true;
  if (status === 403) {
    const msg = JSON.stringify(data || {}).toLowerCase();
    return msg.includes("quota") || msg.includes("exhausted") || msg.includes("rate");
  }
  return false;
}

/** Envía el body probando las claves en orden hasta que una responda. */
async function llamarGemini(keys, body) {
  let ultimo = { status: 502, data: { error: "Error de conexión con Gemini." } };
  for (const key of keys) {
    try {
      const r = await fetch(urlGemini(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await r.json().catch(() => ({}));
      ultimo = { status: r.status, data };
      if (!convieneRotar(r.status, data)) return ultimo;
    } catch {
      // Fallo de red con esta clave: se intenta la siguiente.
      ultimo = { status: 502, data: { error: "Error de conexión con Gemini." } };
    }
  }
  return ultimo;
}

export const gemini = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!Array.isArray(body.contents) || body.contents.length === 0) {
      res.status(400).json({ error: "Falta el campo 'contents'." });
      return;
    }

    const keys = listaDeClaves();
    if (keys.length === 0) {
      res.status(500).json({ error: "El asistente no está configurado (falta la clave de Gemini)." });
      return;
    }

    const { status, data } = await llamarGemini(keys, JSON.stringify(body));
    res.status(status).json(data);
  }
);
