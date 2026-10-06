/**
 * Piezas compartidas por los documentos legales.
 *
 * Antes cada página (privacidad, cookies, terminos) definía su propia copia de
 * `Section`, `ContactEmail` y `CookieTable`. Eso obligaba a duplicar el estilo
 * y, sobre todo, impedía reutilizar el contenido dentro del modal de
 * aceptación: al vivir dentro de `<LegalShell>`, no había forma de pintarlo en
 * una superposición sin arrastrar también el shell.
 *
 * Ahora el CONTENIDO vive en `src/content/legal/*` (componentes sin shell) y
 * estas piezas son las únicas que conocen el estilo. Las páginas de ruta las
 * envuelven en `LegalShell`; el modal de términos las pinta directamente.
 */
import type { ReactNode } from "react";
import { LEGAL_CONTACT_EMAIL } from "../../config";

/** Fecha de última actualización de los tres documentos (versión 1.0). */
export const LEGAL_UPDATED_AT = "6 de octubre de 2026";

/** Una sección = una card oscura con título ámbar. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card space-y-3 border-honey/15 p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-honey">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-husk">
        {children}
      </div>
    </section>
  );
}

/**
 * Correo del responsable del tratamiento, enlazado si está configurado.
 * Si `VITE_LEGAL_CONTACT_EMAIL` no está definido cae a un texto genérico en
 * lugar de dejar un hueco o inventar una dirección.
 */
export function LegalContactEmail() {
  return LEGAL_CONTACT_EMAIL ? (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className="text-honey underline-offset-4 hover:underline"
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  ) : (
    "el canal de contacto publicado en la tienda"
  );
}

/** Enlaces internos entre documentos legales ( Privacidad / Cookies / Términos ). */
export function LegalCrossLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <a href={to} className="text-honey underline-offset-4 hover:underline">
      {children}
    </a>
  );
}

/**
 * Tabla de tecnologías de navegador.
 *
 * El scroll horizontal va en un contenedor interior porque, con cinco columnas,
 * en móvil la tabla se aplastaría hasta ser ilegible si no pudiera desplazarse.
 */
export function LegalTable({
  rows,
}: {
  rows: (readonly [string, string, string, string, string])[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
          <thead className="bg-pane2/60">
            <tr>
              {["Nombre", "Proveedor", "Finalidad", "Duración", "Tipo"].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    className="border-b border-line px-3 py-2.5 font-semibold text-cream"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="align-top odd:bg-pane/30">
                <td className="border-b border-line/60 px-3 py-2.5 font-mono text-[11px] text-honey">
                  {r[0]}
                </td>
                <td className="border-b border-line/60 px-3 py-2.5">{r[1]}</td>
                <td className="border-b border-line/60 px-3 py-2.5">{r[2]}</td>
                <td className="border-b border-line/60 px-3 py-2.5">{r[3]}</td>
                <td className="border-b border-line/60 px-3 py-2.5">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
