// ============================================================
// QUANTITY INPUT — control de cantidad editable con botones -/+
// ============================================================
// Reutilizable en el modal de detalle de la tienda, el carrito y el
// panel admin (stock). El número central es un <input> de texto con
// teclado numérico en móvil: se puede escribir la cantidad directamente
// o usar los botones -/+. El valor se valida y corrige al perder el
// foco o pulsar Enter.
// ============================================================
import { useEffect, useRef, useState } from 'react';

export type QuantitySize = 'lg' | 'md' | 'sm';

interface QuantityInputProps {
  value: number;
  onChange: (next: number) => void;
  /** Mínimo permitido (por defecto 1). */
  min?: number;
  /** Máximo permitido (stock). Omitir = sin límite superior. */
  max?: number;
  disabled?: boolean;
  size?: QuantitySize;
  ariaLabel?: string;
}

const clamp = (n: number, min: number, max: number | undefined): number => {
  if (max !== undefined) return Math.min(max, Math.max(min, n));
  return Math.max(min, n);
};

const SIZES: Record<QuantitySize, { btn: string; input: string }> = {
  lg: { btn: 'h-11 w-11', input: 'w-12 text-lg' },
  md: { btn: 'h-9 w-9', input: 'w-11 text-base' },
  sm: { btn: 'h-8 w-8', input: 'w-10 text-sm' },
};

export default function QuantityInput({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  size = 'lg',
  ariaLabel,
}: QuantityInputProps) {
  const [draft, setDraft] = useState<string>(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);

  // Sincronizar el texto con el valor real cuando llega desde fuera
  // (botones -/+, reset del modal, limpiar carrito...) y el usuario no
  // está escribiendo en ese momento.
  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value));
  }, [value]);

  const commit = (raw: string): void => {
    const parsed = Number(raw);
    const next = raw.trim() === '' || !Number.isFinite(parsed) ? min : Math.floor(parsed);
    const clamped = clamp(next, min, max);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const handleChange = (raw: string): void => {
    // Solo dígitos enteros: ignorar espacios, signos, e/E, puntos, comas.
    if (!/^\d*$/.test(raw)) return;
    setDraft(raw);
    if (raw !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        // Clampear en vivo al rango: el total siempre queda coherente,
        // aunque el texto aún muestre lo que el usuario está escribiendo.
        const clamped = max !== undefined ? Math.min(max, n) : n;
        const finalN = Math.max(min, Math.floor(clamped));
        if (finalN !== value) onChange(finalN);
      }
    }
  };

  const dec = (): void => {
    const next = clamp(value - 1, min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const inc = (): void => {
    const next = clamp(value + 1, min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const s = SIZES[size];
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className={`flex items-center rounded-xl border border-line bg-ink/60 ${size === 'sm' ? '' : ''}`}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled || atMin}
        aria-label={`Quitar uno a ${ariaLabel || 'la cantidad'}`}
        className={`${s.btn} flex items-center justify-center rounded-l-xl text-honey transition-colors hover:text-honeysoft disabled:cursor-not-allowed disabled:opacity-30`}
      >
        −
      </button>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          focusedRef.current = false;
          commit(draft);
        }}
        onFocus={(e) => {
          focusedRef.current = true;
          e.target.select();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
            inputRef.current?.blur();
          }
        }}
        disabled={disabled}
        inputMode="numeric"
        pattern="[0-9]*"
        min={min}
        max={max}
        aria-label={ariaLabel ? `Cantidad de ${ariaLabel}` : 'Cantidad'}
        className={`${s.input} qty-spin-none h-full bg-transparent py-0 text-center font-mono font-bold text-cream outline-none ${size === 'lg' ? 'h-11' : ''}`}
      />
      <button
        type="button"
        onClick={inc}
        disabled={disabled || atMax}
        aria-label={`Agregar uno a ${ariaLabel || 'la cantidad'}`}
        className={`${s.btn} flex items-center justify-center rounded-r-xl text-honey transition-colors hover:text-honeysoft disabled:cursor-not-allowed disabled:opacity-30`}
      >
        +
      </button>
    </div>
  );
}