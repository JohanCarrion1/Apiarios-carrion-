// Resumen GLOBAL de los datos de la app para el asistente IA.
//
// En cada mensaje se reconstruye a partir de lo que la app tiene cargado
// (colmenas, núcleos, fecundadores, inspecciones, cosechas, tareas,
// tratamientos, reinas, cría, floración, inventario, cuaderno, calendario,
// precios y clima), de forma compacta para no gastar tokens de más.
//
// PRIVACIDAD: solo viajan datos del apiario. Nunca correos, contraseñas,
// teléfonos ni datos de clientes.
import type { Hive, Inspection, Task, Treatment } from '../types/hive';
import { HIVE_STATUS_LABELS } from '../types/hive';
import type { Fecundador } from '../types/fecundador';
import { FECUNDADOR_STATE_LABELS } from '../types/fecundador';
import type { BreedingLot, CuadernoEntry } from '../types/breeding';
import { BREEDING_STATUS_LABELS } from '../types/breeding';
import type { Queen } from '../types/queen';
import type { CalendarEvent } from '../types/calendar';
import type { FloweringEntry } from '../types/reminders';
import type { InventoryItem } from '../types/inventory';

export interface DatosApp {
  apiario: { nombre: string; ubicacion: string; temporada: string };
  hives: Hive[];
  nuclei: Hive[];
  fecundadores: Fecundador[];
  inspections: Inspection[];
  harvests: Array<{ hiveId?: string; date?: string; honeyKg?: number }>;
  tasks?: Task[];
  treatments?: Treatment[];
  breedingLots?: BreedingLot[];
  queens?: Queen[];
  events?: CalendarEvent[];
  floweringEntries?: FloweringEntry[];
  cuadernoEntries?: CuadernoEntry[];
  inventory?: InventoryItem[];
  basePrice?: number;
  annualGoal?: number;
  /** Caché del clima (forma de `WeatherData`, posiblemente envuelta). */
  weather?: unknown;
  /** Unidad que el usuario menciona: se añade su historial detallado. */
  focoId?: string;
}

const DIA = 86_400_000;
const MAX_CHARS = 16_000;

const dia = (iso?: string): string => {
  if (!iso) return 's/f';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso).slice(0, 10) : d.toISOString().slice(0, 10);
};

const ms = (iso?: string): number => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

const num = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0);

const lineaInspeccion = (i: Inspection): string => {
  const extra = [
    i.broodPattern ? `postura ${i.broodPattern}` : '',
    typeof i.framesWorked === 'number' && typeof i.framesMounted === 'number'
      ? `cuadros ${i.framesWorked}/${i.framesMounted}`
      : '',
    i.hasSupers ? 'con alza' : '',
    i.note ? `nota: ${i.note.replace(/\s+/g, ' ').slice(0, 160)}` : '',
  ].filter(Boolean);
  return `${dia(i.date)} cría ${i.brood}, miel ${i.honey}, varroa ${i.varroa}%, reina ${
    i.queenSeen ? 'vista' : 'no vista'
  }, genio ${i.calm}/3${extra.length ? `, ${extra.join(', ')}` : ''}`;
};

