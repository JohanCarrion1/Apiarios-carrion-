import { motion, useReducedMotion } from 'framer-motion';
import LivingHive from './LivingHive';

/* Efectos decorativos de la tienda (solo visuales, no tocan datos).
   Respetan prefers-reduced-motion. */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Hexágonos que flotan + silueta de cordillera que se dibuja con el marcador de altitud. */
export function HeroAmbient() {
  const reduce = useReducedMotion();
  const hexes = [
    { l: '6%', t: '14%', s: 54, d: 0 },
    { l: '84%', t: '10%', s: 74, d: 1.2 },
    { l: '12%', t: '58%', s: 38, d: 2.1 },
    { l: '90%', t: '52%', s: 46, d: 0.6 },
    { l: '48%', t: '4%', s: 30, d: 1.7 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {hexes.map((h, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 100 100"
          className="absolute"
          style={{ left: h.l, top: h.t, width: h.s, height: h.s }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={reduce ? { opacity: 0.35, scale: 1 } : { opacity: [0, 0.4, 0.28], scale: 1, y: [0, -12, 0], rotate: [0, 12, 0] }}
          transition={reduce ? { duration: 0.6 } : { duration: 9 + i, delay: h.d, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M50 6l38 22v44L50 94 12 72V28z" fill="rgba(255,169,10,.05)" stroke="#ffa90a" strokeOpacity=".5" strokeWidth="2" />
        </motion.svg>
      ))}

      <svg viewBox="0 0 800 140" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-24 w-full sm:h-32">
        <motion.path
          d="M0 120 L90 78 L150 100 L260 30 L330 84 L420 52 L520 108 L610 40 L700 92 L800 64 L800 140 L0 140 Z"
          fill="rgba(255,169,10,.045)"
          stroke="#ffa90a"
          strokeOpacity=".5"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, fillOpacity: 0 }}
          animate={{ pathLength: 1, fillOpacity: 1 }}
          transition={{ duration: 2.2, ease: EASE, delay: 0.3 }}
        />
        <motion.circle cx="610" cy="40" r="5" fill="#ffa90a" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 2.3, duration: 0.4 }} />
        {!reduce && (
          <motion.circle cx="610" cy="40" r="5" fill="none" stroke="#ffa90a" initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 3.4, opacity: 0 }} transition={{ delay: 2.4, duration: 1.8, repeat: Infinity }} style={{ transformOrigin: '610px 40px' }} />
        )}
      </svg>
      <motion.span
        className="absolute bottom-16 right-[16%] hidden rounded-full border border-honey/50 bg-ink/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-honey backdrop-blur-sm sm:block"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 0.5 }}
      >
        3,052 m
      </motion.span>
    </div>
  );
}

/** Borde de miel que gotea, para separar secciones. */
export function HoneyDrips() {
  const reduce = useReducedMotion();
  const drips = [8, 17, 29, 41, 53, 66, 78, 90];
  return (
    <div className="pointer-events-none relative h-8 w-full overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-honey/45 to-transparent" />
      {drips.map((x, i) => (
        <motion.span
          key={x}
          className="absolute top-0 w-1.5 origin-top rounded-b-full bg-gradient-to-b from-honey/55 to-honey/0"
          style={{ left: `${x}%` }}
          initial={{ height: 0 }}
          whileInView={{ height: 10 + ((i * 7) % 16) }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : i * 0.12, ease: EASE }}
        />
      ))}
    </div>
  );
}

/** Fondo de la pantalla de selección: luz de miel que respira, resplandores
    que derivan despacio y viñeta; el panal lo dibuja LivingHive encima. */
export function SelectionBackdrop({ fixed = false }: { fixed?: boolean }) {
  const orbs = [
    { l: '-10%', t: '-12%', s: 520, c: 'rgba(255,169,10,.16)', dx: 40, dy: 30, d: 16 },
    { l: '62%', t: '8%', s: 460, c: 'rgba(185,125,21,.14)', dx: -50, dy: 40, d: 19 },
    { l: '20%', t: '60%', s: 560, c: 'rgba(255,201,97,.08)', dx: 30, dy: -40, d: 22 },
  ];
  return (
    <div className={`pointer-events-none ${fixed ? 'fixed' : 'absolute'} inset-0 z-0 overflow-hidden`} aria-hidden="true"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #2a1f15 0%, #1a1410 55%, #120e08 100%)' }}>
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{ left: o.l, top: o.t, width: o.s, height: o.s, background: `radial-gradient(circle, ${o.c} 0%, transparent 70%)` }}
          animate={{ x: [0, o.dx, 0], y: [0, o.dy, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: o.d, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(10,7,3,.55) 100%)' }} />
    </div>
  );
}

/** Fondo de las secciones de administración (Cotizaciones, Catálogo, Pedidos):
    el mismo de Control de Colmenas, con todo el panal brillando y sin abejas. */
export function PanalBackdrop() {
  return (
    <>
      <SelectionBackdrop fixed />
      <LivingHive bees={false} />
    </>
  );
}
