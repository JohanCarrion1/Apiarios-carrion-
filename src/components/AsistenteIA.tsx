// ============================================================
// PÁGINA "ASISTENTE APÍCOLA IA" — chat conversacional libre
// ============================================================
// Chat estilo Claude/ChatGPT. El usuario escribe libremente (o usa chips de
// acceso rápido) y puede adjuntar hasta 3 imágenes: nuevas (cámara/galería, en
// base64) o fotos de inspecciones existentes (URLs de Cloudinary, sin
// reconvertir).
//
// Contexto automático: si el mensaje menciona una colmena/núcleo/fecundador
// (p. ej. "C-99", "colmena 5"), se buscan sus datos y se pasan a la IA; si no,
// responde con conocimiento general de apicultura.
//
// Historial: cada usuario guarda varias conversaciones. El historial vive en
// la capa única de almacenamiento (`panal_v1_user_${uid}_conversacionesIA`) y
// se sincroniza con Firestore como campo del documento `userData/{uid}`, así
// que viaja entre dispositivos y entra en las copias de seguridad y en
// "Borrar todos mis datos". El menú hamburguesa del chat permite cambiar de
// conversación; cada una se limita a 50 mensajes. Se admiten claves heredadas
// (`ia_conversaciones_${userId}` y `ia_chat_${userId}`), que se migran la
// primera vez.
//
// Límite: cada mensaje enviado cuenta como 1 de las 5 consultas gratuitas
// diarias (src/services/aiUsage.ts). Los ADMINISTRADORES no tienen límite.
//
// UI: el componente soporta modo PANTALLA COMPLETA (`fullscreen`), coordinado
// con el dashboard (App.tsx oculta su header/footer en ese modo) y botón
// "Salir" que navega de vuelta al panel principal.

import Logo from './Logo';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Hive, Inspection } from '../types/hive';
import type { Fecundador } from '../types/fecundador';
import { IconRobot, IconX, IconTrash } from '../ui';
import { useAuth } from '../context/AuthContext';
import ChatMarkdown from './ChatMarkdown';
import { construirContextoGlobal, type DatosApp } from '../services/aiContext';
import { loadAnnualGoal, loadBasePrice, loadWeatherCache } from '../utils/storage';
import { uploadImage } from '../lib/cloudinary';
import { isEmailAdmin } from '../lib/adminAccess';
import {
  consultarChat,
  isAiConfigured,
  sujetoDesdeColmena,
  sujetoDesdeFecundador,
  temporadaActual,
  construirContextoChat,
  detectarUnidadEnMensaje,
  AI_CONNECTION_ERROR,
  AI_LIMIT_ERROR,
  AI_BLOCKED_ERROR,
  type ApiarioContexto,
  type MensajeChat,
  type SujetoContexto,
} from '../services/aiAssistant';
import {
  MAX_CONSULTAS_DIA,
  getConsultasHoy,
  limiteAlcanzado,
  registrarConsulta,
} from '../services/aiUsage';
import {
  getRecentInspectionPhotos,
  type InspectionPhotoItem,
} from '../services/firestoreSync';
import { compressImage } from '../services/photos';
import { loadConversacionesIA, saveConversacionesIA } from '../utils/storage';
import { useScrollLock } from '../hooks/useScrollLock';

interface Props {
  userId: string;
  apiaryName?: string;
  apiaryLocation?: string;
  hives?: Hive[];
  nuclei?: Hive[];
  fecundadores?: Fecundador[];
  inspections?: Inspection[];
  harvests?: Array<{ hiveId?: string; date?: string; honeyKg?: number }>;
  /** Resto de datos de la app: el asistente los recibe todos como contexto global. */
  datos?: Omit<DatosApp, 'apiario' | 'hives' | 'nuclei' | 'fecundadores' | 'inspections' | 'harvests' | 'focoId' | 'weather' | 'basePrice' | 'annualGoal'>;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'error') => void;
  /** Modo inmersivo: el chat ocupa toda la pantalla. */
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Salir del asistente y volver al dashboard. */
  onExit?: () => void;
}

interface ChatMsg {
  id: string;
  rol: 'user' | 'model';
  texto: string;
  fecha: number;
  imagenes?: string[];
  alerta?: boolean;
}

interface ImagenUI {
  url: string;
  /** true si es una URL directa (Cloudinary): se envía sin convertir a base64. */
  esUrl: boolean;
  origen: 'camara' | 'galeria' | 'inspeccion';
  /** URL en Cloudinary: es la que se guarda en el chat (y en la nube). */
  urlNube?: string;
  /** true mientras la foto se sube a la nube. */
  subiendo?: boolean;
}

const MAX_ADJUNTOS = 3;
const MAX_MENSAJES = 50;
const MAX_IMAGEN_BYTES = 2 * 1024 * 1024;
const MAX_LADO_PX = 1024;

const CHIPS: Array<{ emoji: string; label: string; texto: string }> = [
  { emoji: '🔍', label: 'Diagnosticar', texto: 'Diagnostica el estado sanitario de mi colmena.' },
  { emoji: '📋', label: 'Manejo', texto: '¿Qué manejo me recomiendas para mi colmena en esta temporada?' },
  { emoji: '📊', label: 'Producción', texto: 'Analiza la producción de miel de mi apiario.' },
  { emoji: '🐛', label: 'Varroa', texto: '¿Cómo controlo la varroa en mis colmenas de altura?' },
  { emoji: '👑', label: 'Reina', texto: '¿Cómo evalúo si mi colmena tiene reina?' },
];

