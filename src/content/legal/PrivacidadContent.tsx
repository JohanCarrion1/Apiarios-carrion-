import { LEGAL_ADDRESS, LEGAL_CONTACT_EMAIL, LEGAL_RUC } from "../../config";
import {
  LegalSection as Section,
  LegalContactEmail as ContactEmail,
  LEGAL_UPDATED_AT as UPDATED_AT,
} from "./LegalParts";

/**
 * Contenido de PrivacidadContent: las mismas secciones que se muestran en la ruta pública,
 * sin el `LegalShell` alrededor. Eso permite pintarlo tanto en la página como
 * dentro de la superposición del modal de aceptación.
 */
export default function PrivacidadContent() {
  return (
    <>
      <Section title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de tus datos personales es{" "}
          <strong className="text-cream">Apiarios Carrión</strong>, apicultura
          de altura con sede en Huaraz, Áncash, Perú.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          {LEGAL_RUC && (
            <li>
              <strong className="text-cream">RUC:</strong> {LEGAL_RUC}
            </li>
          )}
          <li>
            <strong className="text-cream">Domicilio:</strong> Huaraz, Áncash,
            Perú
            {LEGAL_ADDRESS ? ` — ${LEGAL_ADDRESS}` : ""}.
          </li>
          <li>
            <strong className="text-cream">Correo de contacto:</strong>{" "}
            <ContactEmail />
          </li>
        </ul>
        <p>
          Para cualquier consulta sobre esta política o sobre el tratamiento de
          tus datos, escribe al correo anterior o usa el WhatsApp publicado en
          la tienda.
        </p>
      </Section>

      <Section title="2. ¿Qué datos recopilamos?">
        <p>
          Solo recopilamos lo necesario para prestarte el servicio. No hacemos
          perfiles de comportamiento ni usamos tus datos con fines
          publicitarios. Estas son las categorías que tratamos:
        </p>
        <ul className="list-disc space-y-2.5 pl-5">
          <li>
            <strong className="text-cream">
              Datos de registro y autenticación.
            </strong>{" "}
            Al registrarte guardamos tu correo electrónico, tu nombre (o el que
            proporciones en Google o Twitter) y un identificador interno de
            cuenta. La contraseña nunca la guardamos nosotros: la gestiona
            Firebase Authentication y queda cifrada en sus servidores.
          </li>
          <li>
            <strong className="text-cream">
              Datos de tu perfil y de tus apiarios.
            </strong>{" "}
            La información que registras en la aplicación: colmenas, núcleos,
            revisiones, cruces, inventario, cosechas, tareas y recordatorios. Se
            guarda cifrada en la base de datos de la aplicación.
          </li>
          <li>
            <strong className="text-cream">Fotos de tus inspecciones.</strong>{" "}
            Si adjuntas imágenes al registrar una revisión, se almacenan en un
            servicio de alojamiento de archivos junto con la fecha y la revisión
            a la que pertenecen.
          </li>
          <li>
            <strong className="text-cream">
              Datos de navegación y preferencias.
            </strong>{" "}
            La sección de la tienda que visitaste por última vez y tu
            consentimiento a las cookies, ambos guardados en tu propio
            navegador. Los detallamos en la{" "}
            <a
              href="/cookies"
              className="text-honey underline-offset-4 hover:underline"
            >
              Política de Cookies
            </a>
            .
          </li>
          <li>
            <strong className="text-cream">
              Datos de contacto para pedidos.
            </strong>{" "}
            Al hacer un pedido registramos nombre, teléfono y, si lo indicas,
            correo electrónico, junto con los productos solicitados y el estado
            del pedido.
          </li>
          <li>
            <strong className="text-cream">Datos de pago.</strong>{" "}
            <strong className="text-cream">No los tratamos.</strong> La
            aplicación no procesa pagos con tarjeta ni almacena datos de
            tarjetas. El pago se realiza por Yape o transferencia bancaria, o en
            efectivo contra entrega, y es la entidad financiera correspondiente
            quien trata esos datos bajo sus propias políticas.
          </li>
        </ul>
        <p>
          No solicitamos categorías especiales de datos personales, como
          información de salud, origen étnico, afiliación sindical o
          convicciones religiosas.
        </p>
      </Section>

      <Section title="3. ¿Para qué usamos tus datos?">
        <p>Cada tratamiento tiene una finalidad concreta y una base legal:</p>
        <ul className="list-disc space-y-2.5 pl-5">
          <li>
            <strong className="text-cream">
              Gestionar tu cuenta y tu registro en la aplicación.
            </strong>{" "}
            <span className="text-honey/90">
              Base legal: ejecución del contrato.
            </span>{" "}
            Sin esto no podemos reconocerte al entrar.
          </li>
          <li>
            <strong className="text-cream">
              Guardar y mostrar tus apiarios, revisiones, cosechas y tareas.
            </strong>{" "}
            <span className="text-honey/90">
              Base legal: ejecución del contrato.
            </span>{" "}
            Es la función principal de la aplicación.
          </li>
          <li>
            <strong className="text-cream">
              Procesar, coordinar y entregar tus pedidos.
            </strong>{" "}
            <span className="text-honey/90">
              Base legal: ejecución del contrato.
            </span>
          </li>
          <li>
            <strong className="text-cream">
              Registrar que aceptaste esta política y los Términos.
            </strong>{" "}
            <span className="text-honey/90">Base legal: consentimiento.</span>{" "}
            Esa aceptación queda vinculada a tu cuenta y a la versión del
            documento.
          </li>
          <li>
            <strong className="text-cream">
              Recordar tu consentimiento a las cookies.
            </strong>{" "}
            <span className="text-honey/90">Base legal: consentimiento.</span>
          </li>
          <li>
            <strong className="text-cream">
              Mantener la seguridad y prevenir el abuso del servicio.
            </strong>{" "}
            <span className="text-honey/90">Base legal: interés legítimo.</span>{" "}
            Nadie que administre la tienda puede protegerla sin esto.
          </li>
          <li>
            <strong className="text-cream">
              Cumplir obligaciones legales, tributarias y contables.
            </strong>{" "}
            <span className="text-honey/90">
              Base legal: cumplimiento de obligación legal.
            </span>{" "}
            Se aplica, por ejemplo, al emitir comprobantes de venta.
          </li>
        </ul>
        <p>
          <em>
            No utilizamos tus datos para publicidad, venta a terceros, perfiles
            automatizados ni decisiones que produzcan efectos jurídicos sobre
            ti.
          </em>
        </p>
      </Section>

      <Section title="4. Base legal del tratamiento">
        <p>
          Cada tratamiento se apoya en una de estas cuatro bases, previstas en
          la Ley N.º 29733 de Protección de Datos Personales:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Consentimiento.</strong> Tu
            autorización expresa, revocable en cualquier momento. La usamos para
            la aceptación de esta política y los Términos, y para el
            consentimiento de cookies.
          </li>
          <li>
            <strong className="text-cream">Ejecución del contrato.</strong>{" "}
            Necesaria para prestarte el servicio que solicitaste al registrarte
            o al comprar.
          </li>
          <li>
            <strong className="text-cream">
              Cumplimiento de una obligación legal.
            </strong>{" "}
            Cuando la ley nos obliga a conservar o comunicar información.
          </li>
          <li>
            <strong className="text-cream">Interés legítimo.</strong> Medidas
            razonables para la seguridad de la tienda y la prevención de abuso.
            No prevalecen sobre tus derechos.
          </li>
        </ul>
      </Section>

      <Section title="5. ¿Con quién compartimos tus datos?">
        <p>
          No vendemos ni cedemos tus datos. Solo acceden a ellos los proveedores
          que hacen posible el servicio, cada uno limitado a lo indispensable y
          sujeto a sus propias políticas de privacidad:
        </p>
        <ul className="list-disc space-y-2.5 pl-5">
          <li>
            <strong className="text-cream">
              Google Firebase (Authentication, Firestore y Storage).
            </strong>{" "}
            Gestiona tu autenticación y el almacenamiento cifrado de tus datos
            de cuenta y de apiario.{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-honey underline-offset-4 hover:underline"
            >
              Política de privacidad de Google
            </a>
          </li>
          <li>
            <strong className="text-cream">Cloudinary.</strong> Aloja y optimiza
            las imágenes que subes, es decir fotos de inspecciones y fotografías
            de producto. Las imágenes se referencian mediante un identificador,
            no se publican junto con tus datos personales.{" "}
            <a
              href="https://cloudinary.com/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-honey underline-offset-4 hover:underline"
            >
              Política de privacidad de Cloudinary
            </a>
          </li>
          <li>
            <strong className="text-cream">Vercel.</strong> Aloja el código y
            sirve la aplicación. Desde allí no accedemos al contenido de tu base
            de datos.{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-honey underline-offset-4 hover:underline"
            >
              Política de privacidad de Vercel
            </a>
          </li>
          <li>
            <strong className="text-cream">WhatsApp (Meta).</strong> Si
            coordinas un pedido por WhatsApp, esa conversación se rige por la
            política de{" "}
            <a
              href="https://www.whatsapp.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-honey underline-offset-4 hover:underline"
            >
              WhatsApp
            </a>
            . La inicio tú de forma voluntaria.
          </li>
          <li>
            <strong className="text-cream">Autoridades públicas.</strong> Solo
            cuando la ley nos obliga.
          </li>
        </ul>
      </Section>

      <Section title="6. Transferencias internacionales de datos">
        <p>
          Tus datos se almacenan en servidores ubicados fuera del Perú. Esto
          ocurre porque parte de los proveedores que usamos tienen su
          infraestructura en Estados Unidos y la Unión Europea:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Google Firebase, con centros de datos principalmente en Estados
            Unidos.
          </li>
          <li>
            Cloudinary, con infraestructura en Estados Unidos y la Unión
            Europea.
          </li>
          <li>Vercel, con infraestructura en Estados Unidos.</li>
        </ul>
        <p>
          Cuando esto ocurre, esos proveedores actúan como encargados del
          tratamiento y están obligados a mantener un nivel de protección
          equivalente al nuestro, conforme a las cláusulas contractuales tipo
          que exige la normativa aplicable.
        </p>
      </Section>

      <Section title="7. ¿Cuánto tiempo conservamos tus datos?">
        <p>Los plazos dependen de para qué se recogieron:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">
              Datos de cuenta y de apiario:
            </strong>{" "}
            mientras tu cuenta esté activa. Puedes solicitar su eliminación
            cuando la cierres.
          </li>
          <li>
            <strong className="text-cream">Fotos de inspecciones:</strong> el
            mismo plazo que el registro al que pertenecen, salvo que decidas
            eliminarlas antes.
          </li>
          <li>
            <strong className="text-cream">Datos de pedidos:</strong> cinco (5)
            años desde la fecha de cada compra, por obligación contable y
            tributaria.
          </li>
          <li>
            <strong className="text-cream">
              Registro de aceptación de esta política:
            </strong>{" "}
            mientras mantengas la relación y, tras su fin, por el plazo legal de
            prescripción.
          </li>
          <li>
            <strong className="text-cream">
              Datos guardados en tu navegador:
            </strong>{" "}
            hasta que los borres tú mismo desde los ajustes de tu dispositivo.
          </li>
        </ul>
        <p>
          Vencido el plazo, los eliminamos o anonimizamos de modo que ya no sea
          posible identificarte.
        </p>
      </Section>

      <Section title="8. Tus derechos (Ley N.º 29733)">
        <p>
          Conforme al artículo 14 de la Ley N.º 29733 y a su Reglamento (Decreto
          Supremo N.º 003-2013-JUS), tienes derecho a:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Acceso:</strong> saber qué datos
            tuyos tratamos, para qué los usamos y qué terceros los acceden.
          </li>
          <li>
            <strong className="text-cream">Rectificación:</strong> corregir
            datos inexactos, incompletos o desactualizados.
          </li>
          <li>
            <strong className="text-cream">Cancelación:</strong> pedir que
            eliminemos tus datos cuando ya no sean necesarios.
          </li>
          <li>
            <strong className="text-cream">Oposición:</strong> oponerte al
            tratamiento basado en interés legítimo o retirar tu consentimiento.
          </li>
          <li>
            <strong className="text-cream">Portabilidad:</strong> recibir tus
            datos en un formato estructurado y de uso común, para llevarlos a
            otro proveedor.
          </li>
          <li>
            <strong className="text-cream">
              Información sobre el tratamiento:
            </strong>{" "}
            conocer las finalidades, los plazos y las condiciones de
            conservación.
          </li>
          <li>
            <strong className="text-cream">
              No ser objeto de decisiones automatizadas
            </strong>{" "}
            que produzcan efectos jurídicos sobre ti o te afecten
            significativamente.
          </li>
        </ul>
        <p>
          <strong className="text-cream">Cómo ejercerlos.</strong> Escribe a{" "}
          <ContactEmail /> indicando tu nombre, el correo asociado a tu cuenta,
          el derecho que quieres ejercer y el detalle de lo solicitado. También
          puedes hacerlo desde la aplicación, en Ajustes, con la opción de
          borrar tus datos.
        </p>
        <p>
          <strong className="text-cream">Plazo de respuesta.</strong>{" "}
          Respondemos en un plazo máximo de{" "}
          <strong className="text-cream">quince (15) días hábiles</strong> desde
          la recepción de la solicitud, prorrogable por cinco (5) días hábiles
          más cuando la complejidad lo justifique, en cuyo caso te avisamos
          antes del vencimiento. Si denegamos la solicitud, te explicamos el
          motivo por escrito y te informamos de que puedes reclamar ante la
          Autoridad Nacional de Protección de Datos Personales.
        </p>
      </Section>

      <Section title="9. Seguridad de tus datos">
        <p>
          Medidas técnicas y organizativas con las que protegemos tu
          información:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Toda la aplicación se sirve cifrada con{" "}
            <strong className="text-cream">HTTPS/TLS</strong>, de modo que la
            información viaja cifrada.
          </li>
          <li>
            Tu contraseña nunca se almacena en nuestros servidores: la gestiona
            Firebase Authentication de forma cifrada.
          </li>
          <li>
            Tus datos de cuenta y de apiario se guardan en una base de datos con{" "}
            <strong className="text-cream">reglas de acceso</strong>: cada
            usuario solo puede leer y escribir lo suyo.
          </li>
          <li>
            El acceso de administración está restringido a las cuentas
            habilitadas por nosotros, y sus sesiones expiran automáticamente
            para reducir el riesgo de acceso no autorizado.
          </li>
          <li>
            Desde tu navegador puedes borrar todos tus datos guardados en el
            dispositivo cuando quieras.
          </li>
        </ul>
        <p>
          Ninguna transmisión por internet es totalmente segura, pero aplicamos
          medidas razonables para minimizar el riesgo. Si detectamos una brecha
          que afecte a tus datos, te avisaremos sin demora y, cuando el riesgo
          lo justifique, lo comunicaremos a la Autoridad Nacional de Protección
          de Datos Personales.
        </p>
      </Section>

      <Section title="10. Menores de edad">
        <p>
          Esta aplicación está dirigida a personas mayores de 18 años. Los
          menores de 14 años no pueden registrarse por sí mismos: debe hacerlo
          una persona adulta responsable. Si tenemos constancia de que un menor
          nos ha proporcionado datos sin esa validación, avísanos y los
          eliminaremos.
        </p>
      </Section>

      <Section title="11. Cambios en esta política">
        <p>
          Podemos actualizar esta política por cambios legales, técnicos o del
          servicio. Los cambios relevantes te los comunicaremos con un aviso
          dentro de la aplicación y, si son importantes, te pediremos que
          aceptes la versión nueva al volver a entrar. La fecha de última
          actualización y el número de versión figuran al final de esta página.
        </p>
      </Section>

      <Section title="12. Contacto del responsable">
        <p>
          Para ejercer cualquier derecho o resolver una consulta sobre esta
          política, escríbenos a <ContactEmail />. Si tienes una reclamación
          sobre el tratamiento de tus datos, puedes dirigirte también a la{" "}
          <strong className="text-cream">
            Autoridad Nacional de Protección de Datos Personales
          </strong>
          , ente rector del sistema nacional de protección de datos personales
          en el Perú.
        </p>
      </Section>

      <Section title="Última actualización y versión">
        <p>
          <strong className="text-cream">Última actualización:</strong>{" "}
          {UPDATED_AT}
        </p>
        <p>
          <strong className="text-cream">Versión:</strong> 1.0
        </p>
        <p>
          <strong className="text-cream">Normativa aplicable:</strong> Ley N.º
          29733 de Protección de Datos Personales y su Reglamento (Decreto
          Supremo N.º 003-2013-JUS); Ley N.º 29571, Código de Protección y
          Defensa del Consumidor; Ley N.º 30096, Ley de Delitos Informáticos.
        </p>
      </Section>
    </>
  );
}
