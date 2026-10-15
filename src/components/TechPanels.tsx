import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { differenceInDays, parseISO } from 'date-fns';
import type { Hive, Inspection } from '../types/hive';
import { hiveHasQueen } from '../types/hive';
import type { Queen } from '../types/queen';
import { QUEEN_YEAR_COLORS } from '../types/queen';
import type { BreedingLot } from '../types/breeding';

/* ---------------------------------------------------------------------------
   Capa técnica (solo lectura): usa los datos reales de tus inspecciones, reinas
   y lotes. No guarda ni modifica nada.
   Referencias:
   - Umbral de acción de varroa: ~3 % (se actúa por encima).
   - Fuerza por cuadros con abejas: fuerte ≥ 8 · media 6–7 · débil < 6.
   - Marcaje internacional de reinas por último dígito del año:
     1/6 blanco · 2/7 amarillo · 3/8 rojo · 4/9 verde · 5/0 azul.
   --------------------------------------------------------------------------- */

export const VARROA_THRESHOLD = 3;
const EASE = [0.22, 1, 0.36, 1] as const;

const COL = { ok: '#93cc68', warn: '#ffa90a', bad: '#f4552b', blue: '#6fa8dc' };
export const varroaColor = (v: number) => (v > VARROA_THRESHOLD ? COL.bad : v >= 2 ? COL.warn : COL.ok);

export type Strength = 'Fuerte' | 'Media' | 'Débil';
export const strengthOf = (frames: number): Strength => (frames >= 8 ? 'Fuerte' : frames >= 6 ? 'Media' : 'Débil');
const strengthColor: Record<Strength, string> = { Fuerte: COL.ok, Media: COL.warn, Débil: COL.bad };

const markColorByYear = (year: number): { name: string; hex: string } => {
  const d = year % 10;
  if (d === 1 || d === 6) return { name: 'blanco', hex: QUEEN_YEAR_COLORS.blanco };
  if (d === 2 || d === 7) return { name: 'amarillo', hex: QUEEN_YEAR_COLORS.amarillo };
  if (d === 3 || d === 8) return { name: 'rojo', hex: QUEEN_YEAR_COLORS.rojo };
  if (d === 4 || d === 9) return { name: 'verde', hex: QUEEN_YEAR_COLORS.verde };
  return { name: 'azul', hex: QUEEN_YEAR_COLORS.azul };
};

/** Última inspección de cada entidad (por fecha). */
export function latestByHive(inspections: Inspection[]): Map<string, Inspection> {
  const m = new Map<string, Inspection>();
  inspections.forEach((i) => {
    const prev = m.get(i.hiveId);
    if (!prev || new Date(i.date).getTime() > new Date(prev.date).getTime()) m.set(i.hiveId, i);
  });
  return m;
}

/** Cuadros con abejas conocidos (trabajados o montados); undefined si no hay dato. */
const framesOf = (i?: Inspection): number | undefined => {
  if (!i) return undefined;
  const f = i.framesWorked ?? i.framesMounted;
  return typeof f === 'number' ? f : undefined;
};

/* ---------- Anillo animado ---------- */
export function Ring({ pct, color, value, label, delay = 0 }: { pct: number; color: string; value: ReactNode; label: string; delay?: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative aspect-square w-full max-w-[92px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="42" fill="none" stroke="#2c2012" strokeWidth="9" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={264}
            initial={{ strokeDashoffset: 264 }}
            animate={{ strokeDashoffset: 264 * (1 - p / 100) }}
            transition={{ duration: 1.1, ease: EASE, delay }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-lg font-black text-cream">{value}</span>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-husk">{label}</span>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-ink/50 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-wider text-husk">{label}</p>
      <p className="mt-0.5 break-words font-display text-lg font-bold leading-tight text-cream">{value}</p>
      {sub && <p className="text-[11px] text-husk">{sub}</p>}
    </div>
  );
}

function TechBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-deep bg-honey/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-honey">
      Técnico
    </span>
  );
}

/* ---------- Mini gráfico de tendencia de varroa ---------- */
function VarroaSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 220, h = 54, max = Math.max(6, ...values), pad = 4;
  const pts = values.map((v, i) => [pad + (i * (w - pad * 2)) / (values.length - 1), h - pad - (v / max) * (h - pad * 2)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const ty = h - pad - (VARROA_THRESHOLD / max) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-label="Tendencia de varroa">
      <line x1="0" x2={w} y1={ty} y2={ty} stroke="#ffa90a" strokeDasharray="4 4" strokeOpacity=".6" />
      <motion.path d={d} fill="none" stroke="#ffa90a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE }} />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={varroaColor(values[i])} />
      ))}
    </svg>
  );
}

