import { useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================================
   FondoVivo — fondo animado "pura programación" para /tienda.
   Capas:
     1. Base: gradiente vertical + halo radial ámbar tenue arriba.
     2. Panal que pulsa: hexágonos 56px (línea 1px #f5a623) con una ola de
        luz que recorre el grid (delay escalonado por fila+columna).
     3. Polen dorado: canvas 2D, partículas que derivan hacia arriba con
        oscilación sinusoidal y reaparición al salir por arriba.
     4. Abejas: SVG inline volando en trayectorias curvas cerradas (SMIL
        animateMotion, rotate=auto) con aleteo de alas y blur/scale en la
        que pasa "cerca".
     5. Parallax: capas 2/3/4 se desplazan a velocidades distintas según
        scrollY (0.05 / 0.12 / 0.18) en rAF throttled, passive + transform3d.

   Reglas: pointer-events:none, z-0 (detrás de contenido z-10), sin
   backdrop-filter ni filtros pesados, 60fps en móvil (partículas y abejas
   limitadas por ancho), prefers-reduced-motion deja el panal estático y
   elimina polen + abejas. Solo se monta en /tienda.
   ============================================================================ */

const HEX_W = 56; // tamaño del hexágono (px)
const HEX_R = HEX_W / Math.sqrt(3); // circunradio (~32.3)
const HEX_H = HEX_R * 2; // alto del hexágono (~64.7)
const ROW_STEP = HEX_R * 1.5; // avance vertical entre filas (~48.5)

const hexPath = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 3;
    pts.push(`${(HEX_R * Math.cos(a)).toFixed(2)} ${(HEX_R * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts[0]} L${pts[1]} L${pts[2]} L${pts[3]} L${pts[4]} L${pts[5]} Z`;
})();

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/* ------------------------- prefers-reduced-motion ------------------------- */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/* --------------------------- Capa 2 · panal ------------------------------ */
type Hex = { x: number; y: number; d: number };

function buildHexes(vw: number, layerH: number): Hex[] {
  if (vw <= 0 || layerH <= 0) return [];
  const cols = Math.ceil(vw / HEX_W) + 1;
  const rows = Math.ceil(layerH / ROW_STEP) + 1;
  // Tope de nodos animados por rendimiento (móvil << desktop).
  const cap = vw < 768 ? 240 : vw < 1536 ? 720 : 980;
  const hexes: Hex[] = [];
  let taken = 0;
  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (taken >= cap) break outer;
      const x = c * HEX_W - HEX_W + (r % 2 ? HEX_W / 2 : 0);
      const y = r * ROW_STEP - ROW_STEP;
      // Fase diagonal fila+columna; delay negativo => la ola ya va en marcha.
      const d = ((r + c) % 24) * 0.3;
      hexes.push({ x, y, d: -d });
      taken++;
    }
  }
  return hexes;
}

/* --------------------------- Capa 4 · abejas ----------------------------- */
type Bee = {
  dur: number;
  path: string;
  left: number;
  top: number;
  scale: number;
  blur: boolean;
  opacity: number;
};

const BEE_PATHS = [
  'M95 40 C 148 12 182 52 152 92 C 124 128 66 122 36 100 C 8 78 42 36 95 40 Z',
  'M58 66 C 30 28 152 8 162 54 C 172 96 104 124 58 96 C 24 74 88 100 58 66 Z',
  'M95 44 C 176 18 178 92 95 102 C 14 112 14 36 95 44 Z',
  'M95 30 C 172 48 162 112 95 106 C 30 112 22 42 95 30 Z',
  'M70 70 C 122 8 186 56 150 96 C 120 130 46 122 24 80 C 8 48 44 24 70 70 Z',
];
const BEE_DURS = [18, 26, 34, 30, 42];

