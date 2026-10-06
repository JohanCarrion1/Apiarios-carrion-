import { WHATSAPP_LABEL } from "../../config";
import {
  LegalSection as Section,
  LegalContactEmail as ContactEmail,
  LEGAL_UPDATED_AT as UPDATED_AT,
} from "./LegalParts";

/**
 * Contenido de TerminosContent: las mismas secciones que se muestran en la ruta pública,
 * sin el `LegalShell` alrededor. Eso permite pintarlo tanto en la página como
 * dentro de la superposición del modal de aceptación.
 */
export default function TerminosContent() {
  return (
    <>
      <Section title="1. Aceptación de los términos">
        <p>
          Estos Términos y Condiciones regulan el acceso y uso de la aplicación
          de <strong className="text-cream">Apiarios Carrión</strong> y de la
          tienda en línea que ofrece. Al registrarte, al marcar las casillas de
          aceptación y al realizar un pedido, declaras haber leído, entendido y
          aceptado en su totalidad estos Términos y la{" "}
          <a
            href="/privacidad"
            className="text-honey underline-offset-4 hover:underline"
          >
            Política de Privacidad
          </a>
          .
        </p>
        <p>
          Si no estás de acuerdo con alguno de estos apartados, no utilices la
          aplicación. El uso del servicio implica tu aceptación.
        </p>
      </Section>

      <Section title="2. Descripción del servicio">
        <p>
          Apiarios Carrión es una apicultura de altura ubicada en Huaraz,
          Áncash. La aplicación ofrece:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Una herramienta de gestión apícola para registrar colmenas, núcleos,
            revisiones e inspecciones.
          </li>
          <li>
            El control de inventarios, cosechas, tareas y recordatorios de
            manejo.
          </li>
          <li>La documentación de floración y otros registros de campo.</li>
          <li>Una tienda en línea con productos apícolas y herramientas.</li>
          <li>
            Un panel de administración para la gestión del catálogo y los
            pedidos.
          </li>
        </ul>
        <p>
          El servicio se ofrece tal como está. Podemos incorporar, modificar o
          retirar funcionalidades conforme lo explicamos en el apartado 15.
        </p>
      </Section>

      <Section title="3. Registro de usuario">
        <p>
          Para usar la aplicación debes registrarte. Al hacerlo te comprometes
          a:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Ser <strong className="text-cream">mayor de 18 años</strong> o
            contar con la autorización de tu tutor.
          </li>
          <li>
            Proporcionar información{" "}
            <strong className="text-cream">veraz, exacta y actualizada</strong>.
          </li>
          <li>
            Custodiar tus credenciales de acceso. Cada cuenta es personal e
            intransferible, y eres responsable de toda la actividad que se
            realize en ella.
          </li>
          <li>
            Avisarnos de inmediato si detectas un acceso no autorizado en tu
            cuenta.
          </li>
        </ul>
        <p>
          Podemos suspender el registro o cancelar una cuenta si los datos son
          falsos, si la cuenta se comparte con terceros o si su uso vulnera
          estos Términos.
        </p>
      </Section>

      <Section title="4. Uso aceptable">
        <p>
          Al usar la aplicación te comprometes a{" "}
          <strong className="text-cream">no</strong> a:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Hacer ingeniería inversa, descompilar o intentar obtener el código
            fuente de la aplicación.
          </li>
          <li>
            Copiar, modificar o redistribuir la aplicación, su diseño o su
            código.
          </li>
          <li>
            Suplantar la identidad de otra persona o cuenta de la que no seas
            titular.
          </li>
          <li>
            Acceder a cuentas ajenas o intentar saltarte los controles de
            seguridad.
          </li>
          <li>
            Usar la aplicación con fines ilegales, fraudulentos o contrarios al
            ordenamiento jurídico peruano.
          </li>
          <li>
            Saturar el servicio con solicitudes automatizadas, scripts, robots o
            ataques de denegación de servicio.
          </li>
          <li>Introducir virus, malware o código dañino.</li>
          <li>
            Publicar contenido falso, ofensivo o que vulnere derechos de
            terceros.
          </li>
        </ul>
        <p>
          Podemos bloquear tu acceso si detectamos un uso contrario a lo
          anterior, sin perjuicio de las responsabilidades legales que
          correspondan.
        </p>
      </Section>

      <Section title="5. Propiedad intelectual">
        <p>
          La aplicación, su diseño, su nombre, su logotipo, sus textos, sus
          fotografías, su código y los elementos que la componen son propiedad
          de <strong className="text-cream">Apiarios Carrión</strong> o de sus
          licenciantes, y están protegidos por la Ley N.º 28411, Ley de
          Propiedad Intelectual.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Contenido de la tienda.</strong> Las
            descripciones, fotografías, marcas y presentaciones de los productos
            pertenecen a sus respectivos titulares o a nosotros.
          </li>
          <li>
            <strong className="text-cream">Tus datos.</strong> Los registros que
            creas (colmenas, revisiones, inventarios, cosechas) siguen siendo
            tuyos. Nos concedes solo una licencia limitada para alojarlos y
            mostrarlos dentro de la aplicación.
          </li>
        </ul>
        <p>
          Queda prohibida la reproducción del contenido de esta aplicación sin
          autorización previa por escrito.
        </p>
      </Section>

      <Section title="6. Productos, precios y disponibilidad">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Los{" "}
            <strong className="text-cream">
              precios están expresados en soles (S/)
            </strong>{" "}
            y pueden cambiar sin previo aviso. El precio quenezca es el vigente
            en el momento de confirmar el pedido.
          </li>
          <li>
            Las{" "}
            <strong className="text-cream">
              fotografías son referenciales
            </strong>
            . Como la apicultura es un producto natural, el color, el tamaño, la
            textura y la etiqueta de cada lote pueden variar.
          </li>
          <li>
            La{" "}
            <strong className="text-cream">
              disponibilidad está sujeta a stock
            </strong>
            . Si un producto se agota, te lo avisaremos y podrás elegir otro o
            solicitar la devolución del dinero.
          </li>
          <li>
            Los{" "}
            <strong className="text-cream">envíos mínimos y condiciones</strong>{" "}
            se indican antes de confirmar cada pedido.
          </li>
        </ul>
      </Section>

      <Section title="7. Proceso de compra">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Eliges los productos y los agregas al carrito.</li>
          <li>Completas tus datos de contacto y la forma de entrega.</li>
          <li>Envías tu solicitud de pedido por WhatsApp o correo.</li>
          <li>
            Confirmamos la disponibilidad y te informamos el costo final y la
            forma de pago.
          </li>
          <li>Realizas el pago según lo acordado.</li>
          <li>
            Preparamos y despachamos el pedido, y te enviamos la confirmación.
          </li>
        </ol>
        <p>
          La confirmación del pedido por parte de Apiarios Carrión es el momento
          en que el contrato de compraventa queda aceptado. Nos comprometemos a
          responderte en un plazo razonable, normalmente dentro de las 24 horas
          hábiles siguientes a tu consulta.
        </p>
      </Section>

      <Section title="8. Formas de pago">
        <p>Aceptamos los siguientes medios de pago:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Yape</strong> (a número de teléfono a
            nombre de Apiarios Carrión).
          </li>
          <li>
            <strong className="text-cream">Transferencia bancaria</strong> a una
            cuenta a nuestro nombre.
          </li>
          <li>
            <strong className="text-cream">Efectivo contra entrega</strong>, en
            las zonas donde realizamos entrega a domicilio.
          </li>
        </ul>
        <p>
          <strong className="text-cream">
            La aplicación no procesa pagos con tarjeta de crédito o débito
          </strong>{" "}
          ni almacena datos de tarjetas. Cualquier referencia a pasarelas de
          pago en la interfaz es informativa.
        </p>
        <p>
          Los pagos por adelantado se consideran realizados cuando el banco o la
          plataforma confirma la acreditación. No se inicia la preparación del
          pedido hasta entonces.
        </p>
      </Section>

      <Section title="9. Envío y entrega">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Cobertura:</strong> envíos a Huaraz y
            envíos por encomienda a otras ciudades del Perú, según
            disponibilidad. Te confirmamos si tu dirección está cubierta antes
            de cobrarte el envío.
          </li>
          <li>
            <strong className="text-cream">Tiempos estimados:</strong> entre 2 y
            7 días hábiles en Lima y Metropolitana, y entre 3 y 10 días hábiles
            en el interior del país. Son plazos estimados y pueden variar por la
            agencia de transporte.
          </li>
          <li>
            <strong className="text-cream">Costos:</strong> se calculan según el
            destino y el peso del pedido. Se comunican antes de confirmar el
            pedido.
          </li>
          <li>
            <strong className="text-cream">
              Material biológico y colmenas vivas:
            </strong>{" "}
            por su naturaleza y la bioseguridad, requieren coordinación previa
            de fecha, hora y lugar de entrega.
          </li>
          <li>
            <strong className="text-cream">Recepción:</strong> revisa el pedido
            en el momento de recibirlo. Si el empaque llega dañado o incompleto,
            anótalo en el acta de entrega y avísanos el mismo día.
          </li>
        </ul>
      </Section>

      <Section title="10. Devoluciones y reembolsos">
        <p>
          Conforme al artículo 56 del Código de Protección y Defensa del
          Consumidor, el consumidor tiene derecho a que se le devuelva el
          importe pagado, dentro de los 7 días calendario de la entrega.
        </p>
        <p>
          <strong className="text-cream">Condiciones para devolver:</strong>
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            El producto se entrega sin uso, con su empaque original y sin daño.
          </li>
          <li>
            La solicitud se realiza dentro del plazo indicado, con evidencia de
            la fecha de entrega.
          </li>
          <li>
            Se devuelve el importe pagado por el producto; los costos de envío
            no son reembolsables salvo por error de nuestra parte o producto
            defectuoso.
          </li>
        </ul>
        <p>
          <strong className="text-cream">
            Excepciones — no admiten devolución:
          </strong>
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">
              Productos perecederos y de consumo:
            </strong>{" "}
            miel, polen, propóleo, jalea real y alimentos en general, por su
            naturaleza y su riesgo para la salud. Una vez abierto el /envoltura,
            no admiten devolución por tratarse de productos de consumo no
            almacenables.
          </li>
          <li>Productos personalizados a solicitud.</li>
          <li>
            Material biológico y colmenas vivas, por la impossibility de
            devolver su estado original.
          </li>
          <li>
            Descuentos y promociones aplicadas, salvo que el descuento derive de
            un error nuestro.
          </li>
        </ul>
        <p>
          El reembolso se efectúa por el mismo medio de pago utilizado, en un
          plazo máximo de 15 días hábiles desde la aprobación de la devolución.
        </p>
      </Section>

      <Section title="11. Garantía de los productos">
        <p>
          <strong className="text-cream">
            Productos naturales (miel, polen, propóleo, jalea real):
          </strong>
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Garantizamos que son productos apícolas de origen natural,
            elaboration artesanal y sin conservantes añadidos.
          </li>
          <li>
            Por ser productos naturales, pueden presentar cristalización,
            sedimentación, cambio de color o variaciones organolépticas. Esto es
            propio del producto y no constituye defecto.
          </li>
          <li>
            Deben conservarse en lugar seco, fresco y cerrado, y consumirse
            según el contenedor indicado en la etiqueta.
          </li>
        </ul>
        <p>
          <strong className="text-cream">Herramientas y equipos:</strong>
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Garantía por defectos de fabricación durante el plazo indicado en la
            ficha del producto o, en su defecto, 6 meses.
          </li>
          <li>
            La garantía cubre defectos de fabricación, no el desgaste por uso,
            daños por mala manipulación, golpes o uso indebido.
          </li>
        </ul>
        <p>
          Para hacer efectiva la garantía, escríbenos a <ContactEmail />
          {WHATSAPP_LABEL ? ` o por WhatsApp al ${WHATSAPP_LABEL}` : ""} con una
          descripción del problema y, si es posible, una fotografía del
          producto.
        </p>
      </Section>

      <Section title="12. Limitación de responsabilidad">
        <p>
          La aplicación se proporciona{" "}
          <strong className="text-cream">
            «tal cual» y «según disponibilidad»
          </strong>
          , sin garantía de que funcione sin interrupciones ni errores. Para
          evitar dudas, esto no afecta a tus derechos como consumidor, que se
          rigen por el Código de Protección y Defensa del Consumidor.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            No respondemos por daños indirectos, pérdida de oportunidades o
            lucro cesante derivados del uso de la aplicación.
          </li>
          <li>
            No somos responsables de la pérdida de datos no sincronizados si el
            dispositivo se daña, se pierde o se borra antes de la
            sincronización. Te recomendamos mantener las copias de seguridad que
            la aplicación ofrece.
          </li>
          <li>
            La información que registras sobre tus apiarios es una ayuda al
            registro y no sustituye el criterio de un técnico apícola.
          </li>
          <li>
            Nuestra responsabilidad por los productos vendidos queda limitada al
            valor del producto o del pedido según corresponda.
          </li>
        </ul>
      </Section>

      <Section title="13. Caso fortuito o fuerza mayor">
        <p>
          No somos responsables del incumplimiento de estos Términos cuando sea
          consecuencia de un caso fortuito o de fuerza mayor, que en el ámbito
          de la apicultura incluye de forma expresa:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Desastres naturales, inundaciones, deslizamientos o sequías extrema.
          </li>
          <li>
            Heladas, lluvias persistentes u otras condiciones climáticas que
            afecten la producción apícola.
          </li>
          <li>
            Epidemias fitosanitarias o de salud animal, y alertas sanitarias
            oficiales.
          </li>
          <li>
            Huelgas, disturbios, conflictos sociales o restricciones de las
            autoridades.
          </li>
          <li>
            Fallas de suministro de energía, internet o medios de transporte.
          </li>
        </ul>
        <p>
          En estos casos procuraremos avisarte cuanto antes y adoptaremos las
          medidas razonables para reducir el impacto, incluida la posibilidad de
          reprogramar entregas o derechos de reserva.
        </p>
      </Section>

      <Section title="14. Suspensión y terminación">
        <p>
          Podemos suspender o cancelar tu cuenta si, a nuestra sola decisión y
          sin previo aviso, detectamos:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Uso fraudulento o contrario a estos Términos o a la ley.</li>
          <li>
            Reintentos de acceso no autorizado o uso de sistemas automatizados
            que perjudiquen el servicio.
          </li>
          <li>Suplantación de identidad o falsificación de datos.</li>
          <li>Solicitud expresa de baja solicitada por ti.</li>
        </ul>
        <p>
          Puedes solicitar la cancelación de tu cuenta escribiendo a{" "}
          <ContactEmail />. Al cancelarla, tus datos se eliminan conforme a la
          Política de Privacidad, salvo aquellos que debamos conservar por
          obligación legal.
        </p>
      </Section>

      <Section title="15. Modificación de estos Términos">
        <p>
          Podemos modificar estos Términos para reflejar cambios legales,
          técnicos o comerciales. Los cambios se comunicarán{" "}
          <strong className="text-cream">
            con al menos 15 días de anticipación
          </strong>{" "}
          mediante un aviso dentro de la aplicación y, cuando el cambio sea
          relevante, un mensaje al correo asociado a tu cuenta.
        </p>
        <p>
          Si el cambio afecta de forma sustancial a una relación ya iniciada,
          puedes desistir del contrato dentro de los 15 días siguientes a la
          notificación, sin penalización. La versión vigente y su fecha siempre
          están al final de esta página.
        </p>
      </Section>

      <Section title="16. Legislación aplicable y jurisdicción">
        <p>
          Estos Términos se rigen por las leyes de la{" "}
          <strong className="text-cream">República del Perú</strong>. En
          particular, se aplican la Ley N.º 29571, Código de Protección y
          Defensa del Consumidor, el Código Civil y la Ley N.º 28411 de
          Propiedad Intelectual.
        </p>
        <p>
          Para cualquier controversia, las partes se someten a los{" "}
          <strong className="text-cream">
            juzgados y tribunales del distrito judicial de Huaraz, Áncash
          </strong>
          . No obstante, el usuario puede acudir a{" "}
          <strong className="text-cream">Indecopi</strong> o al{" "}
          <strong className="text-cream">
            Órgano Especializado de Protección y Defensa del Consumidor
          </strong>{" "}
          cuando corresponda por ley, sin perjuicio de las acciones colectivas y
          de los demás mecanismos de protección previstos en el Código.
        </p>
      </Section>

      <Section title="17. Contacto">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-cream">Correo:</strong> <ContactEmail />
          </li>
          {WHATSAPP_LABEL && (
            <li>
              <strong className="text-cream">WhatsApp:</strong> {WHATSAPP_LABEL}
            </li>
          )}
          <li>
            <strong className="text-cream">Domicilio:</strong> Huaraz, Áncash,
            Perú.
          </li>
        </ul>
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
