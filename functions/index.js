// ============================================================
// Proxy del Asistente Apícola IA (Google Gemini)
// ============================================================
// Mantiene la clave GEMINI_API_KEY en el servidor (secreto de Firebase) para
// que nunca llegue al navegador. El cliente hace POST a /api/gemini (rewrite de
// Firebase Hosting) con el body de Gemini tal cual; esta función añade la clave
// y reenvía a generativelanguage.googleapis.com devolviendo la respuesta.

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

export const gemini = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 60,
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

    try {
      const r = await fetch(urlGemini(GEMINI_API_KEY.value()), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      res.status(r.status).json(data);
    } catch {
      res.status(502).json({ error: "Error de conexión con Gemini." });
    }
  }
);
