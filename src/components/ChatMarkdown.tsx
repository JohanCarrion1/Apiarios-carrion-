// Renderizador mínimo de Markdown para las respuestas del asistente.
// Sin dependencias y sin innerHTML: todo se construye como nodos de React, así
// que el texto del modelo nunca se interpreta como HTML.
// Soporta: títulos (#), **negrita**, *cursiva*, `código`, listas con viñetas o
// numeradas (con sangría), citas (>), separadores (---), bloques ``` y
// enlaces [texto](https://…).
import { Fragment, type ReactNode } from 'react';

const INLINE_RE =
  /(\*\*[^*\n]+?\*\*|`[^`\n]+`|\*[^*\s][^*\n]*?\*|_[^_\s][^_\n]*?_|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(texto: string, clave: string): ReactNode[] {
  const out: ReactNode[] = [];
  let ultimo = 0;
  let n = 0;
  for (const m of texto.matchAll(INLINE_RE)) {
    const i = m.index ?? 0;
    if (i > ultimo) out.push(texto.slice(ultimo, i));
    const t = m[0];
    const k = `${clave}-${n++}`;
    if (t.startsWith('**')) {
      out.push(
        <strong key={k} className="font-semibold text-cream">
          {inline(t.slice(2, -2), k)}
        </strong>
      );
    } else if (t.startsWith('`')) {
      out.push(
        <code key={k} className="rounded bg-ink/70 px-1 py-0.5 font-mono text-[0.85em] text-honey">
          {t.slice(1, -1)}
        </code>
      );
    } else if (t.startsWith('[')) {
      const cierre = t.indexOf('](');
      out.push(
        <a
          key={k}
          href={t.slice(cierre + 2, -1)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-honey underline underline-offset-2"
        >
          {t.slice(1, cierre)}
        </a>
      );
    } else {
      out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>);
    }
    ultimo = i + t.length;
  }
  if (ultimo < texto.length) out.push(texto.slice(ultimo));
  return out;
}

const RE_TITULO = /^(#{1,6})\s+(.*)$/;
const RE_VINETA = /^(\s*)[-*•+]\s+(.*)$/;
const RE_NUMERO = /^(\s*)(\d+)[.)]\s+(.*)$/;
const RE_HR = /^\s*([-*_])(\s*\1){2,}\s*$/;

export default function ChatMarkdown({ texto }: { texto: string }) {
  const lineas = texto.replace(/\r\n?/g, '\n').split('\n');
  const bloques: ReactNode[] = [];
  let parrafo: string[] = [];
  let k = 0;

  const cerrarParrafo = () => {
    if (!parrafo.length) return;
    const key = `p${k++}`;
    bloques.push(
      <p key={key} className="break-words">
        {parrafo.map((l, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {inline(l, `${key}-${i}`)}
          </Fragment>
        ))}
      </p>
    );
    parrafo = [];
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    if (/^\s*```/.test(linea)) {
      cerrarParrafo();
      const codigo: string[] = [];
      i++;
      while (i < lineas.length && !/^\s*```/.test(lineas[i])) codigo.push(lineas[i++]);
      bloques.push(
        <pre
          key={`c${k++}`}
          className="overflow-x-auto rounded-lg bg-ink/70 p-3 font-mono text-xs text-cream"
        >
          {codigo.join('\n')}
        </pre>
      );
      continue;
    }

    if (!linea.trim()) {
      cerrarParrafo();
      continue;
    }

    const titulo = linea.match(RE_TITULO);
    if (titulo) {
      cerrarParrafo();
      const nivel = titulo[1].length;
      const key = `h${k++}`;
      bloques.push(
        <p
          key={key}
          className={`font-display font-bold text-cream ${nivel <= 2 ? 'text-base' : 'text-[15px]'}`}
        >
          {inline(titulo[2].replace(/\s*#+\s*$/, ''), key)}
        </p>
      );
      continue;
    }

    if (RE_HR.test(linea)) {
      cerrarParrafo();
      bloques.push(<hr key={`r${k++}`} className="border-line" />);
      continue;
    }

    const num = linea.match(RE_NUMERO);
    const vin = !num ? linea.match(RE_VINETA) : null;
    if (num || vin) {
      cerrarParrafo();
      const sangria = Math.min(3, Math.floor((num ? num[1] : vin![1]).replace(/\t/g, '  ').length / 2));
      const key = `l${k++}`;
      bloques.push(
        <div key={key} className="flex gap-2" style={{ marginLeft: `${sangria * 1.1}rem` }}>
          <span
            aria-hidden
            className={`shrink-0 ${num ? 'min-w-[1.1em] text-right font-semibold text-honey' : 'text-honey'}`}
          >
            {num ? `${num[2]}.` : sangria > 0 ? '◦' : '•'}
          </span>
          <span className="min-w-0 break-words">{inline(num ? num[3] : vin![2], key)}</span>
        </div>
      );
      continue;
    }

    if (/^\s*>\s?/.test(linea)) {
      cerrarParrafo();
      const key = `q${k++}`;
      bloques.push(
        <blockquote key={key} className="border-l-2 border-honey/50 pl-3 text-husk">
          {inline(linea.replace(/^\s*>\s?/, ''), key)}
        </blockquote>
      );
      continue;
    }

    parrafo.push(linea.trim());
  }
  cerrarParrafo();

  return <div className="space-y-2.5">{bloques}</div>;
}