/* ---------- Ficha técnica de una colmena ---------- */
export function HiveTechCard({ hive, inspections, queen }: { hive: Hive; inspections: Inspection[]; queen?: Queen | null }) {
  const mine = useMemo(
    () => inspections.filter((i) => i.hiveId === hive.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [inspections, hive.id],
  );
  const last = mine[mine.length - 1];
  const frames = framesOf(last);
  const maxF = last?.entityType === 'nucleo' ? 5 : 10;

  const queenYear = queen?.fechaNacimiento ? new Date(queen.fechaNacimiento).getFullYear() : hive.queenYear;
  const queenAge = queenYear ? new Date().getFullYear() - queenYear : undefined;
  const mark = queenYear ? markColorByYear(queenYear) : undefined;

  if (!last) {
    return (
      <div className="rounded-xl border border-line bg-ink/50 p-3">
        <div className="flex items-center justify-between"><p className="tick-label">Ficha técnica</p><TechBadge /></div>
        <p className="mt-2 text-xs text-husk">Registra una inspección para ver varroa, cuadros y recomendaciones técnicas.</p>
      </div>
    );
  }

  const recs: string[] = [];
  if (last.varroa > VARROA_THRESHOLD) recs.push(`Varroa ${last.varroa.toFixed(1)} %: supera el umbral de acción (${VARROA_THRESHOLD} %). Planifica tratamiento y repite el conteo 2 a 3 semanas después. No trates con alzas de miel puestas.`);
  else if (last.varroa >= 2) recs.push(`Varroa ${last.varroa.toFixed(1)} %: cerca del umbral. Vuelve a medir en 2 a 3 semanas.`);
  if (!hiveHasQueen(hive)) recs.push('Sin reina: confirma con huevos o celdas de reina; si no hay cría joven, une la colonia o introduce una reina fecundada.');
  else if (!last.queenSeen && !last.broodPattern) recs.push('En la última revisión no se vio reina: busca postura fresca en la próxima visita.');
  if (last.broodPattern === 'fallada') recs.push('Patrón de cría fallado: puede indicar reina vieja, consanguinidad o varroa alta.');
  if (last.broodPattern === 'zanganera') recs.push('Cría zanganera: revisa si hay obrera ponedora o reina agotada.');
  if (queenAge !== undefined && queenAge >= 3) recs.push(`Reina de ${queenAge} años: considera recambio para sostener la postura.`);
  if (last.honey <= 1 && hiveHasQueen(hive)) recs.push('Reservas bajas de miel: revisa si necesita alimentación.');
  if (last.calm === 3) recs.push('Temperamento nervioso: valora cambiar de línea genética si se repite.');
  const days = differenceInDays(new Date(), parseISO(last.date));
  if (days > 21) recs.push(`Hace ${days} días de la última inspección.`);
  if (!recs.length) recs.push('Sin alertas técnicas. Mantén el ritmo de inspección y mide varroa cada 4 a 6 semanas.');
  const recColor = last.varroa > VARROA_THRESHOLD || !hiveHasQueen(hive) ? COL.bad : recs.length > 1 ? COL.warn : COL.ok;

  const calmLabel = last.calm === 1 ? 'Mansa' : last.calm === 3 ? 'Nerviosa' : 'Normal';
  const patternLabel = last.broodPattern ? { uniforme: 'Uniforme', fallada: 'Fallada', zanganera: 'Zanganera' }[last.broodPattern] : undefined;

  return (
    <motion.div className="space-y-3 rounded-xl border border-line bg-ink/50 p-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
      <div className="flex items-center justify-between">
        <p className="tick-label">Ficha técnica</p>
        <TechBadge />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Ring pct={(last.varroa / 6) * 100} color={varroaColor(last.varroa)} value={`${last.varroa.toFixed(1)}%`} label="Varroa" />
        <Ring pct={(last.brood / maxF) * 100} color={COL.ok} value={last.brood} label="Cuadros cría" delay={0.1} />
        <Ring pct={(last.honey / maxF) * 100} color={COL.warn} value={last.honey} label="Cuadros miel" delay={0.2} />
      </div>
      <p className="text-center text-[11px] text-husk">
        Umbral de varroa: <b className="text-cream">{VARROA_THRESHOLD}%</b> · inspección {days <= 0 ? 'de hoy' : `hace ${days} d`}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {frames !== undefined && (
          <Tile label="Cuadros con abejas" value={`${frames} de ${maxF}`} sub={<span style={{ color: strengthColor[strengthOf(frames)] }}>Colonia {strengthOf(frames).toLowerCase()}</span>} />
        )}
        {last.framesMounted !== undefined && last.framesWorked !== undefined && (
          <Tile label="Montados / trabajados" value={`${last.framesMounted} / ${last.framesWorked}`} />
        )}
        {patternLabel && <Tile label="Patrón de postura" value={patternLabel} />}
        <Tile label="Temperamento" value={calmLabel} sub={
          <span className="mt-1 inline-flex gap-1">{[1, 2, 3].map((k) => <i key={k} className="h-[6px] w-4 rounded" style={{ background: k <= last.calm ? COL.warn : '#33260f' }} />)}</span>
        } />
        {mark && queenYear && (
          <Tile
            label="Reina"
            value={<><span className="mr-2 inline-block h-3 w-3 rounded-full align-[-1px] ring-2 ring-white/15" style={{ background: mark.hex }} />{queenYear}</>}
            sub={`Marca ${mark.name}${queenAge !== undefined ? ` · ${queenAge} año${queenAge === 1 ? '' : 's'}` : ''}`}
          />
        )}
        <Tile label="Alza" value={last.hasSupers ? 'Sí' : 'No'} />
      </div>

      {mine.length >= 2 && (
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-husk">Tendencia de varroa · últimas {Math.min(8, mine.length)}</p>
          <VarroaSpark values={mine.slice(-8).map((i) => i.varroa || 0)} />
        </div>
      )}

      <div className="rounded-xl border p-3" style={{ borderColor: recColor + '66', background: recColor + '14' }}>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: recColor }}>Recomendación técnica</p>
        <ul className="list-disc space-y-1 pl-4 text-[13px] text-cream/90">
          {recs.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </motion.div>
  );
}

