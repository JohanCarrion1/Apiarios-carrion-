// Preparación del historial del Asistente IA para guardarlo en Firestore.
//
// El historial viaja como un campo del documento userData/{uid}. Dos cosas
// hacían que Firestore lo rechazara (y por eso "no se guardaba" en la nube):
//   1. Mensajes con campos `undefined` (p. ej. `imagenes` en un mensaje sin
//      fotos): setDoc lanza "Unsupported field value: undefined" y TODO el
//      documento se pierde. En localStorage no se nota porque JSON.stringify
//      los descarta.
//   2. Fotos en base64 (data:) dentro de los mensajes: un par de ellas supera
//      el límite de 1 MiB por documento.
// Aquí se limpia el objeto antes de enviarlo. Solo afecta a lo que va a la
// nube; la copia local conserva las fotos para la sesión en curso.

/** Tope del historial en la nube (el documento admite 1 MiB y lleva más campos). */
const MAX_BYTES_NUBE = 600 * 1024;

interface MsgNube {
  id?: string;
  imagenes?: string[];
  [k: string]: unknown;
}

interface ConvNube {
  id?: string;
  actualizada?: number;
  mensajes?: MsgNube[];
  [k: string]: unknown;
}

interface EstadoNube {
  conversaciones?: ConvNube[];
  activaId?: string;
}

const bytes = (valor: unknown): number => new TextEncoder().encode(JSON.stringify(valor)).length;

const esDataUrl = (s: unknown): boolean => typeof s === 'string' && s.startsWith('data:');

/**
 * Devuelve una copia del historial lista para Firestore: sin `undefined`, sin
 * fotos en base64 y por debajo del tope de tamaño (se descartan primero las
 * conversaciones más antiguas que no sean la activa).
 */
export function prepararChatsParaNube<T>(estado: T): T {
  if (!estado || typeof estado !== 'object') return estado;
  // El viaje por JSON elimina todos los `undefined` anidados.
  const copia = JSON.parse(JSON.stringify(estado)) as EstadoNube;
  const convs = Array.isArray(copia.conversaciones) ? copia.conversaciones : [];

  for (const conv of convs) {
    if (!Array.isArray(conv.mensajes)) conv.mensajes = [];
    for (const msg of conv.mensajes) {
      if (!Array.isArray(msg.imagenes)) continue;
      const remotas = msg.imagenes.filter((u) => !esDataUrl(u));
      if (remotas.length) msg.imagenes = remotas;
      else delete msg.imagenes;
    }
  }

  while (bytes(copia) > MAX_BYTES_NUBE && convs.length > 1) {
    let idx = -1;
    let min = Infinity;
    convs.forEach((c, i) => {
      if (c.id === copia.activaId) return;
      const t = typeof c.actualizada === 'number' ? c.actualizada : 0;
      if (t < min) {
        min = t;
        idx = i;
      }
    });
    if (idx < 0) break;
    convs.splice(idx, 1);
  }

  // Una sola conversación enorme: se recortan sus mensajes más antiguos.
  const activa = convs.find((c) => c.id === copia.activaId) ?? convs[0];
  while (activa && bytes(copia) > MAX_BYTES_NUBE && (activa.mensajes?.length ?? 0) > 2) {
    activa.mensajes!.shift();
  }

  copia.conversaciones = convs;
  return copia as unknown as T;
}

/**
 * Al bajar el historial de la nube se pierden las fotos en base64 (no se
 * suben). Si este dispositivo aún las tiene en el mismo mensaje, se conservan.
 */
export function conservarFotosLocales<T>(remoto: T, local: unknown): T {
  const r = remoto as EstadoNube | null;
  const l = local as EstadoNube | null;
  if (!r || !Array.isArray(r.conversaciones) || !l || !Array.isArray(l.conversaciones)) {
    return remoto;
  }
  const fotos = new Map<string, string[]>();
  for (const conv of l.conversaciones) {
    for (const msg of conv.mensajes ?? []) {
      if (conv.id && msg.id && Array.isArray(msg.imagenes) && msg.imagenes.length) {
        fotos.set(`${conv.id}/${msg.id}`, msg.imagenes);
      }
    }
  }
  if (!fotos.size) return remoto;
  for (const conv of r.conversaciones) {
    for (const msg of conv.mensajes ?? []) {
      const guardadas = conv.id && msg.id ? fotos.get(`${conv.id}/${msg.id}`) : undefined;
      if (guardadas && !msg.imagenes) msg.imagenes = guardadas;
    }
  }
  return remoto;
}
