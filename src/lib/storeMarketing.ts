/**
 * Contenido de marketing de la tienda pública (/tienda).
 *
 * TODO(Firestore): todo lo de este archivo es MOCK y está pensado para mapear
 * 1:1 contra una colección `store_content` (un documento por bloque) para poder
 * editarlo desde el panel admin sin tocar código. La forma de cada tipo ya es
 * la que tendría el documento, así que la migración es solo `getDocs` + `setDoc`:
 *
 *   store_content/cifras    -> { items: Cifra[] }
 *   store_content/testimonios-> { items: Testimonio[] }
 *   store_content/garantias -> { items: Garantia[] }
 *   store_content/preguntas -> { items: PreguntaFrecuente[] }
 *   store_content/datosMiel -> { items: DatoMiel[] }
 *
 * Los tipos NO deben cambiar de forma al conectar Firestore; solo la fuente.
 * Se mantienen como datos estáticos a propósito (sin import de Firebase) para que
 * estos componentes se puedan renderizar en tests o Storybook sin emulador.
 */

export interface Cifra {
  id: string;
  /** Valor final animado. Puede ser decimal (nota media 4.9). */
  valor: number;
  /** Prefijo y sufijo se pintan pegados al número: "3,052", "4.9", "12+", "24 h". */
  prefijo?: string;
  sufijo?: string;
  /** Decimales a mostrar (para 4.9). Por defecto 0. */
  decimales?: number;
  titulo: string;
  detalle: string;
}

export interface Testimonio {
  id: string;
  autor: string;
  /** Iniciales para el avatar de reserva (sin foto real). */
  iniciales: string;
  ciudad: string;
  producto: string;
  /** Nota 1–5. Se pinta como estrellas. */
  nota: number;
  texto: string;
  fecha: string;
}

export interface Garantia {
  id: string;
  emoji: string;
  titulo: string;
  texto: string;
}

export interface PreguntaFrecuente {
  id: string;
  pregunta: string;
  respuesta: string;
}

export interface DatoMiel {
  id: string;
  emoji: string;
  titulo: string;
  texto: string;
}

/* ---- Bloque: cifras del apiario (landing) ---- */
export const CIFRAS_DEMO: Cifra[] = [
  {
    id: 'altitud',
    valor: 3052,
    titulo: 'metros de altitud',
    detalle: 'Atipayán, al pie de la Cordillera Blanca',
  },
  {
    id: 'colmenas',
    valor: 18,
    sufijo: '+',
    titulo: 'colmenas activas',
    detalle: 'Colonias criadas y seleccionadas en el propio apiario',
  },
  {
    id: 'anios',
    valor: 12,
    sufijo: '+',
    titulo: 'años criando reinas',
    detalle: 'Genética propia adaptada al frío de la sierra',
  },
  {
    id: 'nota',
    valor: 4.9,
    decimales: 1,
    sufijo: '/5',
    titulo: 'valoración media',
    detalle: 'Seguidores de compras que recomiendan la miel',
  },
];

/* ---- Bloque: "Sabías que" (rotativo) ---- */
export const DATOS_MIEL_DEMO: DatoMiel[] = [
  {
    id: 'cristaliza',
    emoji: '🍯',
    titulo: 'Si cristaliza, es buena señal',
    texto:
      'La miel de altura cristaliza más rápido que la de llano, porque el aire seco de la sierra le roba humedad al néctar. Ese cristalizado no la arruina: la conserva. Para volverla líquida, basta con baño maría suave, sin microondas.',
  },
  {
    id: 'millones',
    emoji: '🌼',
    titulo: 'Un kilo, millones de flores',
    texto:
      'Para producir un solo kilo de miel, las abejas deben visitar entre 2 y 3 millones de flores. En nuestro apiario eso significa recorrer la floración andina entera, flor a flor, durante semanas.',
  },
  {
    id: 'enzimas',
    emoji: '🔬',
    titulo: 'Por qué no pasteurizamos',
    texto:
      'Calentar la miel por encima de 45 °C destruye sus enzimas y acelera el oscurecimiento. La nuestra sale del panal cruda, con su aroma y sus enzimas intactas: por eso puede cristalizar y por eso sabe distinto.',
  },
  {
    id: 'durable',
    emoji: '🫙',
    titulo: 'No se estropea, se transforma',
    texto:
      'Sellada y sin humedad, la miel no tiene fecha de caducidad. Con los años pasa a una fermentación lenta que la suaviza y le da un sabor más profundo. Es un producto de despensa, no un perecedero.',
  },
];