function buildBees(vw: number, vh: number, padB: number): Bee[] {
  const count = vw < 768 ? 3 : 5;
  const bees: Bee[] = [];
  for (let i = 0; i < count; i++) {
    const near = count === 3 ? i === 1 : i === 2; // una pasa "cerca"
    bees.push({
      dur: BEE_DURS[i % BEE_DURS.length],
      path: BEE_PATHS[i % BEE_PATHS.length],
      left: vw * (0.04 + Math.random() * 0.68),
      top: padB + vh * (0.02 + Math.random() * 0.9) - 16,
      scale: near ? 1.25 : 0.8 + Math.random() * 0.45,
      blur: near,
      opacity: 0.45 + Math.random() * 0.15,
    });
  }
  return bees;
}

function BeeGlyph({ clipId }: { clipId: string }) {
  return (
    <g>
      <g className="fv-wing fv-wing-a">
        <ellipse cx="-4" cy="-7" rx="5.5" ry="9" fill="rgba(214,235,255,0.55)" />
      </g>
      <g className="fv-wing fv-wing-b">
        <ellipse cx="6" cy="-8" rx="5" ry="8" fill="rgba(214,235,255,0.45)" />
      </g>
      <ellipse cx="0" cy="0" rx="12.5" ry="7" fill="#e8a020" />
      <g clipPath={`url(#${clipId})`}>
        <rect x="-8" y="-8" width="3.4" height="16" fill="#241a10" />
        <rect x="-1.7" y="-8" width="3.4" height="16" fill="#241a10" />
        <rect x="4.6" y="-8" width="3.4" height="16" fill="#241a10" />
      </g>
      <ellipse cx="0" cy="0" rx="12.5" ry="7" fill="none" stroke="rgba(255,201,97,0.3)" strokeWidth="1" />
      <circle cx="14" cy="-1" r="5" fill="#241a10" />
      <circle cx="15.2" cy="-2" r="1.15" fill="#f6eccd" />
      <path
        d="M15.5 -3.5 Q19 -9 22.5 -6.5 M14 -4 Q17 -11 21.5 -10"
        fill="none"
        stroke="#241a10"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </g>
  );
}

/* ============================================================================
   Componente principal
   ============================================================================ */
