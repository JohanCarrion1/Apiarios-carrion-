import {
  LegalSection as Section,
  LegalContactEmail as ContactEmail,
  LegalTable as CookieTable,
  LEGAL_UPDATED_AT as UPDATED_AT,
} from "./LegalParts";

/**
 * Contenido de CookiesContent: las mismas secciones que se muestran en la ruta pública,
 * sin el `LegalShell` alrededor. Eso permite pintarlo tanto en la página como
 * dentro de la superposición del modal de aceptación.
 */
export default function CookiesContent() {
  return (
    <>
      <Section title="1. ¿Qué son las cookies y tecnologías similares?">
        <p>
          Una cookie es un pequeño archivo que un sitio web guarda en tu
          dispositivo para recordar información entre visitas. Las tecnologías
          similares cumplen la misma función con otros mecanismos:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Cookies:</strong> archivos enviados
            por el servidor y almacenados por el navegador.
          </li>
          <li>
            <strong className="text-cream">localStorage:</strong> espacio de
            almacenamiento del navegador que conserva datos de texto de forma
            persistente. Es el mecanismo que usa esta aplicación.
          </li>
          <li>
            <strong className="text-cream">sessionStorage:</strong> similar al
            anterior, pero los datos se descartan al cerrar la pestaña.
          </li>
          <li>
            <strong className="text-cream">Píxeles de seguimiento:</strong>{" "}
            imágenes invisibles que registran la navegación en páginas externas.
            No los utilizamos.
          </li>
        </ul>
        <p>
          <strong className="text-cream">Dato importante:</strong> esta
          aplicación{" "}
          <strong className="text-cream">no coloca cookies HTTP</strong> ni
          utiliza píxeles de seguimiento. Los datos que guardamos en tu
          navegador se almacenan con{" "}
          <strong className="text-cream">localStorage</strong> y, salvo el
          consentimiento, solo se utilizan en tu propio equipo.
        </p>
      </Section>

      <Section title="2. Tipos de tecnologías que utilizamos">
        <ul className="list-disc space-y-2.5 pl-5">
          <li>
            <strong className="text-cream">Esenciales (técnicas).</strong>{" "}
            Necesarias para que la aplicación funcione: mantener tu sesión
            iniciada y recordar tu carrito y tus apiarios. No requieren
            consentimiento porque sin ellas el servicio no puede prestarse.
          </li>
          <li>
            <strong className="text-cream">De preferencias.</strong> Guardan tu
            consentimiento a esta política y la última sección que visitaste,
            para mostrarte siempre donde quedaste.
          </li>
          <li>
            <strong className="text-cream">Analíticas.</strong>{" "}
            <strong className="text-cream">No las utilizamos.</strong> Hoy no
            usamos Google Analytics ni herramienta equivalente. Si se incorporan
            en el futuro, te pediremos consentimiento previo y Actualizaremos
            esta tabla antes de activarlas.
          </li>
          <li>
            <strong className="text-cream">De publicidad y seguimiento.</strong>{" "}
            <strong className="text-cream">No las utilizamos.</strong> No hay
            publicidad comportamental, ni perfiles, ni venta de datos a terceros
            con fines de marketing.
          </li>
        </ul>
      </Section>

      <Section title="3. Tabla de tecnologías almacenadas en tu navegador">
        <p>
          Estas son todas las claves que la aplicación guarda en tu dispositivo:
        </p>
        <div className="pt-1">
          <CookieTable
            rows={[
              [
                "panal_v1_cookie_consent",
                "Apiarios Carrión",
                "Recordar que aceptaste o rechazaste esta política.",
                "Persistente",
                "Propia",
              ],
              [
                "panal_v1_admin_session",
                "Apiarios Carrión",
                "Mantener la sesión de administración del catálogo.",
                "7 días",
                "Propia",
              ],
              [
                "panal_v1_terms_[id]",
                "Apiarios Carrión",
                "Registrar que aceptaste los Términos y en qué versión.",
                "Persistente",
                "Propia",
              ],
              [
                "panal_v1_user_[id]_lastView",
                "Apiarios Carrión",
                "Recordar la última sección que visitaste.",
                "Persistente",
                "Propia",
              ],
              [
                "panal_v1_user_[id]_cart",
                "Apiarios Carrión",
                "Guardar los productos de tu carrito de compra.",
                "Persistente",
                "Propia",
              ],
              [
                "panal_v1_user_[id]_[entidad]",
                "Apiarios Carrión",
                "Guardar tus colmenas, núcleos, revisiones, inventarios, cosechas y tareas.",
                "Persistente",
                "Propia",
              ],
              [
                "panal_[clave]",
                "Apiarios Carrión",
                "Ajustes de la aplicación: floración, precios base, recordatorios.",
                "Persistente",
                "Propia",
              ],
            ]}
          />
        </div>
        <p>
          <strong className="text-cream">
            Ningún dato se envía a un servidor de terceros por esta vía.
          </strong>{" "}
          Los datos que no son preferencias (cuenta, apiarios, pedidos) se
          guardan además cifrados en nuestra base de datos, como explicamos en
          la{" "}
          <a
            href="/privacidad"
            className="text-honey underline-offset-4 hover:underline"
          >
            Política de Privacidad
          </a>
          .
        </p>
      </Section>

      <Section title="4. ¿Cómo gestionar o eliminar estas tecnologías?">
        <p>
          Puedes borrarlas cuando quieras desde los ajustes de tu navegador.
          Cada navegador lo hace de forma distinta:
        </p>
        <ul className="list-disc space-y-2.5 pl-5">
          <li>
            <strong className="text-cream">Chrome:</strong> escribe{" "}
            <code className="text-honey">chrome://settings/content/all</code> en
            la barra de direcciones y elimina las entradas que empiece por{" "}
            <em>panal</em>.
          </li>
          <li>
            <strong className="text-cream">Firefox:</strong> menú{" "}
            <strong className="text-cream">☰ → Configuración</strong>, luego{" "}
            <strong className="text-cream">Privacidad y seguridad</strong>, en{" "}
            <strong className="text-cream">Cookies y datos de sitios</strong> →{" "}
            <strong className="text-cream">Administrar datos de sitios</strong>{" "}
            y borra las entradas de <em>panal</em>.
          </li>
          <li>
            <strong className="text-cream">Safari:</strong>{" "}
            <strong className="text-cream">Ajustes → Privacidad</strong>,
            desactiva{" "}
            <strong className="text-cream">
              Evitar el seguimiento entre sitios
            </strong>{" "}
            y elimina los datos desde{" "}
            <strong className="text-cream">
              Administrar datos de sitios web
            </strong>
            .
          </li>
          <li>
            <strong className="text-cream">Edge:</strong>{" "}
            <strong className="text-cream">
              ⋮ → Configuración → Cookies y datos de sitios
            </strong>
            , luego{" "}
            <strong className="text-cream">
              Ver todos los datos y permisos
            </strong>{" "}
            y elimina lo relacionado con <em>panal</em>.
          </li>
          <li>
            <strong className="text-cream">Móvil:</strong> en Chrome y Safari
            abre la configuración de tu navegador, busca{" "}
            <strong className="text-cream">almacenamiento</strong> o{" "}
            <strong className="text-cream">datos de sitios</strong> y elimina el
            sitio. También puedes borrar los datos desde la propia aplicación,
            en Ajustes, con la opción de borrar todos mis datos.
          </li>
        </ul>
      </Section>

      <Section title="5. Consentimiento">
        <p>
          Al entrar por primera vez te mostramos un aviso para que decidas si
          aceptas. Puedes aceptarlo o rechazarlo; ambas opciones te permiten
          navegar y comprar. Tu elección queda guardada en tu navegador y no se
          vuelve a preguntar en cada visita.
        </p>
        <p>
          <strong className="text-cream">Cómo retirarlo.</strong> Puedes retirar
          tu consentimiento en cualquier momento borrando la clave{" "}
          <code className="text-honey">panal_v1_cookie_consent</code> con los
          pasos del apartado anterior, o escribiendo a <ContactEmail />. Ten en
          cuenta que el rechazo no afecta a las cookies esenciales, que siguen
          activas porque son necesarias para el funcionamiento del servicio.
        </p>
      </Section>

      <Section title="6. Consecuencias de desactivar estas tecnologías">
        <p>
          Puedes bloquear o borrar datos en tu navegador, pero algunas funciones
          dejarán de estar disponibles:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Si borras las esenciales:</strong> se
            cerrará tu sesión y el carrito de compra se vaciará. Tendrás que
            volver a iniciar sesión.
          </li>
          <li>
            <strong className="text-cream">
              Si bloqueas el almacenamiento local:
            </strong>{" "}
            la aplicación puede no funcionar correctamente, no se guardarán tus
            apiarios en el dispositivo y podrían perderse los datos que aún no
            se han sincronizado con el servidor.
          </li>
          <li>
            <strong className="text-cream">
              Si rechazas las preferencias:
            </strong>{" "}
            se mostrará de nuevo el aviso de cookies en cada visita y la tienda
            no recollections qué sección visitabas por última vez.
          </li>
        </ul>
        <p>
          <strong className="text-cream">Recomendación:</strong> conserva el
          almacenamiento local activo para que la aplicación funcione de forma
          completa.
        </p>
      </Section>

      <Section title="7. Cambios en esta política">
        <p>
          Podemos modificar esta política para incorporar nuevas tecnologías o
          para cumplir cambios legales. Si Si en algún momento llegáramos a usar
          cookies analíticas, de publicidad o píxeles de seguimiento, te
          avisaremos y pediremos tu consentimiento antes de activarlas. La fecha
          de última actualización figura al final de esta página.
        </p>
      </Section>

      <Section title="8. Contacto">
        <p>
          Para resolver cualquier duda sobre esta política, escríbenos a{" "}
          <ContactEmail /> o usa el WhatsApp publicado en la tienda.
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
      </Section>
    </>
  );
}
