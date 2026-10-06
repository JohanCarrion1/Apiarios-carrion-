/**
 * Bloques nuevos de la tienda pública. Se montan desde `Store.tsx`.
 *
 * Todos los datos vienen de `src/lib/storeMarketing.ts` (mock conectable a
 * Firestore). Ningún bloque lee el catálogo: son secciones de presentación, así
 * que no interfieren con productos, filtros, buscador ni carrito.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CIFRAS_DEMO,
  DATOS_MIEL_DEMO,
  TESTIMONIOS_DEMO,
  GARANTIAS_DEMO,
  PREGUNTAS_DEMO,
} from '../../lib/storeMarketing';
import { useCountUp, useInViewOnce } from './useStoreAnimations';

/* Patrón hexagonal del tema, replicado del que ya usa la tienda. */
const HEX = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5-13-7.5v-15z' fill='none' stroke='%23f0a41c' stroke-width='0.5'/%3E%3C/svg%3E")`;

const EASE = [0.22, 1, 0.36, 1] as const;

/** Formatea miles con separador de miles es-AR y decimales fijos. */
function formatNumber(value: number, decimales = 0): string {
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/* ============================================================
   1 — Cifras del apiario (contadores animados)
   ============================================================ */
function Cifra({ valor, prefijo, sufijo, decimales = 0, titulo, detalle }: (typeof CIFRAS_DEMO)[number]) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const { value, done } = useCountUp(valor, inView);

  return (
    <div ref={ref} className="relative text-center sm:text-left">
      <p className="font-display text-3xl font-black leading-none text-honey sm:text-4xl">
        {prefijo}
        {/* Al terminar se pinta el valor ya redondeado para evitar que el
            contador muestre 4.899999 mientras vuela. */}
        {done ? formatNumber(valor, decimales) : formatNumber(value, decimales)}
        {sufijo}
      </p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-cream sm:text-[13px]">
        {titulo}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-husk">{detalle}</p>
    </div>
  );
}