export default function FondoVivo() {
  const reduced = usePrefersReducedMotion();
  const hexLayerRef = useRef<HTMLDivElement>(null);
  const pollenLayerRef = useRef<HTMLDivElement>(null);
  const beesLayerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [vp, setVp] = useState(() => ({
    vw: typeof window !== 'undefined' ? window.innerWidth : 0,
    vh: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  // Medir el viewport en resize (debounced) para reconstruir grids y abejas.
  useEffect(() => {
    let t = 0;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        setVp({ vw: window.innerWidth, vh: window.innerHeight });
      }, 160);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const vw = vp.vw || window.innerWidth;
  const vh = vp.vh || window.innerHeight;

  // Pads (en top) para que el parallax descendente no abra huecos.
  const padH = Math.round(vh * 0.3);
  const padP = Math.round(vh * 0.6);
  const padB = Math.round(vh * 0.9);

  const hexes = useMemo(() => buildHexes(vw, vh + padH), [vw, vh, padH]);
  const bees = useMemo(() => buildBees(vw, vh, padB), [vw, vh, padB]);

  /* ---------------- Capa 3 · polen (canvas + rAF) ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mobile = vw < 768;
    const count = mobile ? 25 : 45;
    const w = vw;
    const h = vh + padP;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particles = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(1, 3),
      a: rand(0.1, 0.3),
      vy: rand(8, 20),
      amp: rand(6, 16),
      freq: rand(0.4, 1.2),
      phase: rand(0, Math.PI * 2),
    }));

    let raf = 0;
    let running = true;
    let last = performance.now();

    const frame = (t: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.shadowColor = 'rgba(245,190,90,0.9)';
      ctx.shadowBlur = 4;
      for (const p of particles) {
        p.y -= p.vy * dt;
        p.x += Math.sin(p.phase + (t / 1000) * p.freq) * 12 * dt;
        if (p.y < -3) {
          p.y = h + 3;
          p.x = rand(0, w);
        }
        if (p.x < -4) p.x = w + 4;
        else if (p.x > w + 4) p.x = -4;
        const tw = 0.6 + 0.4 * Math.sin((t / 1000) * p.freq * 0.7 + p.phase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,190,90,${(p.a * tw).toFixed(3)})`;
        ctx.fill();
      }
      ctx.restore();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced, vw, vh, padP]);

  /* ---------------- Capa 5 · parallax (scroll passive + rAF) ---------------- */
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const sy = window.scrollY;
      const iH = window.innerHeight;
      const pH = iH * 0.3;
      const pP = iH * 0.6;
      const pB = iH * 0.9;
      const tH = Math.max(0, Math.min(sy * 0.05, pH - 16));
      const tP = Math.max(0, Math.min(sy * 0.12, pP - 24));
      const tB = Math.max(0, Math.min(sy * 0.18, pB - 24));
      if (hexLayerRef.current) hexLayerRef.current.style.transform = `translate3d(0, ${tH.toFixed(2)}px, 0)`;
      if (pollenLayerRef.current) pollenLayerRef.current.style.transform = `translate3d(0, ${tP.toFixed(2)}px, 0)`;
      if (beesLayerRef.current) beesLayerRef.current.style.transform = `translate3d(0, ${tB.toFixed(2)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduced]);

  return (
    <div
      className={`fv-root pointer-events-none fixed inset-0 z-0 overflow-hidden ${reduced ? 'fv-reduced' : ''}`}
      aria-hidden="true"
    >
      {/* Capa 1 · base: gradiente vertical + halo ámbar tenue arriba */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #201812 0%, #171109 100%)' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(245,166,35,0.06) 0%, transparent 60%)' }}
      />

      {/* Capa 2 · panal que pulsa (ola con delay por fila+columna).
          Se mantiene en reduced-motion pero estático (sin delays). */}
      <div
        ref={hexLayerRef}
        className="fv-layer"
        style={{ position: 'absolute', left: 0, top: -padH, width: '100%', height: vh + padH }}
      >
        {hexes.map((h, i) => (
          <div
            key={i}
            className="fv-hex"
            style={{ left: h.x, top: h.y, width: HEX_W, height: Math.ceil(HEX_H), animationDelay: reduced ? undefined : `${h.d}s` }}
          >
            <svg width={HEX_W} height={HEX_H} viewBox="-33 -36 66 72" className="block h-full w-full" aria-hidden="true">
              <path d={hexPath} fill="none" stroke="#f5a623" strokeWidth="1" />
            </svg>
          </div>
        ))}
      </div>

      {/* Capa 3 · polen dorado (canvas) — solo si motion ok */}
      {!reduced && (
        <div
          ref={pollenLayerRef}
          className="fv-layer"
          style={{ position: 'absolute', left: 0, top: -padP, width: '100%', height: vh + padP }}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      )}

      {/* Capa 4 · abejas SVG volando — solo si motion ok */}
      {!reduced && (
        <div
          ref={beesLayerRef}
          className="fv-layer"
          style={{ position: 'absolute', left: 0, top: -padB, width: '100%', height: vh + padB }}
        >
          {bees.map((b, i) => {
            const clipId = `fv-bee-clip-${i}`;
            return (
              <div
                key={i}
                className="fv-bee"
                style={{
                  left: b.left,
                  top: b.top,
                  width: 190,
                  height: 130,
                  opacity: b.opacity,
                  transform: `scale(${b.scale})`,
                  filter: b.blur ? 'blur(1px)' : undefined,
                }}
              >
                <svg width="190" height="130" viewBox="0 0 190 130" className="block h-full w-full" aria-hidden="true">
                  <defs>
                    <clipPath id={clipId}>
                      <ellipse cx="0" cy="0" rx="12.5" ry="7" />
                    </clipPath>
                  </defs>
                  <g>
                    <BeeGlyph clipId={clipId} />
                    <animateMotion dur={`${b.dur}s`} repeatCount="indefinite" path={b.path} rotate="auto" />
                  </g>
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}