/* ---- Bloque: testimonios (carrusel) ---- */
export const TESTIMONIOS_DEMO: Testimonio[] = [
  {
    id: 't1',
    autor: 'Rosa Quispe',
    iniciales: 'RQ',
    ciudad: 'Huaraz',
    producto: 'Miel de eucalipto',
    nota: 5,
    fecha: 'Septiembre 2025',
    texto:
      'Llegó de Huaraz a Lima en dos días y sin una gota derramada. El sabor es totalmente distinto a la miel de supermercado: se nota la floración. Ya pedí la segunda vez.',
  },
  {
    id: 't2',
    autor: 'Jorge Medina',
    iniciales: 'JM',
    ciudad: 'Chimbote',
    producto: 'Núcleo de cría',
    nota: 5,
    fecha: 'Agosto 2025',
    texto:
      'Compré un núcleo criadero y llegó con la reina laying viva y sana. Me dieron seguimiento por WhatsApp los tres días siguientes para preguntar cómo venía. Esa atención no la ves en una tienda online grande.',
  },
  {
    id: 't3',
    autor: 'Lucía Fernández',
    iniciales: 'LF',
    ciudad: 'Trujillo',
    producto: 'Polen natural',
    nota: 5,
    fecha: 'Julio 2025',
    texto:
      'El polen se ve limpio y huele fuerte, nada de eartho. Lo uso a diario y mis colmenas respondieron bien en una temporada de lluvias especialmente dura.',
  },
  {
    id: 't4',
    autor: 'Aníbal Chávez',
    iniciales: 'AC',
    ciudad: 'Ayacucho',
    producto: 'Cera natural',
    nota: 4,
    fecha: 'Junio 2025',
    texto:
      'Buen peso y color parejo para enjambrar. Tuve que escribir para confirmar el envío porque me preocupaba…, pero responden rápido y todo llegó bien.',
  },
];

/* ---- Bloque: garantías (franja de confianza) ---- */
export const GARANTIAS_DEMO: Garantia[] = [
  {
    id: 'envio',
    emoji: '📦',
    titulo: 'Envíos a todo el Perú',
    texto: 'Despachamos en 24 h desde Huaraz, con empaque protegido.',
  },
  {
    id: 'garantia',
    emoji: '🐝',
    titulo: 'Garantía de llegada',
    texto: 'Reinas y núcleos llegan vivos; si no, reponemos.',
  },
  {
    id: 'transparente',
    emoji: '🍯',
    titulo: 'Miel cruda, no pasteurizada',
    texto: 'Cosecha de temporada, sin mezclar ni sobrecalentar.',
  },
  {
    id: 'pago',
    emoji: '📲',
    titulo: 'Pago por Yape o transferencia',
    texto: 'Confirmas el pedido con una foto y lo preparamos.',
  },
];

/* ---- Bloque: preguntas frecuentes (acordeón) ---- */
export const PREGUNTAS_DEMO: PreguntaFrecuente[] = [
  {
    id: 'p1',
    pregunta: '¿Por qué la miel llegó cristalizada?',
    respuesta:
      'Es normal y es buena señal: la miel de altura cristaliza antes porque el aire de la sierra es muy seco. No afecta al sabor ni a la calidad. Si la prefieres líquida, ponla al baño maría o a 40 °C como máximo, nunca al microondas.',
  },
  {
    id: 'p2',
    pregunta: '¿Cuánto tarda el pedido en llegarme?',
    respuesta:
      'Despachamos en las siguientes 24 h tras confirmar el pago. A Lima y costa central suele tardar 1 a 3 días por agencia; a sierra y selva, entre 3 y 7 días. Te enviamos el código de seguimiento por WhatsApp.',
  },
  {
    id: 'p3',
    pregunta: '¿Cómo sé que una reina llega viva?',
    respuesta:
      'Cada núcleo o colmena se prepara con su colonia laying operante y se embala con base alimenticia para las Viajeras. Al recibirlo, míralo al trasluz: si se movió y ves polinización, está en marcha. Si hay cualquier problema, nos escribes y reponemos.',
  },
  {
    id: 'p4',
    pregunta: '¿La miel es apta para niños?',
    respuesta:
      'La miel cruda no se recomienda antes del año de vida por el riesgo de botulismo, igual que cualquier miel comercial. A partir de los 12 meses se puede consumir con normalidad. Ante cualquier duda, consulta con tu pediatra.',
  },
  {
    id: 'p5',
    pregunta: '¿Tienen descuento por volumen o al por mayor?',
    respuesta:
      'Sí, para pedidos de más de 10 unidades te armamos un precio especial. Escríbenos por WhatsApp con la cantidad que necesitas y te cotizamos al instante, sin compromiso.',
  },
];