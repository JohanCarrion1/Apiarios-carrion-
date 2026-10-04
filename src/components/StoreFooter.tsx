import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../config';

// ============================================================
// Footer de la tienda: enlaces legales + copyright + contacto.
// Estilo: fondo oscuro, texto gris, enlaces ámbar al hover.
// ============================================================

const LEGAL_LINKS = [
  { to: '/privacidad', label: 'Política de Privacidad' },
  { to: '/cookies', label: 'Política de Cookies' },
  { to: '/terminos', label: 'Términos y Condiciones' },
] as const;

export default function StoreFooter() {
  return (
    <footer className="relative z-10 border-t border-honey/10 bg-[#14100a]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="tick-label text-[11px] tracking-wide text-husk/70">
            © 2026 Apiarios Carrión · Huaraz, Áncash — Perú
          </p>

          <nav
            aria-label="Enlaces legales"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm"
          >
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="font-medium text-husk transition-colors duration-150 hover:text-honey"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {CONTACT_EMAIL && (
          <p className="mt-4 text-center text-[11px] text-husk/50 sm:text-right">
            Contacto:{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-husk/70 underline-offset-4 transition-colors hover:text-honey hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        )}
      </div>
    </footer>
  );
}