export function construirContextoGlobal(d: DatosApp, ahora: Date = new Date()): string {
  const hoy = ahora.getTime();
  const out: string[] = [];

  const unidades: Array<{ h: Hive; tipo: string }> = [
    ...d.hives.map((h) => ({ h, tipo: 'Colmena' })),
    ...d.nuclei.map((h) => ({ h, tipo: 'Núcleo' })),
  ];
  const codigo = new Map<string, string>();
  for (const { h } of unidades) codigo.set(h.id, h.code);
  for (const f of d.fecundadores) codigo.set(f.id, f.code);
  const cod = (id?: string) => (id ? codigo.get(id) ?? (id === 'apiario' ? 'todo el apiario' : id) : 'apiario');

  out.push(
    `DATOS ACTUALES DE LA APP (se actualizan en cada mensaje)`,
    `Hoy: ${dia(ahora.toISOString())}. Apiario: ${d.apiario.nombre || 'sin nombre'}. Ubicación: ${
      d.apiario.ubicacion
    }. Temporada: ${d.apiario.temporada}`
  );

  // --- Resumen general -----------------------------------------------------
  const porEstado = new Map<string, number>();
  for (const { h } of unidades) {
    const e = HIVE_STATUS_LABELS[h.status] ?? h.status;
    porEstado.set(e, (porEstado.get(e) ?? 0) + 1);
  }
  const huerfanas = unidades.filter(({ h }) => h.hasQueen === false).map(({ h }) => h.code);
  out.push(
    `Resumen: ${d.hives.length} colmenas, ${d.nuclei.length} núcleos, ${d.fecundadores.length} fecundadores. Estados: ${
      [...porEstado].map(([k, v]) => `${k} ${v}`).join(', ') || 'sin unidades'
    }.${huerfanas.length ? ` Sin reina: ${huerfanas.join(', ')}.` : ''}`
  );

  // --- Unidades con su última inspección y tendencia de varroa -------------
  const insPorUnidad = new Map<string, Inspection[]>();
  for (const i of d.inspections) {
    const l = insPorUnidad.get(i.hiveId) ?? [];
    l.push(i);
    insPorUnidad.set(i.hiveId, l);
  }
  for (const l of insPorUnidad.values()) l.sort((a, b) => ms(b.date) - ms(a.date));

  const MAX_UNIDADES = 70;
  const filas = unidades.slice(0, MAX_UNIDADES).map(({ h, tipo }) => {
    const ins = insPorUnidad.get(h.id) ?? [];
    const u = ins[0];
    const prev = ins[1];
    const reina = [
      h.hasQueen === false ? 'SIN REINA' : 'con reina',
      h.queenYear ? `año ${h.queenYear}` : '',
      h.queenMarkColor && h.queenMarkColor !== 'sin_marca' ? `marca ${h.queenMarkColor}` : '',
      h.queenInfo?.origin && h.queenInfo.origin !== 'desconocido' ? h.queenInfo.origin : '',
    ]
      .filter(Boolean)
      .join(' ');
    const equipo = h.equipamiento && h.equipamiento.alzas ? `, ${h.equipamiento.alzas} alza(s)` : '';
    const tendencia =
      u && prev ? ` (varroa antes ${prev.varroa}% el ${dia(prev.date)})` : '';
    const dias = u ? Math.round((hoy - ms(u.date)) / DIA) : null;
    return `- ${h.code}${h.name ? ` "${h.name}"` : ''} [${tipo}, ${
      HIVE_STATUS_LABELS[h.status] ?? h.status
    }, ${reina}${equipo}] ${
      u ? `última inspección hace ${dias} d: ${lineaInspeccion(u)}${tendencia}` : 'sin inspecciones registradas'
    }${h.notes ? ` | notas: ${h.notes.replace(/\s+/g, ' ').slice(0, 120)}` : ''}`;
  });
  if (filas.length) {
    out.push(`UNIDADES:\n${filas.join('\n')}`);
    if (unidades.length > MAX_UNIDADES) out.push(`(+${unidades.length - MAX_UNIDADES} unidades más no listadas)`);
  }

  // --- Historial detallado de la unidad mencionada -------------------------
  if (d.focoId) {
    const ins = (insPorUnidad.get(d.focoId) ?? []).slice(0, 6);
    if (ins.length) {
      out.push(`HISTORIAL DE ${cod(d.focoId)} (más reciente primero):\n${ins.map((i) => `- ${lineaInspeccion(i)}`).join('\n')}`);
    }
  }

  // --- Fecundadores ---------------------------------------------------------
  if (d.fecundadores.length) {
    out.push(
      `FECUNDADORES:\n${d.fecundadores
        .slice(0, 40)
        .map((f) => {
          const fechas = [
            f.fechaCelda ? `celda ${dia(f.fechaCelda)}` : '',
            f.fechaNacimiento ? `nació ${dia(f.fechaNacimiento)}` : '',
            f.fechaFecundacion ? `fecundada ${dia(f.fechaFecundacion)}` : '',
            f.fechaPuesta ? `puesta ${dia(f.fechaPuesta)}` : '',
            f.proximaRevision ? `próxima revisión ${dia(f.proximaRevision)}` : '',
          ].filter(Boolean);
          return `- ${f.code} [${f.estado === 'promovido' ? 'promovido a núcleo' : 'activo'}] reina: ${
            FECUNDADOR_STATE_LABELS[f.queenState]
          }${fechas.length ? `; ${fechas.join(', ')}` : ''}`;
        })
        .join('\n')}`
    );
  }

  // --- Cría de reinas ---------------------------------------------------------
  const lotes = d.breedingLots ?? [];
  if (lotes.length) {
    out.push(
      `CRÍA DE REINAS (${lotes.length} lotes):\n${lotes
        .slice(0, 12)
        .map((l) => {
          const acept = l.acceptance
            ? `, aceptación ${l.acceptance.acceptedCount}/${l.acceptance.totalCount} (${Math.round(l.acceptance.percentage)}%)`
            : '';
          return `- ${l.tipo}, inicio ${dia(l.fechaInicio)}, ${l.cantidadPortacupulas} celdas, estado ${
            BREEDING_STATUS_LABELS[l.estado] ?? l.estado
          }, enjaulado est. ${dia(l.fechaEnjauladoEstimada)}, nacimiento est. ${dia(
            l.fechaNacimientoEstimada
          )}, donante ${cod(l.coloniaDonante)}${acept}`;
        })
        .join('\n')}`
    );
  }

  // --- Reinas -----------------------------------------------------------------
  const reinas = (d.queens ?? []).filter((q) => q.estado === 'activa');
  if (reinas.length) {
    out.push(
      `REINAS ACTIVAS: ${reinas
        .slice(0, 40)
        .map((q) => `${cod(q.hiveId)} (nacida ${dia(q.fechaNacimiento)}, ${q.origen}${q.lineaGenetica ? `, línea ${q.lineaGenetica}` : ''})`)
        .join('; ')}`
    );
  }

  // --- Tratamientos -----------------------------------------------------------
  const trat = [...(d.treatments ?? [])].sort((a, b) => ms(b.startDate) - ms(a.startDate)).slice(0, 12);
  if (trat.length) {
    out.push(
      `TRATAMIENTOS (recientes):\n${trat
        .map((t) => {
          const fin = ms(t.endDate || t.startDate);
          const libre = fin + num(t.waitingDays) * DIA;
          const estado =
            hoy < fin ? 'en curso' : hoy < libre ? `en período de espera hasta ${dia(new Date(libre).toISOString())}` : 'período de espera cumplido';
          return `- ${cod(t.hiveId)}: ${t.product}${t.dose ? ` (${t.dose})` : ''}, ${dia(t.startDate)}→${dia(
            t.endDate || t.startDate
          )}, espera ${t.waitingDays} d → ${estado}`;
        })
        .join('\n')}`
    );
  }

  // --- Producción -------------------------------------------------------------
  const anio = ahora.getFullYear();
  const cosechas = d.harvests.map((c) => ({ ...c, t: ms(c.date), kg: num(c.honeyKg) }));
  const kgDe = (a: number) =>
    Math.round(cosechas.filter((c) => c.t && new Date(c.t).getFullYear() === a).reduce((s, c) => s + c.kg, 0) * 100) / 100;
  const porUnidad = new Map<string, number>();
  for (const c of cosechas) {
    if (c.t && new Date(c.t).getFullYear() === anio) {
      const k = cod(c.hiveId);
      porUnidad.set(k, (porUnidad.get(k) ?? 0) + c.kg);
    }
  }
  const top = [...porUnidad].sort((a, b) => b[1] - a[1]).slice(0, 8);
  out.push(
    `PRODUCCIÓN: ${anio}: ${kgDe(anio)} kg; ${anio - 1}: ${kgDe(anio - 1)} kg.${
      d.annualGoal ? ` Meta anual: ${d.annualGoal} kg.` : ''
    }${d.basePrice ? ` Precio base: S/ ${d.basePrice} por kg.` : ''}${
      top.length ? ` Por unidad este año: ${top.map(([k, v]) => `${k} ${Math.round(v * 100) / 100} kg`).join(', ')}.` : ''
    }`
  );
  const ultCosechas = [...cosechas].sort((a, b) => b.t - a.t).slice(0, 8);
  if (ultCosechas.length) {
    out.push(`Últimas cosechas: ${ultCosechas.map((c) => `${dia(c.date)} ${c.kg} kg (${cod(c.hiveId)})`).join('; ')}`);
  }

  // --- Tareas y calendario ----------------------------------------------------
  const pendientes = (d.tasks ?? []).filter((t) => !t.completed && t.estado !== 'completada');
  if (pendientes.length) {
    pendientes.sort((a, b) => ms(a.dueDate) - ms(b.dueDate));
    out.push(
      `TAREAS PENDIENTES (${pendientes.length}):\n${pendientes
        .slice(0, 15)
        .map((t) => {
          const atrasada = ms(t.dueDate) < hoy - DIA;
          return `- ${t.title} (${cod(t.hiveId || t.colmenaId)}), vence ${dia(t.dueDate)}${atrasada ? ' ATRASADA' : ''}, prioridad ${t.priority}`;
        })
        .join('\n')}`
    );
  }
  const eventos = (d.events ?? [])
    .filter((e) => !e.completed && ms(e.date) >= hoy - DIA && ms(e.date) <= hoy + 21 * DIA)
    .sort((a, b) => ms(a.date) - ms(b.date))
    .slice(0, 12);
  if (eventos.length) {
    out.push(
      `CALENDARIO (próximos 21 días):\n${eventos
        .map((e) => `- ${dia(e.date)}${e.time ? ` ${e.time}` : ''}: ${e.title}${e.hiveId ? ` (${cod(e.hiveId)})` : ''} [${e.priority}]`)
        .join('\n')}`
    );
  }

  // --- Floración ---------------------------------------------------------------
  const mes = ahora.getMonth() + 1;
  const enMes = (f: FloweringEntry) =>
    f.startMonth <= f.endMonth ? mes >= f.startMonth && mes <= f.endMonth : mes >= f.startMonth || mes <= f.endMonth;
  const flor = (d.floweringEntries ?? []).filter((f) => f.active !== false);
  if (flor.length) {
    const ahoraFlor = flor.filter(enMes).map((f) => f.species);
    out.push(
      `FLORACIÓN: ahora (mes ${mes}): ${ahoraFlor.join(', ') || 'ninguna registrada'}. Calendario: ${flor
        .map((f) => `${f.species} ${f.startMonth}–${f.endMonth}`)
        .join('; ')}`
    );
  }

  // --- Inventario --------------------------------------------------------------
  const inv = d.inventory ?? [];
  if (inv.length) {
    const bajos = inv.filter((i) => num(i.cantidadTotal) - num(i.cantidadEnUso) <= num(i.umbralAlerta));
    out.push(
      `INVENTARIO: ${inv.length} artículos.${
        bajos.length
          ? ` Stock bajo: ${bajos
              .slice(0, 10)
              .map((i) => `${i.nombre} (${num(i.cantidadTotal) - num(i.cantidadEnUso)} ${i.unidad})`)
              .join(', ')}.`
          : ' Sin alertas de stock.'
      }`
    );
  }

  // --- Cuaderno ----------------------------------------------------------------
  const notas = [...(d.cuadernoEntries ?? [])].sort((a, b) => ms(b.date) - ms(a.date)).slice(0, 6);
  if (notas.length) {
    out.push(`CUADERNO (últimas notas):\n${notas.map((n) => `- ${dia(n.date)}: ${n.text.replace(/\s+/g, ' ').slice(0, 200)}`).join('\n')}`);
  }

  // --- Clima -------------------------------------------------------------------
  const w = ((d.weather as { data?: unknown } | null)?.data ?? d.weather) as
    | {
        current?: { temperature?: number; humidity?: number; windSpeed?: number; precipitation?: number };
        daily?: Array<{ date: string; tempMax: number; tempMin: number; precipitationProbability: number }>;
      }
    | null
    | undefined;
  if (w?.current && typeof w.current.temperature === 'number') {
    const pron = (w.daily ?? [])
      .slice(0, 4)
      .map((x) => `${dia(x.date)} ${Math.round(x.tempMin)}–${Math.round(x.tempMax)}°C, lluvia ${Math.round(x.precipitationProbability)}%`)
      .join('; ');
    out.push(
      `CLIMA: ahora ${Math.round(w.current.temperature)}°C, humedad ${Math.round(num(w.current.humidity))}%, viento ${Math.round(
        num(w.current.windSpeed)
      )} km/h.${pron ? ` Pronóstico: ${pron}` : ''}`
    );
  }

  const texto = out.join('\n\n');
  return texto.length > MAX_CHARS ? `${texto.slice(0, MAX_CHARS)}\n…(resumen recortado)` : texto;
}
