import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppLogo from '../components/AppLogo';

// ============================================================
// Estructura común de las páginas legales (privacidad, cookies,
// términos). Fondo oscuro, tarjetas ámbar/marrón y navegación
// entre las tres políticas + volver a la tienda.
// ============================================================

const LEGAL_NAV = [
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/cookies', label: 'Cookies' },
  { to: '/terminos', label: 'Términos' },
] as const;

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
  const { pathname } = useLocation();

  return (
    <div className="relative min-h-screen bg-ink text-cream">
      {/* Fondo hexagonal sutil */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <svg className="h-full w-full opacity-[0.05]">
          <defs>
            <pattern id="legal-hexes" width="50" height="87" patternUnits="userSpaceOnUse" patternTransform="scale(1.6)">
              <path d="M25 7.5 43.3 18.5v22L25 51.5 6.7 40.5v-22Z" fill="none" stroke="#f0a41c" strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#legal-hexes)" />
        </svg>
      </div>

      <div className="relative z-10">
        {/* Barra superior */}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-5">
          <Link
            to="/privacidad"
            className="flex items-center gap-2"
            aria-label="Apiarios Carrión - inicio legal"
          >
            <AppLogo size="sm" />
            <span className="font-display text-sm font-black tracking-tight text-cream">
              Apiarios <em className="text-honey">Carrión</em>
            </span>
          </Link>
          <Link
            to="/tienda"
            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-husk transition-colors hover:border-honey/60 hover:text-honey"
          >
            ← Volver a la tienda
          </Link>
        </div>

        {/* Encabezado de la página */}
        <header className="mx-auto max-w-3xl px-4 pt-8 pb-6 text-center sm:pt-12">
          <p className="tick-label mb-3 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-honey/60" />
            {badge}
            <span className="h-px w-8 bg-honey/60" />
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-xs text-husk">Última actualización: {updatedAt}</p>
        </header>

        {/* Contenido */}
        <main className="mx-auto max-w-3xl space-y-5 px-4 pb-12">{children}</main>

        {/* Navegación legal */}
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 px-4 pb-6">
          {LEGAL_NAV.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-honey bg-honey text-ink'
                    : 'border-line text-husk hover:border-honey/50 hover:text-honey'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <footer className="border-t border-honey/10 bg-[#14100a]">
          <div className="mx-auto max-w-3xl px-4 py-6 text-center">
            <p className="tick-label text-[11px] text-husk/70">© 2026 Apiarios Carrión · Huaraz, Áncash — Perú</p>
          </div>
        </footer>
      </div>
    </div>
  );
}