/* ---------- Tarjeta base ---------- */
function TCard({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <motion.div
      className="rounded-2xl border border-yellow-900/30 bg-[#1a140d] p-4 shadow-lg sm:p-6"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-honey sm:text-xl">{title}</h3>
        <TechBadge />
      </div>
      {children}
      {note && <p className="mt-3 text-xs leading-relaxed text-husk">{note}</p>}
    </motion.div>
  );
}

function HBar({ label, pct, color, text, i, threshold }: { label: string; pct: number; color: string; text: string; i: number; threshold?: number }) {
  return (
    <div className="mt-2 grid grid-cols-[3.4em_1fr_4.2em] items-center gap-2.5 text-sm">
      <span className="font-mono text-xs text-husk">{label}</span>
      <div className="relative h-4 rounded-full bg-[#241a0d]">
        <motion.span className="block h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} whileInView={{ width: `${Math.max(2, Math.min(100, pct))}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: i * 0.05 }} />
        {threshold !== undefined && <span className="absolute -bottom-1 -top-1 border-l-2 border-dashed border-honey" style={{ left: `${threshold}%` }} />}
      </div>
      <span className="text-right font-mono text-xs text-cream">{text}</span>
    </div>
  );
}

function Cols({ items }: { items: { label: string; n: number; color: string }[] }) {
  const mx = Math.max(1, ...items.map((x) => x.n));
  return (
    <div className="mt-2 flex h-32 items-end gap-2">
      {items.map((x, i) => (
        <div key={x.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <em className="font-mono text-xs not-italic text-cream">{x.n}</em>
          <motion.i className="block w-full rounded-t-lg" style={{ background: x.color }} initial={{ height: 0 }} whileInView={{ height: `${(x.n / mx) * 100 * 0.78}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE, delay: i * 0.07 }} />
          <span className="font-mono text-[10px] text-husk">{x.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Panel: fuerza del apiario ---------- */
export function ApiaryStrengthCard({ hives, inspections }: { hives: Hive[]; inspections: Inspection[] }) {
  const d = useMemo(() => {
    const last = latestByHive(inspections);
    let fuerte = 0, media = 0, debil = 0, frSum = 0, frN = 0, vSum = 0, vN = 0, sinReina = 0, viejas = 0;
    hives.forEach((h) => {
      const i = last.get(h.id);
      const f = framesOf(i);
      if (f !== undefined) { frSum += f; frN++; const s = strengthOf(f); if (s === 'Fuerte') fuerte++; else if (s === 'Media') media++; else debil++; }
      if (i) { vSum += i.varroa || 0; vN++; }
      if (!hiveHasQueen(h)) sinReina++;
      if (h.queenYear && new Date().getFullYear() - h.queenYear >= 3) viejas++;
    });
    return { fuerte, media, debil, frAvg: frN ? frSum / frN : null, vAvg: vN ? vSum / vN : null, known: fuerte + media + debil, sinReina, viejas, total: hives.length };
  }, [hives, inspections]);

  if (!hives.length) return null;
  const pct = (n: number) => (d.known ? (n / d.known) * 100 : 0);
  return (
    <TCard title="Fuerza del apiario" note={<>Fuerte: 8 o más cuadros con abejas · media: 6 a 7 · débil: menos de 6. Se calcula con la última inspección que tenga cuadros registrados.{d.viejas > 0 && <> <b className="text-cream">{d.viejas}</b> reinas con 3 años o más: candidatas a recambio.</>}</>}>
      <div className="grid grid-cols-3 gap-2">
        <Ring pct={d.total ? ((d.total - d.sinReina) / d.total) * 100 : 0} color={COL.ok} value={`${d.total - d.sinReina}/${d.total}`} label="Con reina" />
        <Ring pct={d.frAvg !== null ? d.frAvg * 10 : 0} color={COL.warn} value={d.frAvg !== null ? d.frAvg.toFixed(1) : '—'} label="Cuadros prom." delay={0.1} />
        <Ring pct={d.vAvg !== null ? 100 - (d.vAvg / 6) * 100 : 0} color={d.vAvg !== null ? varroaColor(d.vAvg) : COL.ok} value={d.vAvg !== null ? `${d.vAvg.toFixed(1)}%` : '—'} label="Varroa prom." delay={0.2} />
      </div>
      {d.known > 0 ? (
        <>
          <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-[#241a0d]">
            {[[d.fuerte, COL.ok], [d.media, COL.warn], [d.debil, COL.bad]].map(([n, c], i) => (
              <motion.i key={i} className="block h-full" style={{ background: c as string }} initial={{ width: 0 }} animate={{ width: `${pct(n as number)}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.1 }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-husk">
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COL.ok }} />Fuertes {d.fuerte}</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COL.warn }} />Medias {d.media}</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COL.bad }} />Débiles {d.debil}</span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-husk">Registra cuadros montados o trabajados en tus inspecciones para ver la fuerza de cada colonia.</p>
      )}
    </TCard>
  );
}