export function CifrasApiario() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div
        className="relative overflow-hidden rounded-2xl border border-honey/15 bg-[#241C12] px-5 py-8 sm:px-10 sm:py-10"
        aria-label="Cifras del apiario"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: HEX }} aria-hidden="true" />
        <div className="relative grid grid-cols-2 gap-8 sm:gap-10 lg:grid-cols-4">
          {CIFRAS_DEMO.map((c) => (
            <Cifra key={c.id} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   2 — "Sabías que" (carrusel rotativo automático)
   ============================================================ */
const ROTACION_MS = 7000;

export function SabiasQue() {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = DATOS_MIEL_DEMO.length;

  useEffect(() => {
    if (pausado) return;
    if (total <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % total), ROTACION_MS);
    return () => clearInterval(t);
  }, [pausado, total]);

  const dato = DATOS_MIEL_DEMO[i];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div
        className="relative overflow-hidden rounded-2xl border border-line bg-pane/60 px-5 py-8 sm:px-10 sm:py-10"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
      >
        <div
          className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-honey/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10">
          {/* Etiqueta fija a la izquierda: da identidad sin que el contenido
              rotativo desplace el layout al cambiar de largo. */}
          <div className="flex items-center gap-3 lg:w-40 lg:shrink-0 lg:flex-col lg:items-start lg:gap-2">
            <span className="text-4xl" aria-hidden="true">
              {dato.emoji}
            </span>
            <p className="tick-label text-honey lg:mt-2">Sabías que…</p>
          </div>

          <div className="min-h-[7.5rem] sm:min-h-[6.5rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={dato.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <h3 className="font-display text-lg font-bold leading-snug text-cream sm:text-xl">
                  {dato.titulo}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-husk">{dato.texto}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Paginación: los puntos también permiten saltar manualmente. */}
        <div className="relative mt-6 flex items-center gap-2" role="tablist" aria-label="Datos de la miel">
          {DATOS_MIEL_DEMO.map((d, idx) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={idx === i}
              aria-label={d.titulo}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === i ? 'w-7 bg-honey' : 'w-1.5 bg-line2 hover:bg-husk'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   3 — Testimonios (carrusel con arrastre y autoplay)
   ============================================================ */
export function Testimonios() {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [dir, setDir] = useState(1);
  const total = TESTIMONIOS_DEMO.length;
  const t = TESTIMONIOS_DEMO[i];

  useEffect(() => {
    if (pausado || total <= 1) return;
    const id = setInterval(() => {
      setDir(1);
      setI((v) => (v + 1) % total);
    }, 8000);
    return () => clearInterval(id);
  }, [pausado, total]);

  const ir = (n: number) => {
    setDir(n > i || (i === total - 1 && n === 0) ? 1 : -1);
    setI(n);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <p className="tick-label mb-2 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-honey/60" />
          QUIÉN COMPRA
        </p>
        <h2 className="font-display text-2xl font-black tracking-tight text-cream sm:text-3xl">
          Lo que dicen quienes ya nos probaron
        </h2>
      </div>

      <div
        className="relative mx-auto max-w-3xl"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
      >
        <div className="card relative overflow-hidden px-5 py-8 sm:px-10 sm:py-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: HEX }}
            aria-hidden="true"
          />
          <div className="relative min-h-[13rem] sm:min-h-[11.5rem]">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.figure
                key={t.id}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.35, ease: EASE }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) ir((i + 1) % total);
                  else if (info.offset.x > 60) ir((i - 1 + total) % total);
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <div className="mb-4 flex gap-0.5" aria-label={`${t.nota} de 5 estrellas`}>
                  {Array.from({ length: 5 }, (_, s) => (
                    <span key={s} aria-hidden="true" className={s < t.nota ? 'text-honey' : 'text-line2'}>
                      ★
                    </span>
                  ))}
                </div>
                <blockquote className="text-base leading-relaxed text-cream sm:text-lg">
                  “{t.texto}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-honey/15 font-display text-sm font-bold text-honey">
                    {t.iniciales}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-cream">
                      {t.autor}
                      <span className="ml-2 font-normal text-husk">{t.ciudad}</span>
                    </span>
                    <span className="block text-xs text-husk">
                      {t.producto} · {t.fecha}
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => ir((i - 1 + total) % total)}
            aria-label="Testimonio anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-husk transition-colors hover:border-honey/50 hover:text-honey"
          >
            <span aria-hidden="true">←</span>
          </button>
          <div className="flex items-center gap-2">
            {TESTIMONIOS_DEMO.map((x, idx) => (
              <button
                key={x.id}
                onClick={() => ir(idx)}
                aria-label={`Ver testimonio de ${x.autor}`}
                aria-current={idx === i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === i ? 'w-7 bg-honey' : 'w-1.5 bg-line2 hover:bg-husk'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => ir((i + 1) % total)}
            aria-label="Testimonio siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-husk transition-colors hover:border-honey/50 hover:text-honey"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   4 — Franja de garantías
   ============================================================ */
export function Garantias() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {GARANTIAS_DEMO.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
            className="card p-4 sm:p-5"
          >
            <span className="text-2xl sm:text-3xl" aria-hidden="true">
              {g.emoji}
            </span>
            <h3 className="mt-2.5 font-display text-sm font-bold leading-snug text-cream sm:text-base">
              {g.titulo}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-husk sm:text-sm">{g.texto}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   5 — Preguntas frecuentes (acordeón, un item abierto a la vez)
   ============================================================ */
export function PreguntasFrecuentes() {
  const [abierto, setAbierto] = useState<string | null>(PREGUNTAS_DEMO[0]?.id ?? null);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <p className="tick-label mb-2 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-honey/60" />
          ANTES DE COMPRAR
        </p>
        <h2 className="font-display text-2xl font-black tracking-tight text-cream sm:text-3xl">
          Preguntas frecuentes
        </h2>
      </div>

      <div className="space-y-2.5">
        {PREGUNTAS_DEMO.map((p) => {
          const isOpen = abierto === p.id;
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-line bg-pane/60">
              <h3>
                <button
                  onClick={() => setAbierto(isOpen ? null : p.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                >
                  <span className="text-sm font-semibold leading-snug text-cream sm:text-base">
                    {p.pregunta}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-honey transition-transform duration-300 ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                  >
                    +
                  </span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    <p className="px-4 pb-4 text-sm leading-relaxed text-husk sm:px-5 sm:pb-5">
                      {p.respuesta}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
