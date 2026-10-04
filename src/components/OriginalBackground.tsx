/* ============================================================================
   OriginalBackground — fondo ORIGINAL EXACTO de /tienda (imagen 2 de referencia).
   Capas:
     1. Color base marrón muy oscuro con gradiente radial (más claro al centro).
     2. Hexágonos PEQUEÑOS y densos (50px, stroke 0.5px, ámbar, opacity 20%),
        filas ligeramente desplazadas (staggered) vía pattern SVG.
     3. Brillo central sutil (radial gradient ámbar).
     4. 3 abejas pequeñas (24px) animadas volando en trayectorias suaves.
     5. Partículas de luz/polen: puntos 3px con glow, flotando suavemente.
   Reglas: pointer-events:none · z-0 (detrás del contenido z-10) · sin imágenes.
   ============================================================================ */
export default function OriginalBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Color base con gradiente radial */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #2a1f15 0%, #1a1410 70%)',
        }}
      />

      {/* Patrón de hexágonos pequeños y densos */}
      <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse">
            <path
              d="M25 0 L50 14.4 L50 43.4 L25 57.8 L0 43.4 L0 14.4 Z"
              fill="none"
              stroke="#F5A623"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagons)" />
      </svg>

      {/* Brillo central */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(245, 166, 35, 0.08) 0%, transparent 50%)',
        }}
      />

      {/* Abejas animadas */}
      <div className="bee bee-1">🐝</div>
      <div className="bee bee-2">🐝</div>
      <div className="bee bee-3">🐝</div>

      {/* Partículas de luz */}
      <div className="particle particle-1" />
      <div className="particle particle-2" />
      <div className="particle particle-3" />
      <div className="particle particle-4" />
      <div className="particle particle-5" />
    </div>
  );
}