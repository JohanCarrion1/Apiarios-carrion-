import LegalShell from './LegalShell';
import { LEGAL_CONTACT_EMAIL } from '../config';

// ============================================================
// Política de Privacidad — Apiarios Carrión
// Cumplimiento de protección de datos (Ley N.º 29733, Perú).
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 border-honey/15 p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-honey">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-husk">{children}</div>
    </section>
  );
}

export default function Privacidad() {
  return (
    <LegalShell badge="PRIVACIDAD" title="Política de Privacidad" updatedAt="22 de septiembre de 2026">
      <Section title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de los datos personales es <strong className="text-cream">Apiarios Carrión</strong>,
          apicultura de altura con sede en Huaraz, Áncash (Perú). Para cualquier consulta o ejercicio de tus
          derechos puedes escribirnos a:{' '}
          {LEGAL_CONTACT_EMAIL ? (
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-honey underline-offset-4 hover:underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
          ) : (
            'nuestro canal de contacto publicado en la tienda'
          )}
          .
        </p>
      </Section>

      <Section title="2. ¿Qué datos recopilamos?">
        <p>
          Solo tratamos la información mínima necesaria para atender tu pedido:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Datos de pedido por WhatsApp:</strong> nombre, teléfono y, si lo
            incluyes, correo electrónico. Estos datos se recopilan cuando contactas con nosotros para hacer
            un pedido.
          </li>
          <li>
            <strong className="text-cream">Datos guardados en tu navegador (localStorage):</strong> el contenido de tu
            carrito de compra y tus preferencias, para que la tienda funcione correctamente. Estos datos nunca
            salen de tu dispositivo.
          </li>
          <li>
            <strong className="text-cream">Sesión de administración:</strong> si gestionas la tienda, guardamos en tu
            navegador una sesión segura que expira automáticamente a los 7 días (Firebase Auth).
          </li>
        </ul>
      </Section>

      <Section title="3. ¿Para qué usamos tus datos?">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Procesar y coordinar tus pedidos de productos apícolas.</li>
          <li>Responder a tus consultas por WhatsApp o correo.</li>
          <li>Mantener el funcionamiento de la tienda (carrito y preferencias).</li>
          <li>Gestionar el panel de administración y los pedidos recibidos.</li>
        </ul>
        <p>
          <em>No utilizamos tus datos para publicidad, venta a terceros ni perfiles de comportamiento.</em>
        </p>
      </Section>

      <Section title="4. Base legal del tratamiento">
        <p>
          La base legal de todo tratamiento es tu <strong className="text-cream">consentimiento</strong>: al
          contactarnos, solicitar un pedido o usar la tienda de forma voluntaria aceptas esta política.
          El consentimiento puede retirarse en cualquier momento escribiéndonos al canal de contacto.
        </p>
      </Section>

      <Section title="5. ¿Cómo protegemos tus datos?">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>La tienda se sirve por <strong className="text-cream">HTTPS</strong>, cifrando la información en tránsito.</li>
          <li>Los datos de tu carrito y preferencias se guardan únicamente en tu <strong className="text-cream">localStorage</strong>: no se envían a nuestros servidores.</li>
          <li>La sesión de administración usa <strong className="text-cream">Firebase Auth</strong> y expira cada 7 días.</li>
          <li>No almacenamos contraseñas ni datos de pago en el navegador; las pasarelas que usemos gestionan los pagos bajo sus propias medidas.</li>
        </ul>
      </Section>

      <Section title="6. Tus derechos (Ley N.º 29733)">
        <p>
          Conforme a la Ley de Protección de Datos Personales del Perú, tienes los siguientes derechos (ARCO):
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Acceso:</strong> conocer qué datos tuyos tratamos y cómo los usamos.
          </li>
          <li>
            <strong className="text-cream">Rectificación:</strong> corregir datos inexactos o incompletos.
          </li>
          <li>
            <strong className="text-cream">Cancelación:</strong> solicitar la supresión de tus datos cuando ya no
            sean necesarios.
          </li>
          <li>
            <strong className="text-cream">Oposición:</strong> oponerte al tratamiento de tus datos para fines
            específicos.
          </li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, escríbenos al correo del responsable indicado en el punto 1.
          También puedes eliminar en cualquier momento los datos guardados en tu navegador desde los ajustes
          de tu dispositivo.
        </p>
      </Section>

      <Section title="7. Compartir datos con terceros">
        <p>
          No vendemos, alquilamos ni cedemos tus datos personales a terceros. Únicamente compartimos la
          información necesaria con los proveedores imprescindibles para el funcionamiento del servicio
          (por ejemplo, la plataforma WhatsApp para coordinar pedidos y Firebase para la autenticación), siempre
          bajo sus propias políticas de seguridad y privacidad.
        </p>
      </Section>

      <Section title="8. Menores de edad">
        <p>
          Nuestra tienda está dirigida a personas mayores de edad. Si eres menor de 14 años, pide a tu padre,
          madre o tutor que realice el pedido por ti y que nos contacte para cualquier consulta.
        </p>
      </Section>

      <Section title="9. Cambios en esta política">
        <p>
          Podemos actualizar esta política para reflejar cambios legales o en la tienda. La fecha de la última
          actualización siempre figura al inicio de esta página.
        </p>
      </Section>
    </LegalShell>
  );
}