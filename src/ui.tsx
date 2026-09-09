import type { ReactNode } from "react";
import { STATUS_COLORS } from "./types/hive";
import { useReveal } from "./hooks";

const STATUS_META = STATUS_COLORS;

interface IconProps {
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconHex = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 2.4 20.4 7.2v9.6L12 21.6 3.6 16.8V7.2Z" />
  </svg>
);

export const IconPanel = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3.5" y="3.5" width="7.4" height="7.4" rx="1.6" />
    <rect x="13.1" y="3.5" width="7.4" height="4.6" rx="1.6" />
    <rect x="13.1" y="10.3" width="7.4" height="10.2" rx="1.6" />
    <rect x="3.5" y="13.1" width="7.4" height="7.4" rx="1.6" />
  </svg>
);

export const IconClipboard = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="5" y="4.5" width="14" height="17" rx="2.2" />
    <path d="M9 2.8h6v3.4H9zM8.6 11h6.8M8.6 14.6h6.8M8.6 18.2h4" />
  </svg>
);

export const IconDrop = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 2.8c3.6 4.4 6.2 7.7 6.2 10.9a6.2 6.2 0 0 1-12.4 0C5.8 10.5 8.4 7.2 12 2.8Z" />
    <path d="M9.2 13.6a2.9 2.9 0 0 0 2.4 3" />
  </svg>
);

export const IconCheck = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m4.8 12.6 4.7 4.7L19.2 7" />
  </svg>
);

export const IconPlus = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconAlert = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 3.6 21.4 19.8H2.6Z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="17" r="0.4" fill="currentColor" />
  </svg>
);

export const IconWind = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M3 8.6h9.4a2.4 2.4 0 1 0-2.3-3.1" />
    <path d="M3 12.4h13.8a2.5 2.5 0 1 1-2.4 3.2" />
    <path d="M3 16.2h6.4a2 2 0 1 1-1.9 2.6" />
  </svg>
);

export const IconSun = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7" />
  </svg>
);

export const IconFlower = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 9.4V4.6M12 19.4v-4.8M14.6 12h4.8M4.6 12h4.8M13.9 10.1l3.4-3.4M6.7 17.3l3.4-3.4M13.9 13.9l3.4 3.4M6.7 6.7l3.4 3.4" />
  </svg>
);

export const IconScale = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M9.2 7.2h5.6l2.6 11.6a1.6 1.6 0 0 1-1.6 2H8.2a1.6 1.6 0 0 1-1.6-2Z" />
    <circle cx="12" cy="4.6" r="2" />
  </svg>
);

export const IconCrown = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m4.2 17 1.2-9 4.2 3.6L12 5.4l2.4 6.2 4.2-3.6 1.2 9Z" />
    <path d="M4.8 20.2h14.4" />
  </svg>
);

export const IconSearch = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="10.5" cy="10.5" r="6.2" />
    <path d="m15.3 15.3 4.9 4.9" />
  </svg>
);

export const IconX = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconBug = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <circle cx="12" cy="13.4" r="5.2" />
    <path d="M12 8.2V5.6M9.6 5l1.2 1.6M14.4 5l-1.2 1.6M6.8 10.4 4.4 9M6.6 14.6l-2.8.6M7.6 17.6l-2 1.8M17.2 10.4l2.4-1.4M17.4 14.6l2.8.6M16.4 17.6l2 1.8M12 11v5" />
  </svg>
);

export const IconLayers = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="m12 3.4 8.4 4.6L12 12.6 3.6 8Z" />
    <path d="m4.6 11.6-1 0.6 8.4 4.6 8.4-4.6-1-.6M4.6 15.8l-1 .6 8.4 4.6 8.4-4.6-1-.6" />
  </svg>
);

export const IconCalendar = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="3.6" y="5" width="16.8" height="15.4" rx="2.2" />
    <path d="M3.6 9.6h16.8M8 2.8V6M16 2.8V6" />
  </svg>
);

export const IconNote = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M14.6 4.2 19.8 9.4 8.4 20.8l-5.6 1.4 1.4-5.6Z" />
    <path d="m12.4 6.4 5.2 5.2" />
  </svg>
);

export const IconEdit = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const IconTrash = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconChart = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

/** Abeja dibujada a mano (cuerpo rayado + alas que aletean). */
export const IconBee = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <g className="bee-wing">
      <path d="M8.4 9.6C5.6 6.4 2.6 7.2 2.8 9.7c.2 2.1 3 2.9 5.6 1.6Z" fill="currentColor" opacity="0.45" />
      <path d="M15.6 9.6c2.8-3.2 5.8-2.4 5.6.1-.2 2.1-3 2.9-5.6 1.6Z" fill="currentColor" opacity="0.45" />
    </g>
    <ellipse cx="12" cy="14" rx="4.6" ry="6.4" fill="currentColor" opacity="0.9" />
    <path d="M7.6 11.6h8.8M7.4 14.6h9.2M8.4 17.6h7.2" stroke="#1b140c" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="12" cy="5.8" r="2.1" fill="currentColor" />
    <path d="M10.8 4.2 9.6 2.6M13.2 4.2l1.2-1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M12 20.4v1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/* ---------- compartidos ---------- */

export function StatusPill({ status, small }: { status: 'saludable' | 'revision' | 'alerta' | 'sin_reina'; small?: boolean }) {
  const color = STATUS_META[status as keyof typeof STATUS_META];
  if (!color) return null;
  const label = status === 'sin_reina' ? 'Sin reina' : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-widest ${
        small ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"
      }`}
      style={{ color, background: color + "1c", border: `1px solid ${color}55` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/** Cabecera de sección: kicker mono + título Fraunces + línea. */
export function SectionHead({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  const { ref, inView } = useReveal();
  return (
    <div ref={ref} className={`reveal ${inView ? "in" : ""} mb-7 flex flex-wrap items-end justify-between gap-4`}>
      <div>
        <p className="tick-label mb-2 flex items-center gap-2">
          <IconHex className="h-3 w-3 text-honey" />
          {kicker}
        </p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-cream sm:text-4xl">{title}</h2>
      </div>
      {right}
    </div>
  );
}