/* ---------- Estadísticas: varroa vs umbral, fuerza, reinas por año ---------- */
export function TechStatsCards({ hives, inspections }: { hives: Hive[]; inspections: Inspection[] }) {
  const d = useMemo(() => {
    const last = latestByHive(inspections);
    const codeOf = new Map(hives.map((h) => [h.id, h.code]));
    const top = [...last.values()].filter((i) => codeOf.has(i.hiveId)).sort((a, b) => (b.varroa || 0) - (a.varroa || 0)).slice(0, 10)
      .map((i) => ({ code: codeOf.get(i.hiveId) as string, v: i.varroa || 0 }));
    const str: Record<Strength, number> = { Débil: 0, Media: 0, Fuerte: 0 };
    hives.forEach((h) => { const f = framesOf(last.get(h.id)); if (f !== undefined) str[strengthOf(f)]++; });
    const years = new Map<number, number>();
    hives.forEach((h) => { if (h.queenYear && hiveHasQueen(h)) years.set(h.queenYear, (years.get(h.queenYear) || 0) + 1); });
    const yrs = [...years.entries()].sort((a, b) => a[0] - b[0]).slice(-5);
    return { top, str, yrs };
  }, [hives, inspections]);

  const strTotal = d.str.Débil + d.str.Media + d.str.Fuerte;
  return (
    <>
      {d.top.length > 0 && (
        <TCard title="Varroa por colmena" note={<>Las {d.top.length} colonias con mayor carga en su última inspección. La línea punteada es el umbral de acción (<b className="text-cream">{VARROA_THRESHOLD}%</b>).</>}>
          {d.top.map((x, i) => (
            <HBar key={x.code} i={i} label={x.code} pct={(x.v / 8) * 100} color={varroaColor(x.v)} text={`${x.v.toFixed(1)}%`} threshold={(VARROA_THRESHOLD / 8) * 100} />
          ))}
        </TCard>
      )}
      {strTotal > 0 && (
        <TCard title="Fuerza de colonias" note="Cuadros con abejas: fuerte 8 o más, media 6 a 7, débil menos de 6.">
          <Cols items={(['Débil', 'Media', 'Fuerte'] as Strength[]).map((k) => ({ label: k, n: d.str[k], color: strengthColor[k] }))} />
        </TCard>
      )}
      {d.yrs.length > 0 && (
        <TCard title="Reinas por año de marcaje" note="Código internacional de color por último dígito del año: blanco 1/6 · amarillo 2/7 · rojo 3/8 · verde 4/9 · azul 5/0.">
          <Cols items={d.yrs.map(([y, n]) => ({ label: String(y), n, color: markColorByYear(y).hex }))} />
        </TCard>
      )}
    </>
  );
}

