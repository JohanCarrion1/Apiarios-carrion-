// ============================================================
// SERVICIO DEL ASISTENTE APÍCOLA IA (Google Gemini, vía proxy)
// ============================================================
// Chat conversacional libre (estilo Claude/ChatGPT). La clave de Gemini NO vive
// en el navegador: el cliente llama a un proxy propio (`/api/gemini`) que guarda
// la clave en el servidor:
//   - En producción: función de Firebase (`functions/index.js`) con el secreto
//     GEMINI_API_KEY, expuesta por un rewrite de Firebase Hosting.
//   - En desarrollo: proxy del dev-server de Vite (vite.config.js), que añade
//     la clave leyéndola de `GEMINI_API_KEY` en `.env`.
// El modelo es gemini-3.5-flash.
//
// La conversación se envía como un array de `contents` con roles `user`/`model`
// alternados. Las imágenes del celular viajan como `inline_data` (base64) y las
// URLs de Cloudinary de inspecciones existentes como `file_data` (con respaldo
// automático a `inline_data` si el modelo no admite el URI remoto).
//
// PRIVACIDAD: el contexto que viaja a la IA solo incluye datos del apiario y de
// las colmenas (códigos, estados, métricas de inspección, kilos de cosecha) y,
// solo si el usuario lo adjunta, imágenes. Nunca se envían correos, contraseñas,
// teléfonos ni datos personales.

import type { Hive, Inspection } from '../types/hive';
import type { Fecundador } from '../types/fecundador';
import { HIVE_STATUS_LABELS } from '../types/hive';
import { FECUNDADOR_STATE_LABELS } from '../types/fecundador';

export const AI_MODEL = 'gemini-3.5-flash';
export const AI_TIMEOUT_MS = 45_000;
export const AI_CONNECTION_ERROR = 'Error de conexión. Intenta de nuevo.';

/** Ruta del proxy propio que guarda la clave de Gemini en el servidor. */
const AI_ENDPOINT = '/api/gemini';

export interface ApiarioContexto {
  nombre: string;
  ubicacion: string;
  temporada: string;
}

export interface SujetoContexto {
  tipo: 'colmena' | 'nucleo' | 'fecundador';
  codigo: string;
  nombre?: string;
  estado: string;
  detalle?: string;
  ultimaInspeccion?: string;
}

export interface InspeccionResumen {
  fecha: string;
  resumen: string;
}

export interface ProduccionItem {
  fecha: string;
  kg: number;
  colmena: string;
}

export interface ProduccionContexto {
  anio: number;
  totalKg: number;
  registros: ProduccionItem[];
}

/**
 * Imagen adjunta a un mensaje. `url` puede ser un data URL base64
 * (`data:image/jpeg;base64,...`) o una URL directa (Cloudinary).
 */
export interface ImagenAdjunta {
  url: string;
}

/** Un turno de la conversación tal y como viaja al modelo. */
export interface MensajeChat {
  rol: 'user' | 'model';
  texto: string;
  /** Imágenes del turno. En la práctica solo se envían en el último turno. */
  imagenes?: ImagenAdjunta[];
}

export interface ChatParams {
  mensajes: MensajeChat[];
  /** Bloque de contexto (apiario, unidad mencionada, inspecciones, producción). */
  contexto?: string;
}

/** Respuesta del asistente: texto y si detectó una situación crítica. */
export interface RespuestaAsistente {
  texto: string;
  alerta: boolean;
}

/** Unidad detectada mencionada en el texto del usuario. */
export interface UnidadDetectada {
  tipo: 'colmena' | 'nucleo' | 'fecundador';
  id: string;
  code: string;
  nombre?: string;
}

/**
 * ¿Está disponible el asistente? La clave vive en el servidor (proxy), así que
 * desde el navegador no se puede comprobar su presencia: se asume configurado
 * y cualquier fallo del proxy se muestra como error de conexión.
 */
export function isAiConfigured(): boolean {
  return true;
}

/**
 * System prompt: experto apícola de altura (Andes peruanos, 3000+ msnm).
 * Flexible: responde tanto preguntas generales como sobre colmenas concretas.
 */
