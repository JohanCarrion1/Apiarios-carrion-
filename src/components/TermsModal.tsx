/**
 * MODAL DE TÉRMINOS del post-login (overlay sobre /seleccionar).
 *
 * Antes era un "paso 1" a pantalla completa; ahora es un overlay: la pantalla
 * de selección de módulos se monta DEBAJO, así que el usuario ve a dónde va a
 * entrar mientras acepta, en vez de un formulario que oculta el destino.
 *
 * Es bloqueante a propósito (`modal` + backdrop sin `onClick` de cierre): sin
 * la aceptación no se puede entrar. Por eso NO hay botón de cerrar ni Escape
 * —salir sin aceptar dejaría al usuario en un bucle de reintentos— y en su
 * lugar sigue disponible el "Cerrar sesión" del header, que por eso vive por
 * encima del overlay (z-index superior en SelectionScreen).
 *
 * Los tres documentos se abren EN SUPERPOSICIÓN sobre este mismo modal
 * (`LegalDocViewer`), sin navegar. Antes eran enlaces de ruta: eso desmontaba
 * SelectionScreen y el modal entero, y al volver el usuario encontraba el
 * formulario desde cero con un parpadeo de pantalla. Ahora este componente no
 * se desmonta nunca, así que las casillas sobreviven por sí solas; el estado a
 * nivel de módulo (`aceptadosEnCurso`) queda como red de seguridad.
 */
import { useEffect, useMemo, useState } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { motion, AnimatePresence } from "framer-motion";
import LegalDocViewer, {
  type LegalDocId,
} from "../content/legal/LegalDocViewer";
import Logo from "./Logo";

/* Estado de las casillas a NIVEL DE MÓDULO.
 *
 * Con el visor en superposición el modal ya no se desmonta al leer un
 * documento, así que un `useState` normal bastaría. Se mantiene esta variable
 * como red de seguridad: si SelectionScreen se desmonta por cualquier otra
 * causa (un refresco de la ruta, un remontaje del árbol), el usuario no
 * encuentra las casillas en cero.
 *
 * Se reinicia (`resetAceptados`) al aceptar de verdad, para que una
 * re-aceptación empiece limpia. */
let aceptadosEnCurso: Record<DocId, boolean> = {
  privacidad: false,
  cookies: false,
  terminos: false,
};

const resetAceptados = () => {
  aceptadosEnCurso = { privacidad: false, cookies: false, terminos: false };
};

/* Los tres documentos. `resumen` es el texto bajo el título del checkbox.
   No llevan `to`: ya no se navega a una ruta, el documento se pinta en la
   superposición de LegalDocViewer. */
const DOCS = [
  {
    id: "privacidad",
    label: "Política de Privacidad",
    resumen: "Qué datos guardamos y para qué",
    emoji: "🔒",
  },
  {
    id: "cookies",
    label: "Política de Cookies",
    resumen: "Qué guardamos en tu navegador",
    emoji: "🍪",
  },
  {
    id: "terminos",
    label: "Términos y Condiciones",
    resumen: "Pedidos, envíos y garantía",
    emoji: "📄",
  },
] as const;

type DocId = (typeof DOCS)[number]["id"];