/* ---------- Cría de reinas: cronología biológica ---------- */
const CHRONO: { day: number; title: string; text: string }[] = [
  { day: 0, title: 'Injerto de larvas', text: 'Larvas de menos de 24 h en copas con jalea real.' },
  { day: 2, title: 'Aceptación', text: 'Revisa que las celdas estén cuidadas y con jalea abundante.' },
  { day: 5, title: 'Operculado', text: 'Las celdas se cierran. Evita mover o sacudir el marco.' },
  { day: 10, title: 'Enjaulado', text: 'Protege cada celda en jaula o pásalas a núcleos.' },
  { day: 12, title: 'Nacimiento', text: 'Emergen las reinas vírgenes.' },
  { day: 17, title: 'Vuelos nupciales', text: 'Entre los días 17 y 19 salen a fecundarse con zánganos.' },
  { day: 20, title: 'Inicio de postura', text: 'Primeros huevos entre los días 20 y 25.' },
  { day: 28, title: 'Evaluación', text: 'Revisa patrón de cría, temperamento y población.' },
];

export function QueenChronology({ lots }: { lots: BreedingLot[] }) {
  const active = useMemo(() => {
    const list = lots.filter((l) => l.estado !== 'perdidas' && l.estado !== 'aceptadas')
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
    return list[0];
  }, [lots]);
  const day = active ? Math.max(0, differenceInDays(new Date(), parseISO(active.fechaInicio))) : -1;
  let cur = -1;
  CHRONO.forEach((s, i) => { if (day >= s.day) cur = i; });
  const fill = cur < 0 ? 0 : Math.round(((cur + 1) / CHRONO.length) * 100);

  return (
    <TCard title="Cronología biológica" note={active ? <>Lote más reciente en curso ({active.tipo}): día <b className="text-cream">{day}</b> desde el injerto.</> : 'Sin lote activo. Referencia estándar de cría de reinas.'}>
      <div className="relative mt-1 pl-6">
        <span className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-line" />
        <motion.span className="absolute left-[7px] top-2 w-0.5 bg-gradient-to-b from-honey to-deep" initial={{ height: 0 }} whileInView={{ height: `${fill * 0.92}%` }} viewport={{ once: true }} transition={{ duration: 1.3, ease: EASE }} />
        {CHRONO.map((s, i) => {
          const done = i < cur, now = i === cur;
          return (
            <div key={s.day} className="relative pb-3.5">
              <span className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 ${done ? 'border-honey bg-honey' : now ? 'border-[#6fa8dc] bg-[#6fa8dc] shadow-[0_0_0_5px_rgba(111,168,220,.22)] animate-pulse' : 'border-line bg-ink'}`} />
              <p className="text-sm font-semibold text-cream"><span className="mr-2 font-mono text-[11px] tracking-wider text-honey">DÍA {s.day}</span>{s.title}</p>
              <p className={`text-[13px] ${now ? 'text-[#d7e4f7]' : 'text-husk'}`}>{s.text}</p>
            </div>
          );
        })}
      </div>
    </TCard>
  );
}