const SYSTEM_PROMPT = `Eres un experto apícola con 20 años de experiencia en apicultura de altura (Andes peruanos, 3000+ msnm). Responde en español, de forma clara y práctica. El usuario puede preguntarte sobre colmenas específicas (mencionadas por ID como C-01, N-05, F-12) o hacer preguntas generales de apicultura. Si menciona una colmena, usa los datos de contexto proporcionados. Si el usuario adjunta fotos de inspecciones, analízalas detalladamente: estado de la cría, presencia de reina, signos de enfermedad (varroa, nosema), nivel de población, reservas de miel/polen, estado general del cuadro. Siempre menciona que tus recomendaciones son orientativas.

Formato obligatorio: empieza SIEMPRE tu respuesta con una única línea con el formato exacto "ALERTA: SÍ" si detectas algo crítico (enfermedad grave, ausencia de reina o riesgo sanitario) o "ALERTA: NO" en caso contrario. Después continúa con tu respuesta normal.`;

function temporadaDe(fecha: Date): string {
  const mes = fecha.getMonth(); // 0 = enero
  if (mes === 11 || mes <= 1) return 'Verano andino (dic–feb): época de lluvias y floración';
  if (mes <= 4) return 'Otoño (mar–may): fin de lluvias, buena actividad de pecoreo';
  if (mes <= 7) return 'Invierno (jun–ago): temporada seca y fría, escasez de néctar';
  return 'Primavera (sep–nov): inicio de floración andina';
}

export function temporadaActual(fecha: Date = new Date()): string {
  return temporadaDe(fecha);
}

