interface LogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'horizontal' | 'compact-inline';
  className?: string;
  /** Nombre comercial del cliente (aparece en las variantes con texto). */
  label?: string;
  /** URL de un logo personalizado (reemplaza el ícono de abeja si se indica). */
  logoUrl?: string;
  /** Lema/tagline bajo el nombre (variante full). */
  tagline?: string;
}

const DEFAULT_LABEL = 'Apiarios Carrión';

/** Divide el nombre en dos líneas equilibradas para el texto del logo. */
function splitLabelWords(label: string): [string, string] {
  const words = (label || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words[0] || '', ''];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}

export default function Logo({ variant = 'compact', className = '', label, logoUrl, tagline }: LogoProps) {
  const companyLabel = (label || DEFAULT_LABEL).trim();
  const [nameLine1, nameLine2] = splitLabelWords(companyLabel);

  if (variant === 'full') {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 400 250" 
        className={className}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="oro-full" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F3D78C"/>
            <stop offset=".5" stopColor="#D9A94F"/>
            <stop offset="1" stopColor="#A97A25"/>
          </linearGradient>
        </defs>
        <g transform="translate(140,0)" fill="none" stroke="url(#oro-full)" strokeLinecap="round" strokeLinejoin="round">
          <path strokeWidth="5" d="M62 38 L28 12 L35 41 Z"/>
          <path strokeWidth="5" d="M59 47 L20 34 L33 53 Z"/>
          <path strokeWidth="4.5" d="M60 55 L28 58 L41 67 Z"/>
          <path strokeWidth="5" d="M62 36 L76 31 L84 44 L76 56 L62 56 L56 46 Z"/>
          <path strokeWidth="5" d="M82 28 Q94 25 96 37 Q97 46 87 48 Q80 49 79 40 Q78 32 82 28 Z"/>
          <path strokeWidth="4.5" d="M86 25 L92 15"/>
          <path strokeWidth="4.5" d="M93 27 L101 19"/>
          <path strokeWidth="5" d="M58 58 Q47 68 49 84 L51 95 Q64 85 66 69 L66 60"/>
          <path strokeWidth="4" d="M52 70 L65 68"/>
          <path strokeWidth="4" d="M51 78 L63 76"/>
          <path strokeWidth="4" d="M53 86 L60 84"/>
          <path strokeWidth="6.5" d="M106 68 A16 16 0 1 0 106 90"/>
          <path strokeWidth="5" d="M80 96 L73 110"/>
          <path strokeWidth="5" d="M87 101 L93 110"/>
        </g>
        <text x="200" y="172" textAnchor="middle" fill="url(#oro-full)" fontFamily="Cormorant Garamond, Georgia, serif" fontWeight="600" fontSize="36" letterSpacing="6">{(nameLine1 || companyLabel).toUpperCase()}</text>
        <text x="200" y="208" textAnchor="middle" fill="url(#oro-full)" fontFamily="Cormorant Garamond, Georgia, serif" fontWeight="600" fontSize="36" letterSpacing="6">{nameLine2.toUpperCase()}</text>
        <text x="200" y="236" textAnchor="middle" fill="#B57E1C" fontFamily="Jost, Verdana, sans-serif" fontSize="11" letterSpacing="3">{(tagline || 'MIEL & PRODUCTOS NATURALES · HUARAZ · PERÚ').toUpperCase()}</text>
      </svg>
    );
  }

  // Versión icon - solo el ícono de la abeja (para Login)
  if (variant === 'icon') {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 120 120" 
        className={className}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="oro-icon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F3D78C"/>
            <stop offset=".5" stopColor="#D9A94F"/>
            <stop offset="1" stopColor="#A97A25"/>
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#oro-icon)" strokeLinecap="round" strokeLinejoin="round">
          {/* Alas izquierdas */}
          <path strokeWidth="4" d="M42 28 L18 8 L25 31 Z"/>
          <path strokeWidth="4" d="M39 37 L10 24 L23 43 Z"/>
          <path strokeWidth="3.5" d="M40 45 L18 48 L31 57 Z"/>
          
          {/* Cuerpo central (hexágono) */}
          <path strokeWidth="4" d="M42 26 L56 21 L64 34 L56 46 L42 46 L36 36 Z"/>
          
          {/* Cabeza */}
          <path strokeWidth="4" d="M62 18 Q74 15 76 27 Q77 36 67 38 Q60 39 59 30 Q58 22 62 18 Z"/>
          
          {/* Antenas */}
          <path strokeWidth="3.5" d="M66 15 L72 5"/>
          <path strokeWidth="3.5" d="M73 17 L81 9"/>
          
          {/* Abdomen */}
          <path strokeWidth="4" d="M38 48 Q27 58 29 74 L31 85 Q44 75 46 59 L46 50"/>
          
          {/* Líneas del abdomen */}
          <path strokeWidth="3" d="M32 60 L45 58"/>
          <path strokeWidth="3" d="M31 68 L43 66"/>
          <path strokeWidth="3" d="M33 76 L40 74"/>
          
          {/* Aguijón (arco) */}
          <path strokeWidth="5" d="M86 58 A16 16 0 1 0 86 80"/>
          
          {/* Patas */}
          <path strokeWidth="4" d="M60 86 L53 100"/>
          <path strokeWidth="4" d="M67 91 L73 100"/>
        </g>
      </svg>
    );
  }

  // Versión horizontal - ícono + texto horizontal (para SelectionScreen)
  if (variant === 'horizontal') {
    return (
      <div className={`flex flex-row items-center gap-3 ${className}`}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 120 120" 
          className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="oro-horizontal-icon" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F3D78C"/>
              <stop offset=".5" stopColor="#D9A94F"/>
              <stop offset="1" stopColor="#A97A25"/>
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#oro-horizontal-icon)" strokeLinecap="round" strokeLinejoin="round">
            <path strokeWidth="4" d="M42 28 L18 8 L25 31 Z"/>
            <path strokeWidth="4" d="M39 37 L10 24 L23 43 Z"/>
            <path strokeWidth="3.5" d="M40 45 L18 48 L31 57 Z"/>
            <path strokeWidth="4" d="M42 26 L56 21 L64 34 L56 46 L42 46 L36 36 Z"/>
            <path strokeWidth="4" d="M62 18 Q74 15 76 27 Q77 36 67 38 Q60 39 59 30 Q58 22 62 18 Z"/>
            <path strokeWidth="3.5" d="M66 15 L72 5"/>
            <path strokeWidth="3.5" d="M73 17 L81 9"/>
            <path strokeWidth="4" d="M38 48 Q27 58 29 74 L31 85 Q44 75 46 59 L46 50"/>
            <path strokeWidth="3" d="M32 60 L45 58"/>
            <path strokeWidth="3" d="M31 68 L43 66"/>
            <path strokeWidth="3" d="M33 76 L40 74"/>
            <path strokeWidth="5" d="M86 58 A16 16 0 1 0 86 80"/>
            <path strokeWidth="4" d="M60 86 L53 100"/>
            <path strokeWidth="4" d="M67 91 L73 100"/>
          </g>
        </svg>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 180 40" 
          className="h-auto w-auto max-w-[160px] sm:max-w-[200px]"
          preserveAspectRatio="xMinYMid meet"
        >
          <defs>
            <linearGradient id="oro-horizontal-text" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#F3D78C"/>
              <stop offset=".5" stopColor="#D9A94F"/>
              <stop offset="1" stopColor="#A97A25"/>
            </linearGradient>
          </defs>
          <text x="0" y="18" fill="url(#oro-horizontal-text)" fontFamily="Cormorant Garamond, Georgia, serif" fontWeight="600" fontSize="18" letterSpacing="3">{(nameLine1 || companyLabel).toUpperCase()}</text>
          <text x="0" y="38" fill="url(#oro-horizontal-text)" fontFamily="Cormorant Garamond, Georgia, serif" fontWeight="600" fontSize="18" letterSpacing="3">{nameLine2.toUpperCase()}</text>
        </svg>
      </div>
    );
  }

  // Versión compact-inline - ícono + texto corto en una línea (para header)
  if (variant === 'compact-inline') {
    return (
      <div className={`flex flex-row items-center gap-2 ${className}`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyLabel}
            className="h-8 w-auto max-w-[120px] sm:h-10 sm:max-w-[160px] object-contain flex-shrink-0"
          />
        ) : (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 120 120" 
            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
            preserveAspectRatio="xMidYMid meet"
          >
          <defs>
            <linearGradient id="oro-compact-inline" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F3D78C"/>
              <stop offset=".5" stopColor="#D9A94F"/>
              <stop offset="1" stopColor="#A97A25"/>
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#oro-compact-inline)" strokeLinecap="round" strokeLinejoin="round">
            <path strokeWidth="4" d="M42 28 L18 8 L25 31 Z"/>
            <path strokeWidth="4" d="M39 37 L10 24 L23 43 Z"/>
            <path strokeWidth="3.5" d="M40 45 L18 48 L31 57 Z"/>
            <path strokeWidth="4" d="M42 26 L56 21 L64 34 L56 46 L42 46 L36 36 Z"/>
            <path strokeWidth="4" d="M62 18 Q74 15 76 27 Q77 36 67 38 Q60 39 59 30 Q58 22 62 18 Z"/>
            <path strokeWidth="3.5" d="M66 15 L72 5"/>
            <path strokeWidth="3.5" d="M73 17 L81 9"/>
            <path strokeWidth="4" d="M38 48 Q27 58 29 74 L31 85 Q44 75 46 59 L46 50"/>
            <path strokeWidth="3" d="M32 60 L45 58"/>
            <path strokeWidth="3" d="M31 68 L43 66"/>
            <path strokeWidth="3" d="M33 76 L40 74"/>
            <path strokeWidth="5" d="M86 58 A16 16 0 1 0 86 80"/>
            <path strokeWidth="4" d="M60 86 L53 100"/>
            <path strokeWidth="4" d="M67 91 L73 100"/>
          </g>
        </svg>
        )}
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-display text-sm sm:text-base font-bold text-cream truncate">
            {companyLabel}
          </span>
        </div>
      </div>
    );
  }

  // Versión compacta - solo el ícono de la abeja (default)
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 120 120" 
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="oro-compact" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3D78C"/>
          <stop offset=".5" stopColor="#D9A94F"/>
          <stop offset="1" stopColor="#A97A25"/>
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#oro-compact)" strokeLinecap="round" strokeLinejoin="round">
        {/* Alas izquierdas */}
        <path strokeWidth="4" d="M42 28 L18 8 L25 31 Z"/>
        <path strokeWidth="4" d="M39 37 L10 24 L23 43 Z"/>
        <path strokeWidth="3.5" d="M40 45 L18 48 L31 57 Z"/>
        
        {/* Cuerpo central (hexágono) */}
        <path strokeWidth="4" d="M42 26 L56 21 L64 34 L56 46 L42 46 L36 36 Z"/>
        
        {/* Cabeza */}
        <path strokeWidth="4" d="M62 18 Q74 15 76 27 Q77 36 67 38 Q60 39 59 30 Q58 22 62 18 Z"/>
        
        {/* Antenas */}
        <path strokeWidth="3.5" d="M66 15 L72 5"/>
        <path strokeWidth="3.5" d="M73 17 L81 9"/>
        
        {/* Abdomen */}
        <path strokeWidth="4" d="M38 48 Q27 58 29 74 L31 85 Q44 75 46 59 L46 50"/>
        
        {/* Líneas del abdomen */}
        <path strokeWidth="3" d="M32 60 L45 58"/>
        <path strokeWidth="3" d="M31 68 L43 66"/>
        <path strokeWidth="3" d="M33 76 L40 74"/>
        
        {/* Aguijón (arco) */}
        <path strokeWidth="5" d="M86 58 A16 16 0 1 0 86 80"/>
        
        {/* Patas */}
        <path strokeWidth="4" d="M60 86 L53 100"/>
        <path strokeWidth="4" d="M67 91 L73 100"/>
      </g>
    </svg>
  );
}
