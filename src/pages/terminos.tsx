import LegalShell from './LegalShell';

// ============================================================
// Términos y Condiciones de la tienda — Apiarios Carrión
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 border-honey/15 p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-honey">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-husk">{children}</div>
    </section>
  );
}

export default function Terminos() {
  return (
    <LegalShell badge="TÉRMINOS" title="Términos y Condiciones" updatedAt="22 de septiembre de 2026">
      <Section title="1. Objeto del contrato">
        <p>
          Estos términos regulan la venta de <strong className="text-cream">productos apícolas</strong> de{' '}
          <strong className="text-cream">Apiarios Carrión</strong> (miel, polen, propóleo, jalea real, cera,
          herramientas para apicultura y material biológico). Al realizar un pedido a través de la tienda
          aceptas estos términos en su totalidad.
        </p>
      </Section>

      <Section title="2. Productos disponibles">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Productos naturales: miel multifloral, miel en panal, polen, propóleo y jalea real.</li>
          <li>Herramientas y equipos para apicultura.</li>
          <li>Material biológico (reinas, núcleos y cámaras de cría), bajo pedido.</li>
        </ul>
        <p>
          Las imágenes son orientativas; los productos naturales pueden variar ligeramente de color y
          textura según la floración.
        </p>
      </Section>

      <Section title="3. Precios y formas de pago">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Todos los precios se expresan en <strong className="text-cream">soles peruanos (S/)</strong>.</li>
          <li>Algunos productos (material biológico) muestran «precio por consultar».</li>
          <li>El pago se realiza preferentemente <strong className="text-cream">contra entrega</strong> en efectivo, Yape o transferencia.</li>
          <li>Los precios pueden ajustarse con aviso previo; el precio aplicable es el vigente al confirmar el pedido.</li>
        </ul>
      </Section>

      <Section title="4. Proceso de compra">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Añade los productos al carrito y finaliza tu pedido por WhatsApp.</li>
          <li>Recibirás la confirmación en un plazo de <strong className="text-cream">24 a 48 horas</strong>.</li>
          <li>Coordinamos contigo la entrega, el pago y cualquier detalle del material biológico.</li>
        </ol>
        <p>
          El pedido se considera confirmado únicamente cuando el vendedor responde por WhatsApp aceptando la
          solicitud.
        </p>
      </Section>

      <Section title="5. Política de entrega y envíos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Las entregas se <strong className="text-cream">coordinan directamente</strong> con el cliente (punto de recojo, envío o entrega en Huaraz, Áncash).</li>
          <li>El material biológico (abejas vivas) requiere coordinación previa de fecha y horario para minimizar el estrés del traslado.</li>
          <li>No garantizamos tiempos de envío por agencias externas, pero te pasamos el seguimiento correspondiente.</li>
        </ul>
      </Section>

      <Section title="6. Desistimiento y devoluciones">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Puedes <strong className="text-cream">anular tu pedido sin costo</strong> mientras no se haya despachado.</li>
          <li>Los productos naturales cerrados no tienen cambios, salvo defecto o error en el despacho.</li>
          <li>La miel, en sus condiciones normales, tiene una larga conservación; la jalea real y el material biológico requieren manejo inmediato.</li>
        </ul>
      </Section>

      <Section title="7. Garantía de los productos">
        <p>
          Garantizamos que los productos se entregan en buen estado y con la calidad propia del apiario. Por
          ser productos naturales, no ofrecemos garantía frente a un uso incorrecto ni frente a reacciones
          alérgicas: la miel y el polen <strong className="text-cream">no deben consumirse por menores de 1 año</strong>,
          y las personas alérgicas deben consultar a su médico.
        </p>
      </Section>

      <Section title="8. Limitación de responsabilidad">
        <p>
          Apiarios Carrión no se responsabiliza por malestares derivados del <strong className="text-cream">uso de los
          productos</strong> cuando se ignoran las recomendaciones de consumo, ni por daños a terceros o colmenas
          ajenas causados por el mal manejo del material biológico o las herramientas adquiridas.
        </p>
      </Section>

      <Section title="9. Propiedad intelectual">
        <p>
          El nombre, logotipo, textos, fotografías y diseño de esta tienda son de Apiarios Carrión o de sus
          correspondientes autores. Queda prohibida su reproducción o uso comercial sin autorización escrita.
        </p>
      </Section>

      <Section title="10. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por la legislación de la <strong className="text-cream">República del Perú</strong> (incluida
          la Ley N.º 29733 de Protección de Datos Personales y el Código de Protección y Defensa del
          Consumidor). Para cualquier controversia, las partes se someten a los jueces y tribunales de{' '}
          <strong className="text-cream">Huaraz, Áncash</strong>, salvo disposición legal en contrario.
        </p>
      </Section>
    </LegalShell>
  );
}