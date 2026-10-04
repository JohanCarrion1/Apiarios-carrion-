import { Link } from 'react-router-dom';
import LegalShell from './LegalShell';

// ============================================================
// Política de Cookies — Apiarios Carrión
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 border-honey/15 p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-honey">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-husk">{children}</div>
    </section>
  );
}

export default function Cookies() {
  return (
    <LegalShell badge="COOKIES" title="Política de Cookies" updatedAt="22 de septiembre de 2026">
      <Section title="1. ¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos que los sitios web guardan en tu dispositivo para recordar
          información (por ejemplo, qué hay en tu carrito). Esta tienda usa también el{' '}
          <strong className="text-cream">almacenamiento local (localStorage)</strong> del navegador, una tecnología
          similar que persiste datos sin enviarlos a terceros.
        </p>
      </Section>

      <Section title="2. Cookies esenciales">
        <p>
          Son imprescindibles para que la tienda funcione. No requieren tu consentimiento y no se pueden
          desactivar sin dejar de usar el servicio:
        </p>
        <div className="rounded-xl border border-line bg-ink/50 p-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-husk">
                <th className="py-1.5 pr-2 font-semibold">Cookie / clave</th>
                <th className="py-1.5 pr-2 font-semibold">Función</th>
                <th className="py-1.5 font-semibold">Duración</th>
              </tr>
            </thead>
            <tbody className="text-husk">
              <tr className="border-b border-line/60">
                <td className="py-2 pr-2 font-mono text-[11px] text-cream">Carrito de la tienda</td>
                <td className="py-2 pr-2">Guarda los productos que añadiste a tu pedido</td>
                <td className="py-2">Hasta que limpies el navegador</td>
              </tr>
              <tr className="border-b border-line/60">
                <td className="py-2 pr-2 font-mono text-[11px] text-cream">Sesión de administración</td>
                <td className="py-2 pr-2">Guarda el acceso seguro al panel de la tienda (Firebase Auth)</td>
                <td className="py-2">7 días</td>
              </tr>
              <tr>
                <td className="py-2 pr-2 font-mono text-[11px] text-cream">Preferencia de cookies</td>
                <td className="py-2 pr-2">Recuerda tu decisión sobre este aviso para no mostrarlo repetidamente</td>
                <td className="py-2">Hasta que limpies el navegador</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="3. Cookies de preferencias">
        <p>
          Guardan tus ajustes para mejorar la experiencia, como el idioma o la última vista utilizada. Son
          opcionales y se almacenan solo en tu navegador.
        </p>
      </Section>

      <Section title="4. Cookies analíticas">
        <p>
          Esta tienda <strong className="text-cream">no activa Google Analytics ni ninguna herramienta de seguimiento</strong>.
          En el futuro, si decidiéramos usar analíticas, respetaremos tu elección del banner: si rechazas las
          cookies, <strong className="text-cream">nunca se inicializarán</strong>.
        </p>
      </Section>

      <Section title="5. Duración de los datos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Carrito y preferencias: persistencia indefinida en tu navegador, salvo que las elimines.</li>
          <li>Sesión de administración: expira automáticamente a los 7 días.</li>
          <li>Preferencia de cookies: persistencia indefinida hasta que borres los datos del navegador.</li>
        </ul>
      </Section>

      <Section title="6. ¿Cómo gestionar o eliminar las cookies?">
        <p>
          Puedes configurar tu navegador para bloquear o eliminar estas cookies en cualquier momento. Si las
          bloqueas, la tienda seguirá funcionando, pero es posible que tengas que volver a añadir productos a
          tu carrito o que el aviso de cookies reaparezca. Consulta el menú de ajustes de tu navegador
          (Chrome, Safari, Firefox, Edge) para gestionar el almacenamiento local y las cookies.
        </p>
      </Section>

      <Section title="7. Tu consentimiento">
        <p>
          La primera vez que visitas la tienda te mostramos un aviso con dos opciones:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-cream">Aceptar todas:</strong> guardamos tu preferencia y activamos las funciones opcionales.</li>
          <li><strong className="text-cream">Rechazar:</strong> guardamos tu decisión y <strong className="text-cream">no activamos ningún rastreo</strong>.</li>
        </ul>
        <p>
          Puedes cambiar tu decisión en cualquier momento borrando los datos del sitio desde los ajustes de tu
          navegador. Consulta nuestra{' '}
          <Link to="/privacidad" className="text-honey underline-offset-4 hover:underline">
            Política de Privacidad
          </Link>{' '}
          para más información sobre cómo tratamos tus datos.
        </p>
      </Section>
    </LegalShell>
  );
}