const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Máximo de conversaciones guardadas por usuario. */
const MAX_CONVERSACIONES = 25;

interface Conversacion {
  id: string;
  titulo: string;
  creada: number;
  actualizada: number;
  mensajes: ChatMsg[];
}

interface EstadoChat {
  conversaciones: Conversacion[];
  activaId: string;
}

const convKey = (userId: string) => `ia_conversaciones_${userId}`;
// Clave heredada (una sola conversación) solo para migrar datos antiguos.
const chatKey = (userId: string) => `ia_chat_${userId}`;

/** Título de una conversación: el primer mensaje del usuario, recortado. */
const tituloDe = (msgs: ChatMsg[]): string => {
  const primero = msgs.find((m) => m.rol === 'user' && m.texto.trim());
  if (!primero) return 'Nueva conversación';
  const t = primero.texto.trim().replace(/\s+/g, ' ');
  return t.length > 42 ? `${t.slice(0, 42).trimEnd()}…` : t;
};

const crearConversacion = (mensajes: ChatMsg[] = []): Conversacion => {
  const ahora = Date.now();
  return {
    id: nuevoId(),
    titulo: tituloDe(mensajes),
    creada: mensajes[0]?.fecha ?? ahora,
    actualizada: ahora,
    mensajes: mensajes.slice(-MAX_MENSAJES),
  };
};

function cargarChat(userId: string): ChatMsg[] {
  if (!userId) return [];
  try {
    const raw = window.localStorage.getItem(chatKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMsg[]).slice(-MAX_MENSAJES) : [];
  } catch {
    return [];
  }
}

/** Normaliza un objeto guardado a `EstadoChat`, descartando entradas inválidas. */
function normalizarEstado(parsed: Partial<EstadoChat> | null): EstadoChat | null {
  const lista = Array.isArray(parsed?.conversaciones)
    ? parsed!.conversaciones.filter(
        (c): c is Conversacion =>
          !!c && typeof c.id === 'string' && Array.isArray(c.mensajes)
      )
    : [];
  if (!lista.length) return null;
  const activaId = lista.some((c) => c.id === parsed?.activaId)
    ? (parsed!.activaId as string)
    : lista[0].id;
  return { conversaciones: lista.slice(0, MAX_CONVERSACIONES), activaId };
}

/**
 * Carga el historial de conversaciones.
 *
 * Fuente principal: la entidad unificada (`conversacionesIA`), que se hidrata
 * desde Firestore y entra en las copias de seguridad y en "Borrar todos mis
 * datos". Si aún no existe, migra las claves heredadas sin versión (el
 * historial múltiple `ia_conversaciones_` y el chat único `ia_chat_`).
 */
function cargarEstado(userId: string): EstadoChat {
  if (userId) {
    try {
      const actual = normalizarEstado(
        loadConversacionesIA<Partial<EstadoChat> | null>(null, userId)
      );
      if (actual) return actual;
    } catch {
      /* datos corruptos: se intenta migrar o se regenera */
    }
    try {
      const raw = window.localStorage.getItem(convKey(userId));
      if (raw) {
        const heredado = normalizarEstado(JSON.parse(raw) as Partial<EstadoChat> | null);
        if (heredado) return heredado;
      }
    } catch {
      /* datos corruptos: se regenera */
    }
  }
  const chatUnico = cargarChat(userId);
  if (chatUnico.length) {
    const conv = crearConversacion(chatUnico);
    return { conversaciones: [conv], activaId: conv.id };
  }
  const conv = crearConversacion();
  return { conversaciones: [conv], activaId: conv.id };
}

const horaCorta = (ts: number) =>
  new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

const fechaCorta = (ts: number) =>
  new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

const fechaFotos = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const etiquetaTipo = (tipo: InspectionPhotoItem['unidadTipo']) =>
  tipo === 'colmena' ? 'Colmena' : tipo === 'nucleo' ? 'Núcleo' : 'Fecundador';

