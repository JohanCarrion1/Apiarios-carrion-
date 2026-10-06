/**
 * Superposición interna del modal de aceptación: pinta un documento legal
 * COMPLETO sin salir de /seleccionar.
 *
 * Por qué existe: antes "Leer documento" navegaba a /privacidad, /cookies o
 * /terminos. Eso desmontaba SelectionScreen y el modal entero, así que al
 * volver el usuario encontraba el formulario desde cero y la pantalla
 * parpadeaba. Con esta superposición el modal no se desmonta nunca: las
 * casillas quedan intactas detrás y no hay navegación ni entrada de historial a
 * la que un "volver" pueda devolver al usuario a otra pantalla.
 *
 * Es una superposición y no un `LegalShell` a propósito: dentro del modal
 * solo interesa el texto, y el shell (fondo propio, cabecera, botón "← Volver",
 * footer) duplicaría el cromo de la app sobre una pantalla que ya está dentro
 * de otra superposición.
 */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { LegalSection } from "./LegalParts";
import PrivacidadContent from "./PrivacidadContent";
import CookiesContent from "./CookiesContent";
import TerminosContent from "./TerminosContent";

export type LegalDocId = "privacidad" | "cookies" | "terminos";

/** Título visible de la cabecera del visor. */
const TITULOS: Record<LegalDocId, string> = {
  privacidad: "Política de Privacidad",
  cookies: "Política de Cookies",
  terminos: "Términos y Condiciones",
};

export default function LegalDocViewer({
  doc,
  onClose,
}: {
  doc: LegalDocId;
  onClose: () => void;
}) {
  /* Al abrir y cerrar el visor el foco vuelve a algún sitio predecible.
   * Sin esto, al cerrarse quedaría el foco en un nodo que ya no existe y el
   * teclado parece muerto: el siguiente Tab empezaría por el principio del
   * documento. */
  const botonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    botonRef.current?.focus();
    // Siempre al principio: el documento se lee desde arriba, no desde donde
    // quedó la última vez que se abrió.
    scrollRef.current?.scrollTo({ top: 0 });
  }, [doc]);

  /* Escape cierra el VISOR, no el modal de aceptación. El modal es
   * bloqueante y sin salida propia; el visor sí es una vista opcional que el
   * usuario abrió para leer, así que debe poder salir sin cerrar el flujo. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      /* `absolute`, no `fixed`: es hijo del overlay del modal (`fixed inset-0
       * z-50`), así se posiciona respecto a ese contexto de apilamiento y no
       * necesita un z-index mayor: hereda el contexto de apilamiento del
       * modal y nunca puede quedar por detrás de la pantalla de selección. */
      className="absolute inset-0 z-20 flex items-start justify-center bg-ink/95 p-3 backdrop-blur-sm sm:p-5"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="card flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden"
      >
        {/* Cabecera fija dentro del visor: el documento es largo y el botón de
            volver debe estar siempre alcanzable sin volver arriba. */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-display text-base font-bold text-honey sm:text-lg">
            {TITULOS[doc]}
          </h2>
          <button
            ref={botonRef}
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-husk transition-colors hover:border-honey/60 hover:text-honey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey/60"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 12H5M12 19l-7-7 7-7"
              />
            </svg>
            Volver
          </button>
        </div>

        {/* El documento hace scroll aquí dentro. Sin esto el texto se
            desbordaría por detrás de la cabecera y el botón quedaría
            inalcanzable en móvil. */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
        >
          {doc === "privacidad" && <PrivacidadContent />}
          {doc === "cookies" && <CookiesContent />}
          {doc === "terminos" && <TerminosContent />}

          {/* Pie del visor: cierra explícitamente sin marcar la casilla. Marcar
              es una decisión aparte y explícita, nunca un efecto secundario de
              cerrar el documento. */}
          <LegalSection title="¿Volver a los documentos?">
            <p>
              Al cerrar este documento no se marca ninguna casilla. Si ya lo
              leíste, vuelve al formulario y acepta{" "}
              <strong className="text-cream">{TITULOS[doc]}</strong> de forma
              explícita.
            </p>
          </LegalSection>
        </div>
      </motion.div>
    </motion.div>
  );
}