function formatearFecha(iso: string): string {
  if (!iso) return 'sin fecha';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Contexto de una colmena o núcleo, con su última inspección. */
export function sujetoDesdeColmena(
  hive: Hive,
  inspecciones: Inspection[],
  tipo: 'colmena' | 'nucleo'
): SujetoContexto {
  const propias = inspecciones
    .filter((i) => i.hiveId === hive.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const ultima = propias[0];
  const detalle = ultima
    ? `Cuadros de cría: ${ultima.brood}; miel: ${ultima.honey}; varroa: ${ultima.varroa}; reina vista: ${
        ultima.queenSeen ? 'sí' : 'no'
      }; temperamento: ${ultima.calm}/3`
    : undefined;
  return {
    tipo,
    codigo: hive.code,
    nombre: hive.name,
    estado: HIVE_STATUS_LABELS[hive.status] ?? hive.status,
    detalle,
    ultimaInspeccion: ultima ? formatearFecha(ultima.date) : undefined,
  };
}

/** Contexto de un fecundador (baby nuc). */
export function sujetoDesdeFecundador(f: Fecundador): SujetoContexto {
  const ultima = [...f.historial].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
  return {
    tipo: 'fecundador',
    codigo: f.code,
    nombre: f.name,
    estado: f.estado === 'promovido' ? 'Promovido a núcleo' : 'Activo',
    detalle: `Etapa de la reina: ${FECUNDADOR_STATE_LABELS[f.queenState]}`,
    ultimaInspeccion: ultima ? formatearFecha(ultima.fecha) : undefined,
  };
}

/** Últimas N inspecciones (de todo el apiario) resumidas para el contexto. */
export function resumirInspecciones(
  inspecciones: Inspection[],
  hives: Hive[],
  limite = 3
): InspeccionResumen[] {
  const codigoPorId = new Map(hives.map((h) => [h.id, h.code]));
  return [...inspecciones]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limite)
    .map((i) => ({
      fecha: formatearFecha(i.date),
      resumen: `${codigoPorId.get(i.hiveId) ?? i.hiveId}: cría ${i.brood}, miel ${i.honey}, varroa ${i.varroa}, reina ${
        i.queenSeen ? 'vista' : 'no vista'
      }${i.note ? `, nota: ${i.note}` : ''}`,
    }));
}

/** Datos de cosecha del apiario (año actual) para el análisis de producción. */
export function produccionDesdeCosechas(
  cosechas: Array<{ hiveId?: string; date?: string; honeyKg?: number }>,
  hives: Hive[],
  fecha: Date = new Date()
): ProduccionContexto {
  const anio = fecha.getFullYear();
  const codigoPorId = new Map(hives.map((h) => [h.id, h.code]));
  const delAnio = cosechas
    .filter((c) => (c.date ? new Date(c.date).getFullYear() === anio : true))
    .map((c) => ({
      fecha: formatearFecha(c.date || ''),
      kg: Number(c.honeyKg) || 0,
      colmena: c.hiveId ? codigoPorId.get(c.hiveId) ?? c.hiveId : 'apiario',
    }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const totalKg = Math.round(delAnio.reduce((s, c) => s + c.kg, 0) * 100) / 100;
  return { anio, totalKg, registros: delAnio.slice(0, 20) };
}

// ------------------------------------------------------------
// Detección de colmena/núcleo/fecundador mencionado en el mensaje
// ------------------------------------------------------------

interface EntidadCodigo {
  id: string;
  code: string;
  name?: string;
}

interface CodigoParseado {
  letra: string;
  num: number;
}

function parsearCodigo(code: string): CodigoParseado | undefined {
  const m = String(code || '').trim().match(/^([A-Za-z]+)\s*[- ]?\s*(\d+)$/);
  if (!m) return undefined;
  return { letra: m[1].toUpperCase(), num: Number.parseInt(m[2], 10) };
}

function letraParaTipo(tipo: UnidadDetectada['tipo']): string {
  return tipo === 'colmena' ? 'C' : tipo === 'nucleo' ? 'N' : 'F';
}

/**
 * Busca en el texto del usuario referencias a una unidad concreta:
 * códigos tipo "C-99", "N-05", "F-12" o expresiones como "colmena 5",
 * "núcleo 12", "fecundador 3". Devuelve la primera unidad que coincida con
 * los datos ya cargados (colmenas, núcleos, fecundadores).
 */
export function detectarUnidadEnMensaje(
  texto: string,
  hives: Hive[],
  nuclei: Hive[],
  fecundadores: Fecundador[]
): UnidadDetectada | undefined {
  if (!texto) return undefined;
  const t = texto.toLowerCase();

  const candidatos: Array<{ tipo: UnidadDetectada['tipo']; ent: EntidadCodigo }> = [
    ...hives.map((h) => ({ tipo: 'colmena' as const, ent: h })),
    ...nuclei.map((h) => ({ tipo: 'nucleo' as const, ent: h })),
    ...fecundadores.map((f) => ({ tipo: 'fecundador' as const, ent: f })),
  ];

  const coincide = (
    tipo: UnidadDetectada['tipo'],
    letra: string,
    numero: number
  ): EntidadCodigo | undefined =>
    candidatos.find((c) => {
      if (c.tipo !== tipo) return false;
      const p = parsearCodigo(c.ent.code);
      return !!p && p.letra === letra && p.num === numero;
    })?.ent;

  const crear = (tipo: UnidadDetectada['tipo'], ent: EntidadCodigo): UnidadDetectada => ({
    tipo,
    id: ent.id,
    code: ent.code,
    nombre: ent.name,
  });

  // 1) Códigos con prefijo explícito: c-99, n 05, f-12.
  const codeRe = /\b([cnf])\s*[- ]?\s*(\d{1,4})(?![\d])/gi;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(t))) {
    const letra = m[1].toUpperCase();
    const tipo: UnidadDetectada['tipo'] =
      letra === 'C' ? 'colmena' : letra === 'N' ? 'nucleo' : 'fecundador';
    const ent = coincide(tipo, letra, Number.parseInt(m[2], 10));
    if (ent) return crear(tipo, ent);
  }

  // 2) Frases en lenguaje natural: "colmena 5", "núcleo 12", "fecundador 3".
  const wordRe =
    /\b(colmenas?|n[úu]cleos?|nucleos?|fecundador(?:es|a)?)\s*(?:n[.º°]?\s*|#|n[úu]m\.?\s*)?\s*(\d{1,4})\b/gi;
  while ((m = wordRe.exec(t))) {
    const palabra = m[1].toLowerCase();
    const tipo: UnidadDetectada['tipo'] = palabra.startsWith('colmena')
      ? 'colmena'
      : palabra.startsWith('fecundador')
        ? 'fecundador'
        : 'nucleo';
    const ent = coincide(tipo, letraParaTipo(tipo), Number.parseInt(m[2], 10));
    if (ent) return crear(tipo, ent);
  }

  return undefined;
}

// ------------------------------------------------------------
// Construcción del contexto que acompaña a la conversación
// ------------------------------------------------------------

function bloqueContextoBase(apiario: ApiarioContexto): string {
  return [
    `Apiario: ${apiario.nombre || 'sin nombre'}`,
    `Ubicación: ${apiario.ubicacion || 'Huaraz, 3052 msnm'}`,
    `Temporada actual: ${apiario.temporada}`,
  ].join('\n');
}

function bloqueSujeto(s: SujetoContexto): string {
  return [
    `Tipo: ${s.tipo}`,
    `Código: ${s.codigo}${s.nombre ? ` (${s.nombre})` : ''}`,
    `Estado actual: ${s.estado}`,
    s.detalle ? `Última inspección: ${s.detalle}` : '',
    s.ultimaInspeccion ? `Fecha última inspección: ${s.ultimaInspeccion}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export interface ContextoChatParams {
  apiario: ApiarioContexto;
  sujeto?: SujetoContexto;
  inspecciones?: InspeccionResumen[];
  produccion?: ProduccionContexto;
  /** Nota libre adicional (p. ej. si el usuario mencionó varias unidades). */
  nota?: string;
}

/**
 * Construye el bloque de contexto del sistema. Se recalcula en cada turno a
 * partir de la unidad detectada en el mensaje, así el usuario no elige nada.
 */
export function construirContextoChat(p: ContextoChatParams): string {
  const partes: string[] = [bloqueContextoBase(p.apiario)];

  if (p.sujeto) {
    partes.push(
      `El usuario ha mencionado la siguiente unidad, usa estos datos reales:\n${bloqueSujeto(p.sujeto)}`
    );
  }

  if (p.inspecciones?.length) {
    partes.push(
      `Últimas inspecciones del apiario:\n${p.inspecciones
        .map((i) => `- ${i.fecha}: ${i.resumen}`)
        .join('\n')}`
    );
  }

  if (p.produccion) {
    const registros = p.produccion.registros
      .map((r) => `${r.fecha}: ${r.kg} kg (${r.colmena})`)
      .join('; ');
    partes.push(
      `Producción de miel del año ${p.produccion.anio}: total ${p.produccion.totalKg} kg. Registros: ${
        registros || 'sin registros'
      }`
    );
  }

  if (p.nota?.trim()) partes.push(p.nota.trim());

  return partes.join('\n\n');
}

// ------------------------------------------------------------
// Llamada al proxy de Gemini
// ------------------------------------------------------------

/** Extrae la línea "ALERTA: SÍ/NO" y devuelve el texto limpio + flag. */
function interpretarRespuesta(texto: string): RespuestaAsistente {
  const limpio = texto.trim();
  const match = limpio.match(/^ALERTA\s*:\s*(S[ÍI]|NO)\b[.:]?[ \t]*/i);
  if (!match) return { texto: limpio, alerta: false };
  const alerta = /^S[ÍI]$/i.test(match[1]);
  return { texto: limpio.slice(match[0].length).trim(), alerta };
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
  file_data?: { mime_type: string; file_uri: string };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

/** Adivina el MIME por extensión de la URL (por defecto JPEG). */
function mimeDeUrl(url: string): string {
  const m = url.split('?')[0].match(/\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i);
  if (!m) return 'image/jpeg';
  const ext = m[1].toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

/** Descarga una URL remota y la convierte en datos en línea base64. */
async function urlAInlineData(
  url: string,
  signal: AbortSignal
): Promise<{ mime_type: string; data: string }> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(AI_CONNECTION_ERROR);
  const blob = await res.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error(AI_CONNECTION_ERROR));
    reader.readAsDataURL(blob);
  });
  return { mime_type: blob.type || 'image/jpeg', data: base64 };
}

/**
 * Convierte una imagen en una `part` de Gemini. Los data URLs viajan como
 * `inline_data`; las URLs de Cloudinary se intentan como `file_data` (sin
 * descargarlas, para ahorrar tokens) y, si `remotasInline` es true, se
 * descargan y convierten a base64 como respaldo.
 */
async function imagenAPart(
  img: ImagenAdjunta,
  signal: AbortSignal,
  remotasInline: boolean
): Promise<GeminiPart> {
  const dataUrl = img.url.match(/^data:([^;,]+);base64,(.*)$/s);
  if (dataUrl) return { inline_data: { mime_type: dataUrl[1], data: dataUrl[2] } };
  if (!remotasInline) {
    return { file_data: { mime_type: mimeDeUrl(img.url), file_uri: img.url } };
  }
  return { inline_data: await urlAInlineData(img.url, signal) };
}

/**
 * Convierte la conversación en `contents` de Gemini. Fusiona turnos
 * consecutivos del mismo rol (la API exige alternancia y empezar por `user`) y
 * adjunta las imágenes solo al último turno del usuario. Las imágenes remotas
 * se envían como `file_data` salvo que `remotasInline` sea true.
 */
async function construirContents(
  mensajes: MensajeChat[],
  signal: AbortSignal,
  remotasInline: boolean
): Promise<GeminiContent[]> {
  const limpios = mensajes
    .map((m) => ({
      rol: m.rol,
      texto: (m.texto ?? '').trim(),
      imagenes: m.imagenes ?? [],
    }))
    .filter((m) => m.texto.length > 0 || m.imagenes.length > 0);

  const fusionados: Array<{ rol: 'user' | 'model'; texto: string; imagenes: ImagenAdjunta[] }> = [];
  for (const m of limpios) {
    const ultimo = fusionados[fusionados.length - 1];
    if (ultimo && ultimo.rol === m.rol) {
      ultimo.texto = [ultimo.texto, m.texto].filter(Boolean).join('\n');
      ultimo.imagenes = [...ultimo.imagenes, ...m.imagenes];
    } else {
      fusionados.push({ ...m });
    }
  }

  // La API exige que el primer contenido sea del usuario.
  if (fusionados[0]?.rol === 'model') fusionados.unshift({ rol: 'user', texto: 'Hola', imagenes: [] });

  const contents: GeminiContent[] = [];
  for (let i = 0; i < fusionados.length; i += 1) {
    const m = fusionados[i];
    const esUltimo = i === fusionados.length - 1;
    const parts: GeminiPart[] = [];
    if (esUltimo && m.rol === 'user' && m.imagenes.length > 0) {
      for (const img of m.imagenes) parts.push(await imagenAPart(img, signal, remotasInline));
    }
    if (m.texto) parts.push({ text: m.texto });
    contents.push({ role: m.rol, parts });
  }

  // La API exige que el último contenido sea del usuario.
  if (contents[contents.length - 1]?.role === 'model') {
    contents.push({ role: 'user', parts: [{ text: 'Continúa, por favor.' }] });
  }

  return contents;
}

/**
 * Lanza la conversación al asistente a través del proxy. Devuelve el texto de
 * la respuesta y si la IA marcó una alerta crítica. Timeout de 45 s. Cualquier
 * fallo de red/API se traduce a un error amigable.
 */
export async function consultarChat(params: ChatParams): Promise<RespuestaAsistente> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  const systemText = [SYSTEM_PROMPT, params.contexto].filter(Boolean).join('\n\n');
  const enviar = (contents: GeminiContent[]): Promise<Response> =>
    fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
      signal: controller.signal,
    });

  try {
    const hayRemota = params.mensajes.some((m) =>
      (m.imagenes ?? []).some((img) => !/^data:/.test(img.url))
    );

    let contents = await construirContents(params.mensajes, controller.signal, false);
    let res = await enviar(contents);

    // Si el modelo rechaza los `file_data` de Cloudinary, se reintenta
    // descargando las imágenes a base64 (inline_data).
    if (!res.ok && hayRemota) {
      contents = await construirContents(params.mensajes, controller.signal, true);
      res = await enviar(contents);
    }

    if (!res.ok) throw new Error(AI_CONNECTION_ERROR);

    const data = (await res.json()) as GeminiResponse;
    const contenido = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!contenido) throw new Error(AI_CONNECTION_ERROR);
    return interpretarRespuesta(contenido);
  } catch {
    throw new Error(AI_CONNECTION_ERROR);
  } finally {
    clearTimeout(timeout);
  }
}