/** Lee el archivo como data URL; si supera 2 MB, lo redimensiona a 1024 px. */
async function procesarArchivo(file: File): Promise<string> {
  if (file.size > MAX_IMAGEN_BYTES) {
    return compressImage(file, MAX_LADO_PX, 0.8);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

export default function AsistenteIA({
  userId,
  apiaryName = '',
  apiaryLocation = '',
  hives = [],
  nuclei = [],
  fecundadores = [],
  inspections = [],
  harvests = [],
  datos,
  onShowToast,
  fullscreen = false,
  onToggleFullscreen,
  onExit,
}: Props) {
  const { user } = useAuth();
  const esAdmin = !!user && isEmailAdmin(user.email);

  const [estado, setEstado] = useState<EstadoChat>(() => cargarEstado(userId));
  const [input, setInput] = useState('');
  const [adjuntos, setAdjuntos] = useState<ImagenUI[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [usadas, setUsadas] = useState(() => getConsultasHoy(userId));
  const [menuFoto, setMenuFoto] = useState(false);
  const [modalFotos, setModalFotos] = useState(false);
  const [fotosInspeccion, setFotosInspeccion] = useState<InspectionPhotoItem[]>([]);
  const [cargandoFotos, setCargandoFotos] = useState(false);
  const [seleccionFotos, setSeleccionFotos] = useState<string[]>([]);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  // Confirmación de borrado: id de la conversación, 'todas' o null.
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const configurado = useMemo(() => isAiConfigured(), []);
  // Los administradores no tienen límite de consultas.
  const bloqueado = !esAdmin && (usadas >= MAX_CONSULTAS_DIA || limiteAlcanzado(userId));

  const { conversaciones, activaId } = estado;
  const mensajes = useMemo(
    () => conversaciones.find((c) => c.id === activaId)?.mensajes ?? [],
    [conversaciones, activaId]
  );
  const conversacionesOrdenadas = useMemo(
    () => [...conversaciones].sort((a, b) => b.actualizada - a.actualizada),
    [conversaciones]
  );

  // Aplica cambios a la conversación activa (y mantiene su título al día).
  const actualizarMensajes = (updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => {
    setEstado((prev) => {
      const activaActual =
        prev.conversaciones.find((c) => c.id === prev.activaId) ?? prev.conversaciones[0];
      if (!activaActual) return prev;
      return {
        ...prev,
        conversaciones: prev.conversaciones.map((c) => {
          if (c.id !== activaActual.id) return c;
          const base =
            typeof updater === 'function'
              ? (updater as (p: ChatMsg[]) => ChatMsg[])(c.mensajes)
              : updater;
          const recortados = base.slice(-MAX_MENSAJES);
          return { ...c, mensajes: recortados, actualizada: Date.now(), titulo: tituloDe(recortados) };
        }),
      };
    });
  };

  useScrollLock(modalFotos || fullscreen);

  // Persistencia del historial: se guarda en la entidad unificada, que además
  // replica a Firestore (multi-dispositivo), entra en las copias de seguridad y
  // en "Borrar todos mis datos".
  useEffect(() => {
    if (!userId) return;
    saveConversacionesIA(estado, userId);
    // Migración completada: eliminar las claves heredadas sin versión para que
    // no queden fuera del borrado ni de las copias de seguridad. Solo se hace
    // una vez, y únicamente si el guardado unificado llegó a escribir.
    try {
      if (loadConversacionesIA<EstadoChat | null>(null, userId)) {
        window.localStorage.removeItem(convKey(userId));
        window.localStorage.removeItem(chatKey(userId));
      }
    } catch {
      /* sin localStorage la sesión sigue funcionando */
    }
  }, [estado, userId]);

  // Cerrar el historial con la tecla Escape.
  useEffect(() => {
    if (!historialAbierto) {
      setConfirmarBorrado(null);
      return;
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setHistorialAbierto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [historialAbierto]);

  // Auto-scroll al último mensaje cuando llega una respuesta nueva o al
  // alternar el modo pantalla completa.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [mensajes, enviando, fullscreen]);

  // Carga de fotos de inspecciones al abrir el modal.
  useEffect(() => {
    if (!modalFotos) return;
    let activo = true;
    setCargandoFotos(true);
    getRecentInspectionPhotos(userId, 15)
      .then((fotos) => {
        if (activo) setFotosInspeccion(fotos);
      })
      .catch(() => {
        if (activo) setFotosInspeccion([]);
      })
      .finally(() => {
        if (activo) setCargandoFotos(false);
      });
    return () => {
      activo = false;
    };
  }, [modalFotos, userId]);

  const gruposFotos = useMemo(() => {
    const map = new Map<string, InspectionPhotoItem[]>();
    for (const foto of fotosInspeccion) {
      const lista = map.get(foto.id) ?? [];
      lista.push(foto);
      map.set(foto.id, lista);
    }
    return Array.from(map.values());
  }, [fotosInspeccion]);

  const agregarAdjunto = (img: ImagenUI) => {
    setAdjuntos((prev) => {
      if (prev.length >= MAX_ADJUNTOS) {
        onShowToast?.(`Máximo ${MAX_ADJUNTOS} imágenes por mensaje`, undefined, 'error');
        return prev;
      }
      return [...prev, img];
    });
  };

  const elegirArchivo = async (e: ChangeEvent<HTMLInputElement>, origen: 'camara' | 'galeria') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setMenuFoto(false);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowToast?.('El archivo debe ser una imagen', undefined, 'error');
      return;
    }
    if (adjuntos.length >= MAX_ADJUNTOS) {
      onShowToast?.(`Máximo ${MAX_ADJUNTOS} imágenes por mensaje`, undefined, 'error');
      return;
    }
    try {
      const url = await procesarArchivo(file);
      agregarAdjunto({ url, esUrl: false, origen, subiendo: true });
      // Misma ruta que las fotos de inspecciones: se sube a Cloudinary y el
      // chat guarda la URL, así la foto se ve en cualquier dispositivo.
      // `url` (reducida, en base64) sigue siendo lo que se envía a la IA.
      uploadImage(file, 'asistente-ia')
        .then((urlNube) =>
          setAdjuntos((prev) =>
            prev.map((a) => (a.url === url ? { ...a, urlNube, subiendo: false } : a))
          )
        )
        .catch(() => {
          setAdjuntos((prev) => prev.map((a) => (a.url === url ? { ...a, subiendo: false } : a)));
          onShowToast?.(
            'No se pudo guardar la foto en la nube; se usará solo en este dispositivo.',
            undefined,
            'error'
          );
        });
    } catch {
      onShowToast?.('No se pudo procesar la imagen', undefined, 'error');
    }
  };

  const quitarAdjunto = (index: number) => {
    setAdjuntos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleFoto = (url: string) => {
    setSeleccionFotos((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url].slice(0, MAX_ADJUNTOS)
    );
  };

  const confirmarFotos = () => {
    if (seleccionFotos.length === 0) {
      setModalFotos(false);
      return;
    }
    const porUrl = new Map(fotosInspeccion.map((f) => [f.photoUrl, f]));
    const nuevas: ImagenUI[] = seleccionFotos.map((url) => ({
      url,
      esUrl: porUrl.get(url)?.esUrl ?? true,
      origen: 'inspeccion' as const,
    }));
    setAdjuntos((prev) => {
      const espacio = Math.max(0, MAX_ADJUNTOS - prev.length);
      const combinadas = [...prev, ...nuevas].slice(0, MAX_ADJUNTOS);
      if (nuevas.length > espacio) {
        onShowToast?.(`Solo se añadieron ${espacio} imágenes (máximo ${MAX_ADJUNTOS})`, undefined, 'error');
      }
      return combinadas;
    });
    setSeleccionFotos([]);
    setModalFotos(false);
  };

  const nuevaConversacion = () => {
    setEstado((prev) => {
      const actual = prev.conversaciones.find((c) => c.id === prev.activaId);
      // Si la conversación activa ya está vacía, no hace falta crear otra.
      if (actual && actual.mensajes.length === 0) return prev;
      const conv = crearConversacion();
      return {
        conversaciones: [conv, ...prev.conversaciones].slice(0, MAX_CONVERSACIONES),
        activaId: conv.id,
      };
    });
    setInput('');
    setAdjuntos([]);
    setExpandida(null);
    setHistorialAbierto(false);
    textareaRef.current?.focus();
  };

  const abrirConversacion = (id: string) => {
    setEstado((prev) => (prev.conversaciones.some((c) => c.id === id) ? { ...prev, activaId: id } : prev));
    setExpandida(null);
    setHistorialAbierto(false);
  };

  const eliminarConversacion = (id: string) => {
    setEstado((prev) => {
      const restantes = prev.conversaciones.filter((c) => c.id !== id);
      if (restantes.length === 0) {
        const conv = crearConversacion();
        return { conversaciones: [conv], activaId: conv.id };
      }
      return {
        conversaciones: restantes,
        activaId: prev.activaId === id ? restantes[0].id : prev.activaId,
      };
    });
  };

  const eliminarTodas = () => {
    const conv = crearConversacion();
    setEstado({ conversaciones: [conv], activaId: conv.id });
    setInput('');
    setAdjuntos([]);
    setExpandida(null);
    setConfirmarBorrado(null);
    setHistorialAbierto(false);
  };

  const usarChip = (texto: string) => {
    setInput(texto);
    textareaRef.current?.focus();
  };

  const construirSujetoId = (textoBusqueda: string): string | undefined =>
    detectarUnidadEnMensaje(textoBusqueda, hives, nuclei, fecundadores)?.id;

  const construirSujeto = (textoBusqueda: string): SujetoContexto | undefined => {
    const unidad = detectarUnidadEnMensaje(textoBusqueda, hives, nuclei, fecundadores);
    if (!unidad) return undefined;
    if (unidad.tipo === 'fecundador') {
      const f = fecundadores.find((x) => x.id === unidad.id);
      return f ? sujetoDesdeFecundador(f) : undefined;
    }
    const hive =
      unidad.tipo === 'nucleo' ? nuclei.find((h) => h.id === unidad.id) : hives.find((h) => h.id === unidad.id);
    return hive ? sujetoDesdeColmena(hive, inspections, unidad.tipo) : undefined;
  };

  const enviarMensaje = async () => {
    const texto = input.trim();
    if (enviando || (!texto && adjuntos.length === 0)) return;
    if (adjuntos.some((a) => a.subiendo)) {
      onShowToast?.('Espera un momento, se está subiendo la foto…');
      return;
    }
    if (bloqueado) {
      onShowToast?.('Límite diario alcanzado, vuelve mañana', undefined, 'error');
      return;
    }
    if (!configurado) {
      onShowToast?.('El asistente IA no está configurado todavía.', undefined, 'error');
      return;
    }

    const imagenesAdjuntas = adjuntos.slice();
    const userMsg: ChatMsg = {
      id: nuevoId(),
      rol: 'user',
      texto: texto || '(Analiza esta imagen)',
      fecha: Date.now(),
      imagenes: imagenesAdjuntas.length ? imagenesAdjuntas.map((a) => a.urlNube ?? a.url) : undefined,
    };
    const historial = [...mensajes, userMsg].slice(-MAX_MENSAJES);
    actualizarMensajes(historial);
    setInput('');
    setAdjuntos([]);
    setEnviando(true);

    try {
      const mensajesApi: MensajeChat[] = historial.map((m) => ({
        rol: m.rol,
        texto: m.texto,
        imagenes:
          m.id === userMsg.id && imagenesAdjuntas.length
            ? imagenesAdjuntas.map((a) => ({ url: a.url }))
            : undefined,
      }));

      const textoBusqueda = historial
        .filter((m) => m.rol === 'user')
        .slice(-3)
        .map((m) => m.texto)
        .join(' ');

      const apiario: ApiarioContexto = {
        nombre: apiaryName,
        ubicacion: apiaryLocation ? `${apiaryLocation} — Huaraz, 3052 msnm` : 'Huaraz, 3052 msnm',
        temporada: temporadaActual(),
      };

      const contexto = construirContextoChat({
        apiario,
        sujeto: construirSujeto(textoBusqueda),
        global: construirContextoGlobal({
          apiario,
          hives,
          nuclei,
          fecundadores,
          inspections,
          harvests,
          ...datos,
          basePrice: loadBasePrice(),
          annualGoal: loadAnnualGoal(),
          weather: loadWeatherCache(userId),
          focoId: construirSujetoId(textoBusqueda),
        }),
      });

      const resultado = await consultarChat({ mensajes: mensajesApi, contexto });
      const modelMsg: ChatMsg = {
        id: nuevoId(),
        rol: 'model',
        texto: resultado.texto,
        fecha: Date.now(),
        alerta: resultado.alerta,
      };
      actualizarMensajes((prev) => [...prev, modelMsg].slice(-MAX_MENSAJES));
      // Los administradores no consumen el límite diario.
      if (!esAdmin) setUsadas(registrarConsulta(userId));
    } catch (err) {
      const msg =
        err instanceof Error && (err.message === AI_LIMIT_ERROR || err.message === AI_BLOCKED_ERROR)
          ? err.message
          : AI_CONNECTION_ERROR;
      actualizarMensajes((prev) =>
        [
          ...prev,
          { id: nuevoId(), rol: 'model' as const, texto: msg, fecha: Date.now() },
        ].slice(-MAX_MENSAJES)
      );
      onShowToast?.(msg, undefined, 'error');
    } finally {
      setEnviando(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void enviarMensaje();
    }
  };

  // Modo normal: el asistente ocupa TODA la pantalla bajo la barra superior
  // (sin tarjeta ni márgenes, como una app de chat). Su alto se mide desde donde
  // empieza hasta el borde inferior visible, así el compositor queda pegado abajo
  // aunque cambie la barra del navegador o aparezca el teclado.
  const inlineRef = useRef<HTMLDivElement>(null);
  const [inlineH, setInlineH] = useState<number | null>(null);
  useEffect(() => {
    if (fullscreen) return;
    const medir = () => {
      const el = inlineRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const h = Math.max(320, Math.round(vh - Math.max(0, top)));
      setInlineH((prev) => (prev === h ? prev : h));
    };
    medir();
    const vv = window.visualViewport;
    window.addEventListener('resize', medir);
    vv?.addEventListener('resize', medir);
    const t = window.setTimeout(medir, 250); // tras animaciones de entrada / carga de la cabecera
    return () => {
      window.removeEventListener('resize', medir);
      vv?.removeEventListener('resize', medir);
      window.clearTimeout(t);
    };
  }, [fullscreen]);

  const chat = (
    <>
      <Cabecera
        fullscreen={fullscreen}
        esPremium={bloqueado}
        esAdmin={esAdmin}
        usadas={usadas}
        historialAbierto={historialAbierto}
        onToggleHistory={() => setHistorialAbierto((v) => !v)}
        onNueva={nuevaConversacion}
        onToggleFullscreen={onToggleFullscreen}
        onExit={onExit}
      />

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-8"
        aria-live="polite"
      >
        {mensajes.length === 0 && !enviando && <Bienvenida onChip={usarChip} />}

        <AnimatePresence initial={false}>
          {mensajes.map((m) => (
            <Burbuja key={m.id} mensaje={m} expandida={expandida} setExpandida={setExpandida} />
          ))}
        </AnimatePresence>

        {enviando && <IndicadorEscritura />}
      </div>

      <Compositor
        input={input}
        setInput={setInput}
        adjuntos={adjuntos}
        enviando={enviando}
        bloqueado={bloqueado}
        menuFoto={menuFoto}
        setMenuFoto={setMenuFoto}
        onQuitarAdjunto={quitarAdjunto}
        onChip={usarChip}
        onKeyDown={onKeyDown}
        onEnviar={() => void enviarMensaje()}
        onCamara={() => camaraRef.current?.click()}
        onGaleria={() => galeriaRef.current?.click()}
        onAbrirFotos={() => {
          setSeleccionFotos([]);
          setModalFotos(true);
        }}
        textareaRef={textareaRef}
        conChips={mensajes.length > 0}
      />

      <p className="shrink-0 border-t border-line px-4 py-1.5 text-center text-[10px] leading-tight text-husk/80">
        ⚠️ Recomendaciones orientativas. Consulta con un apicultor experto.
      </p>

      {/* Historial de conversaciones (menú hamburguesa, estilo Claude). */}
      <AnimatePresence>
        {historialAbierto && (
          <motion.div
            className="absolute inset-0 z-40 flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full w-72 max-w-[82%] flex-col border-r border-line bg-pane2"
              role="dialog"
              aria-modal="true"
              aria-label="Historial de conversaciones"
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="flex items-center gap-2 font-display text-sm font-bold text-cream">
                  <IconMenu className="h-4 w-4 text-honey" />
                  Conversaciones
                </span>
                <button
                  type="button"
                  onClick={() => setHistorialAbierto(false)}
                  aria-label="Cerrar historial"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-cream transition-colors hover:border-coral hover:text-coral"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              <div className="px-3 py-3">
                <button
                  type="button"
                  onClick={nuevaConversacion}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-honey/50 bg-honey/10 px-3 py-2.5 text-sm font-semibold text-honey transition-colors hover:bg-honey/20"
                >
                  <span aria-hidden className="text-base leading-none">＋</span>
                  Nueva conversación
                </button>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                {conversacionesOrdenadas.map((conv) => {
                  const esActiva = conv.id === activaId;
                  return (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
                        esActiva ? 'bg-honey/10 ring-1 ring-honey/30' : 'hover:bg-ink/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => abrirConversacion(conv.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span
                          className={`block truncate text-sm font-medium ${
                            esActiva ? 'text-honey' : 'text-cream'
                          }`}
                        >
                          {conv.titulo}
                        </span>
                        <span className="block font-mono text-[10px] text-husk">
                          {fechaCorta(conv.actualizada)} · {conv.mensajes.length} mensajes
                        </span>
                      </button>
                      {confirmarBorrado === conv.id ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              eliminarConversacion(conv.id);
                              setConfirmarBorrado(null);
                            }}
                            className="rounded-md bg-coral/15 px-2 py-1 text-[11px] font-semibold text-coral transition-colors hover:bg-coral/25"
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmarBorrado(null)}
                            className="rounded-md px-2 py-1 text-[11px] text-husk transition-colors hover:text-cream"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmarBorrado(conv.id)}
                          aria-label={`Eliminar conversación ${conv.titulo}`}
                          title="Eliminar"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-husk transition-colors hover:bg-coral/10 hover:text-coral"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-line px-3 py-3">
                {confirmarBorrado === 'todas' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-husk">
                      Se borrarán todas tus conversaciones, también de la nube. No se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={eliminarTodas}
                        className="flex-1 rounded-lg bg-coral/15 px-3 py-2 text-xs font-semibold text-coral transition-colors hover:bg-coral/25"
                      >
                        Sí, eliminar todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmarBorrado(null)}
                        className="rounded-lg border border-line px-3 py-2 text-xs text-cream transition-colors hover:border-honey/50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmarBorrado('todas')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-husk transition-colors hover:bg-coral/10 hover:text-coral"
                  >
                    <IconTrash className="h-4 w-4" />
                    Eliminar todas las conversaciones
                  </button>
                )}
              </div>
            </motion.aside>

            <div
              className="flex-1 bg-black/50"
              onClick={() => setHistorialAbierto(false)}
              aria-hidden
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <AnimatePresence initial={false} mode="wait">
        {fullscreen ? (
          <motion.div
            key="ia-full"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[9999] flex flex-col bg-ink"
          >
            {chat}
          </motion.div>
        ) : (
          <motion.div
            key="ia-inline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            ref={inlineRef}
            style={{ height: inlineH ?? 'calc(100dvh - 4.5rem)' }}
            className="relative -mx-4 -mb-10 -mt-6 flex flex-col overflow-hidden border-t border-line/60 bg-ink/35 backdrop-blur-[2px] sm:-mx-6 sm:-mt-8 md:-mt-10 lg:-mx-12 xl:-mx-16"
          >
            {chat}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inputs ocultos de cámara/galería */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void elegirArchivo(e, 'camara')}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void elegirArchivo(e, 'galeria')}
      />

      {/* Modal de selección de fotos de inspecciones */}
      <AnimatePresence>
        {modalFotos && (
          <motion.div
            className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setModalFotos(false)}
              aria-hidden
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="card relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-b-none sm:rounded-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Fotos de inspecciones"
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="font-display text-base font-bold text-cream">Fotos de inspecciones</p>
                <button
                  type="button"
                  onClick={() => setModalFotos(false)}
                  aria-label="Cerrar"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-cream transition-colors hover:border-coral hover:text-coral"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {cargandoFotos ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-sm text-husk">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-honey/30 border-t-honey" />
                    Cargando inspecciones…
                  </div>
                ) : gruposFotos.length === 0 ? (
                  <p className="py-10 text-center text-sm text-husk">
                    No hay inspecciones con fotos registradas todavía.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {gruposFotos.map((grupo) => (
                      <div key={grupo[0].id} className="rounded-xl border border-line bg-ink/40 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-cream">
                            {grupo[0].unidadNombre} · {etiquetaTipo(grupo[0].unidadTipo)}
                          </span>
                          <span className="font-mono text-[11px] text-husk">
                            {fechaFotos(grupo[0].fecha)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                          {grupo.map((foto, i) => {
                            const activa = seleccionFotos.includes(foto.photoUrl);
                            return (
                              <button
                                key={`${foto.photoUrl}-${i}`}
                                type="button"
                                onClick={() => toggleFoto(foto.photoUrl)}
                                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                                  activa ? 'border-honey' : 'border-transparent hover:border-honey/50'
                                }`}
                              >
                                <img
                                  src={foto.photoUrl}
                                  alt={`Inspección ${foto.unidadNombre}`}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                                {activa && (
                                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-honey text-[11px] font-bold text-ink">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                <span className="text-xs text-husk">
                  {seleccionFotos.length}/{MAX_ADJUNTOS} seleccionadas
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalFotos(false)}
                    className="rounded-xl border border-line bg-ink px-4 py-2 text-sm font-semibold text-cream transition-colors hover:border-honey/50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarFotos}
                    disabled={seleccionFotos.length === 0}
                    className="rounded-xl bg-honey px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-honeysoft disabled:opacity-50"
                  >
                    Seleccionar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- subcomponentes ---------- */

const IconArrowLeft = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const IconExpand = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const IconCompress = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

const IconMenu = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

function Cabecera({
  historialAbierto,
  onToggleHistory,
  onNueva,
}: {
  fullscreen: boolean;
  esPremium: boolean;
  esAdmin: boolean;
  usadas: number;
  historialAbierto: boolean;
  onToggleHistory: () => void;
  onNueva: () => void;
  onToggleFullscreen?: () => void;
  onExit?: () => void;
}) {
  const botonMenu = (
    <button
      type="button"
      onClick={onToggleHistory}
      title="Historial de conversaciones"
      aria-label="Historial de conversaciones"
      aria-expanded={historialAbierto}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
        historialAbierto
          ? 'border-honey/60 bg-honey/10 text-honey'
          : 'border-line bg-ink text-cream hover:border-honey/50 hover:text-honey'
      }`}
    >
      <IconMenu className="h-4 w-4" />
    </button>
  );

  const botonNueva = (
    <button
      type="button"
      onClick={onNueva}
      title="Nueva conversación"
      aria-label="Nueva conversación"
      className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-ink px-2.5 text-xs font-semibold text-cream transition-colors hover:border-honey/50 hover:text-honey"
    >
      <span aria-hidden className="text-base leading-none">＋</span>
      <span className="hidden md:inline">Nueva</span>
    </button>
  );

  return (
    <div className="shrink-0 border-b border-line">
      <div className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        {botonMenu}
        <Logo variant="icon" className="h-9 w-9 shrink-0" />
        <h2 className="min-w-0 flex-1 truncate font-display text-base font-bold tracking-tight text-cream sm:text-lg">
          Asistente Apícola IA
        </h2>
        {botonNueva}
      </div>
    </div>
  );
}

function Compositor({
  input,
  setInput,
  adjuntos,
  enviando,
  bloqueado,
  menuFoto,
  setMenuFoto,
  onQuitarAdjunto,
  onChip,
  onKeyDown,
  onEnviar,
  onCamara,
  onGaleria,
  onAbrirFotos,
  textareaRef,
  conChips,
}: {
  input: string;
  setInput: (v: string) => void;
  adjuntos: ImagenUI[];
  enviando: boolean;
  bloqueado: boolean;
  menuFoto: boolean;
  setMenuFoto: (v: boolean) => void;
  onQuitarAdjunto: (i: number) => void;
  onChip: (texto: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onEnviar: () => void;
  onCamara: () => void;
  onGaleria: () => void;
  onAbrirFotos: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  /** Los chips pequeños solo se muestran una vez iniciada la conversación
   *  (en el estado vacío ya aparecen como botones grandes y centrados). */
  conChips: boolean;
}) {
  return (
    <div className="shrink-0 border-t border-line bg-pane/70 px-3 py-2.5 sm:px-5 sm:py-3">
      {adjuntos.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {adjuntos.map((img, i) => (
            <div key={`${img.url}-${i}`} className="relative">
              <img
                src={img.url}
                alt={`Adjunto ${i + 1}`}
                className={`h-16 w-16 rounded-lg border border-line object-cover ${
                  img.subiendo ? 'opacity-60' : ''
                }`}
              />
              {img.subiendo && (
                <span
                  aria-label="Subiendo foto"
                  className="absolute inset-0 m-auto h-5 w-5 animate-spin rounded-full border-2 border-honey border-t-transparent"
                />
              )}
              <button
                type="button"
                onClick={() => onQuitarAdjunto(i)}
                aria-label="Quitar imagen"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-ink text-cream transition-colors hover:border-coral hover:text-coral"
              >
                <IconX className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chips de funciones rápidas: una fila horizontal con scroll (solo con
          conversación iniciada, para no duplicar los del estado vacío). */}
      {conChips && (
        <div className="mb-2.5 flex flex-wrap gap-1.5 pb-1 sm:flex-nowrap sm:overflow-x-auto">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onChip(chip.texto)}
              disabled={enviando || bloqueado}
              className="shrink-0 whitespace-nowrap rounded-full border border-line bg-ink/60 px-3 py-1 text-xs font-medium text-husk transition-colors hover:border-honey/50 hover:text-honey disabled:opacity-50"
            >
              <span aria-hidden>{chip.emoji}</span> {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuFoto(!menuFoto)}
            disabled={enviando || bloqueado}
            aria-label="Adjuntar imagen"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink text-lg transition-colors hover:border-honey/50 disabled:opacity-50"
          >
            📷
          </button>
          <AnimatePresence>
            {menuFoto && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-14 left-0 z-20 w-48 overflow-hidden rounded-xl border border-line bg-pane2 shadow-xl"
              >
                <button
                  type="button"
                  onClick={onCamara}
                  className="block w-full px-4 py-3 text-left text-sm text-cream transition-colors hover:bg-ink/60"
                >
                  📷 Tomar foto
                </button>
                <button
                  type="button"
                  onClick={onGaleria}
                  className="block w-full border-t border-line px-4 py-3 text-left text-sm text-cream transition-colors hover:bg-ink/60"
                >
                  🖼️ Subir desde galería
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={onAbrirFotos}
          disabled={enviando || bloqueado}
          className="flex h-11 items-center gap-1.5 rounded-xl border border-line bg-ink px-3 text-sm font-semibold text-cream transition-colors hover:border-honey/50 hover:text-honey disabled:opacity-50"
        >
          <span aria-hidden>📁</span>
          <span className="hidden sm:inline">Fotos de inspecciones</span>
          <span className="sm:hidden">Fotos</span>
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={2000}
          placeholder="Pregunta sobre tus colmenas"
          className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-line/70 bg-ink px-3.5 py-3 text-[13px] sm:px-4 sm:text-sm text-cream placeholder:text-husk/50 outline-none transition-colors focus:border-honey/70"
        />

        <button
          type="button"
          onClick={onEnviar}
          disabled={
            enviando || bloqueado || adjuntos.some((a) => a.subiendo) || (!input.trim() && adjuntos.length === 0)
          }
          aria-label="Enviar mensaje"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey text-lg text-ink transition-colors hover:bg-honeysoft disabled:cursor-not-allowed disabled:opacity-50"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

function Bienvenida({ onChip }: { onChip: (texto: string) => void }) {
  const chips: ReactNode = CHIPS.map((chip) => (
    <button
      key={`w-${chip.label}`}
      type="button"
      onClick={() => onChip(chip.texto)}
      className="rounded-full border border-line bg-ink/60 px-3.5 py-2 text-xs font-medium text-husk transition-colors hover:border-honey/50 hover:text-honey sm:px-4 sm:py-2.5 sm:text-sm"
    >
      <span aria-hidden>{chip.emoji}</span> {chip.label}
    </button>
  ));
  return (
    <div className="flex flex-col items-center gap-4 px-2 py-8 text-center sm:py-10">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-honey/40 bg-honey/10 text-2xl">
        🐝
      </span>
      <div>
        <p className="font-display text-lg font-bold text-cream">¿En qué te ayudo hoy?</p>
        <p className="mt-1 max-w-md text-sm text-husk">
          Pregúntame sobre cualquier colmena (por ejemplo «C-01») o sobre apicultura en general.
          También puedes adjuntar una foto de una inspección para analizarla.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">{chips}</div>
    </div>
  );
}

function Burbuja({
  mensaje,
  expandida,
  setExpandida,
}: {
  mensaje: ChatMsg;
  expandida: string | null;
  setExpandida: (id: string | null) => void;
}) {
  const esUsuario = mensaje.rol === 'user';
  const abierta = expandida === mensaje.id;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      className={`flex flex-col ${esUsuario ? 'items-end' : 'items-start'}`}
    >
      {mensaje.imagenes && mensaje.imagenes.length > 0 && (
        <div className={`mb-1.5 flex flex-wrap gap-2 ${esUsuario ? 'justify-end' : 'justify-start'}`}>
          {mensaje.imagenes.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setExpandida(abierta ? null : mensaje.id)}
              className="overflow-hidden rounded-xl border border-line"
            >
              <img src={url} alt={`Adjunto ${i + 1}`} className="h-24 w-24 object-cover" />
            </button>
          ))}
        </div>
      )}

      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%] ${
          esUsuario
            ? 'rounded-br-md bg-honey text-ink'
            : 'rounded-bl-md bg-pane2 text-cream'
        }`}
      >
        {mensaje.alerta && !esUsuario && (
          <span className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-red-500/50 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-200">
            <span aria-hidden>⚠️</span> Alerta crítica
          </span>
        )}
        {esUsuario ? (
          <p className="whitespace-pre-wrap">{mensaje.texto}</p>
        ) : (
          <ChatMarkdown
            texto={mensaje.texto.replace(/^\**ALERTA\s*:\s*(?:S[ÍIií]|NO)\**[ \t]*\n*/iu, '')}
          />
        )}
      </div>

      <span className="mt-1 px-1 font-mono text-[10px] text-husk/80">
        {esUsuario ? 'Tú' : 'Asistente'} · {horaCorta(mensaje.fecha)}
      </span>

      {abierta && mensaje.imagenes && mensaje.imagenes.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {mensaje.imagenes.map((url, i) => (
            <img
              key={`z-${url}-${i}`}
              src={url}
              alt={`Adjunto ampliado ${i + 1}`}
              className="max-h-72 rounded-lg border border-line object-contain"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function IndicadorEscritura() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2"
    >
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-pane2 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-honey" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-honey" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-honey" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="font-mono text-[11px] text-husk">IA escribiendo…</span>
    </motion.div>
  );
}