export default function TermsModal({
  nombre,
  onContinue,
  guardando,
}: {
  nombre: string;
  onContinue: () => void;
  /** El guardado en Firestore está en vuelo: el botón se bloquea para que no
      se pueda avanzar dos veces ni desmontar el modal a mitad de la escritura. */
  guardando?: boolean;
}) {
  /* El fondo no debe hacer scroll con el modal abierto: en móvil, el rubber
     band del overlay arrastraría la pantalla de selección de detrás. Es el
     mismo hook que usan los drawers y modales del resto de la app. */
  useScrollLock(true);
  // Un estado por documento para que el usuario pueda revisar el que quiera y
  // volver: nada de "marcar todo de golpe", que es justo lo que vacía de
  // sentido el consentimiento.
  const [aceptados, setAceptados] = useState<Record<DocId, boolean>>(() => ({
    ...aceptadosEnCurso,
  }));

  // Cada cambio se refleja en la variable de módulo (red de seguridad).
  useEffect(() => {
    aceptadosEnCurso = { ...aceptados };
  }, [aceptados]);

  /* Documento abierto en superposición, o null si no hay ninguno. Vive aquí
     dentro y no en una ruta: es una vista efímera del modal, no una pantalla
     de la aplicación. Por eso no genera entrada de historial. */
  const [docAbierto, setDocAbierto] = useState<LegalDocId | null>(null);

  const todos = useMemo(() => DOCS.every((d) => aceptados[d.id]), [aceptados]);
  const faltan = DOCS.filter((d) => !aceptados[d.id]).length;

  const toggle = (id: DocId) =>
    setAceptados((prev) => ({ ...prev, [id]: !prev[id] }));

  /* Aceptar es el final del flujo: el modal se desmonta y la aceptación queda
     persistida en Firestore/localStorage, así que el estado de casillas en
     curso ya no sirve y se limpia para no arrastrar marcas a una re-aceptación
     futura. */
  const handleContinuar = () => {
    resetAceptados();
    onContinue();
  };

  return (
    /* `role="dialog"` + `aria-modal`: las cards de detrás siguen en el DOM
       pero quedan fuera del árbol de accesibilidad, así que un lector de
       pantalla no ofrece al usuario botones que no puede pulsar. */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aceptación de términos y políticas"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-[4px] sm:items-center sm:p-6"
    >
      {/* `role="presentation"`: el backdrop es decorativo y NO cierra el modal
          (es bloqueante). El clic se ignora en vez de propagarse a la card. */}
      <div
        role="presentation"
        className="flex min-h-full w-full items-center justify-center"
      >
        {/* La card es la superficie con scroll: `max-h-[92dvh]` en vez de
            `max-h-[92vh]` porque en iOS `vh` no descuenta la barra de
            direcciones y el botón "Continuar" quedaba fuera de pantalla. */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="card w-full max-w-xl max-h-[92dvh] overflow-y-auto p-5 sm:p-7"
        >
          {/* Cabecera: mismo logo y mismo saludo tipográfico que el paso 2, para
          que el cambio de paso no parezca otra pantalla. */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-4 flex justify-center"
            >
              <Logo variant="horizontal" className="justify-center" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="font-display text-3xl font-black leading-tight tracking-tight text-cream sm:text-4xl"
            >
              Bienvenido, {nombre}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-husk sm:text-base"
            >
              Antes de entrar, lee y acepta los documentos que rigen el uso de
              Apiarios Carrión. Solo tienes que hacerlo una vez.
            </motion.p>
          </div>

          {/* Tres casillas */}
          <motion.ul
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="mt-8 space-y-3"
          >
            {DOCS.map((d, i) => {
              const marcado = aceptados[d.id];
              return (
                <motion.li
                  key={d.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                >
                  {/* El <label> cubre SOLO el checkbox y su texto, y se asocia al
                    input por `htmlFor`/`id` en vez de envolverlo. Es lo que
                    permite que el enlace de abajo quede FUERA del label: dentro
                    de un label, el clic en el enlace dispara además la
                    activación del control, así que abrir el documento marcaba
                    la casilla como efecto secundario. Consentir no puede ser un
                    clic accidental. */}
                  <label
                    htmlFor={`doc-${d.id}`}
                    className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-200 sm:p-5 ${
                      marcado
                        ? "border-honey/50 bg-honey/5"
                        : "border-line bg-pane/60 hover:border-honey/35 hover:bg-pane"
                    }`}
                  >
                    {/* Input real: necesario para teclado y lectores de pantalla.
                      Se oculta con `appearance-none` porque el check nativo se ve
                      distinto en cada navegador (mismo problema que el ☰) y no
                      admite el color de marca de forma fiable. */}
                    <input
                      id={`doc-${d.id}`}
                      type="checkbox"
                      checked={marcado}
                      onChange={() => toggle(d.id)}
                      className="terms-check mt-0.5 h-6 w-6 flex-shrink-0 cursor-pointer"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          aria-hidden="true"
                          className="text-base leading-none"
                        >
                          {d.emoji}
                        </span>
                        <span className="text-sm font-semibold text-cream sm:text-base">
                          {d.label}
                        </span>
                        {marcado && (
                          <motion.span
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="rounded-full bg-honey/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-honey"
                          >
                            Aceptado
                          </motion.span>
                        )}
                      </span>

                      <span className="mt-1 block text-xs leading-relaxed text-husk">
                        {d.resumen}.
                      </span>
                    </span>
                  </label>

                  {/* Fuera del <label>: "Leer documento" y "marcar la casilla"
                    son dos acciones distintas. El margen-before lo desalinea
                    del título a propósito, como enlace de apoyo.

                    Es un <button>, no un <Link>: abre el documento en
                    superposición (`docAbierto`) en vez de navegar. Así el modal
                    no se desmonta y el usuario vuelve a encontrar el formulario
                    con sus casillas intactas. */}
                  <button
                    type="button"
                    onClick={() => setDocAbierto(d.id)}
                    aria-haspopup="dialog"
                    className="mt-2 ml-10 inline-flex items-center gap-1.5 text-xs font-semibold text-honey underline-offset-4 transition-colors hover:text-honeysoft hover:underline"
                  >
                    Leer documento
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 5v14M5 12h14"
                      />
                    </svg>
                    <span className="sr-only">{`${d.label} (se abre sobre este formulario)`}</span>
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>

          {/* Continuar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62 }}
            className="mt-8"
          >
            <motion.button
              type="button"
              onClick={handleContinuar}
              disabled={!todos || guardando}
              whileHover={todos && !guardando ? { scale: 1.02 } : undefined}
              whileTap={todos && !guardando ? { scale: 0.98 } : undefined}
              className="w-full rounded-xl bg-honey py-3.5 font-bold text-ink transition-all duration-200 hover:bg-honeysoft hover:shadow-[0_8px_30px_rgba(240,164,28,.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-line disabled:text-husk disabled:shadow-none"
            >
              {guardando
                ? "Guardando…"
                : todos
                  ? "Continuar"
                  : `Acepta los ${faltan} documento${faltan === 1 ? "" : "s"} para continuar`}
            </motion.button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-husk/70">
              Podrás volver a consultar estos documentos desde la pantalla de
              selección en cualquier momento.
            </p>
          </motion.div>
        </motion.div>

        {/* Superposición del documento, DENTRO de este overlay (`absolute`
            respecto a él) y por encima de la card. Va después en el DOM para
            que quede por encima sin peleas de z-index. */}
        <AnimatePresence>
          {docAbierto && (
            <LegalDocViewer
              doc={docAbierto}
              onClose={() => setDocAbierto(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
