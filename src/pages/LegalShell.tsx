import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLogo from '../components/AppLogo';

// ============================================================
// Estructura común de las páginas legales (privacidad, cookies,
// términos). Fondo oscuro, tarjetas ámbar/marrón y un único
// botón "← Volver" arriba a la derecha.
//
// Cada documento es independiente: no hay navegación cruzada entre ellos.
// Antes había una fila de pills (Privacidad / Cookies / Términos) que se
// quitó porque convertía la consulta de un documento en una cadena de
// páginas y, además, rompía el retroceso: cada pill añadía una entrada al
// historial, así que "← Volver" acababa en otro documento en lugar de
// volver al post-login.
//
// ============================================================

export default function LegalShell({
  title,
  badge,
  updatedAt,
  children,
}: {
  title: string;
  badge: string;
  updatedAt: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  /* Destino de emergencia. El post-login es el único sitio desde el que se
     llega aquí durante la aceptación de términos, así que el fallback apunta
     ahí y NUNCA a /tienda: mandar a la tienda sacaría al usuario del flujo a
     mitad de los checkboxes. */
  const FALLBACK = '/seleccionar';

  /* El documento se abre en la MISMA pestaña (el enlace del modal ya no lleva
     `target="_blank"`), de modo que aquí sí hay una entrada de historial
     anterior y `navigate(-1)` es fiable: devuelve a /seleccionar con el modal
     abierto y los checkboxes tal como quedaron.

     Antes el enlace abría una pestaña nueva, y ahí `navigate(-1)` no tenía a
     dónde volver (historial de longitud 1) y `window.close()` dependía de que
     el navegador concediera el cierre. Por eso el botón se quedaba sin hacer
     nada útil.

     El fallback cubre el único caso en que no hay historial: que el usuario
     entre directo por URL oPulse el botón del navegador al llegar. */
  const handleVolver = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(FALLBACK, { replace: true });
  };

  return (
    <div className="relative min-h-screen bg-ink text-cream">
      {/* Fondo hexagonal sutil */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <svg className="h-full w-full opacity-[0.05]">
          <defs>
            <pattern id="legal-hexes" width="50" height="87" patternUnits="userSpaceOnUse" patternTransform="scale(1.6)">
              <path d="M25 7.5 43.3 18.5v22L25 51.5 6.7 40.5v-22Z" fill="none" stroke="#ffa90a" strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#legal-hexes)" />
        </svg>
      </div>

      <div className="relative z-10">
        {/* Barra superior */}
        <div className="flex w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-12 xl:px-16 pt-5">
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="Apiarios Carrión - inicio"
          >
            <AppLogo size="sm" />
            <span className="font-display text-sm font-black tracking-tight text-cream">
              Apiarios <em className="text-honey">Carrión</em>
            </span>
          </Link>
          <button
            type="button"
            onClick={handleVolver}
            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-husk transition-colors hover:border-honey/60 hover:text-honey"
          >
            ← Volver
          </button>
        </div>

        {/* Encabezado de la página */}
        <header className="w-full px-4 sm:px-6 lg:px-12 xl:px-16 pt-8 pb-6 text-center sm:pt-12">
          <p className="tick-label mb-3 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-honey/60" />
            {badge}
            <span className="h-px w-8 bg-honey/60" />
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-xs text-husk">Última actualización: {updatedAt}</p>
        </header>

        {/* Contenido */}
        <main className="w-full space-y-5 px-4 sm:px-6 lg:px-12 xl:px-16 pb-12">{children}</main>

        {/* Footer */}
        <footer className="border-t border-honey/10 bg-[#14100a]">
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-16 py-6 text-center">
            <p className="tick-label text-[11px] text-husk/70">© 2026 Apiarios Carrión · Huaraz, Áncash — Perú</p>
          </div>
        </footer>
      </div>
    </div>
  );
}