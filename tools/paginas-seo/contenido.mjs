/**
 * El contenido de las páginas de servicios (SEO y respuestas de IA). Una sola fuente: de aquí salen las páginas
 * (servicios/*.html, servicios.html, en.html), el sitemap, llms.txt y llms-full.txt (`node tools/paginas-seo/build.mjs`).
 *
 * Reglas (CLAUDE.md): OCEAN en títulos; «Ocean Industries» solo como nombre legal. Nada de cifras ni clientes sin
 * aprobar: solo 48 h, 24/7, 11 s y los tres casos. Nada de precios. Lo que no se sabe, no se escribe.
 */

export const SITE = 'https://www.oceanindustries.com.co'
export const UPDATED = '2026-11-20'
export const WA = '573138721665'
export const CAL = 'https://cal.com/ocean-industries-2e5al7/agenda-demo-gratuita'

export const ORG = {
  nombre: 'OCEAN',
  legal: 'Ocean Industries',
  resumen:
    'OCEAN (nombre legal: Ocean Industries) es una empresa de software e ingeniería con inteligencia artificial, con equipo en Cali y Bogotá (Colombia) y presencia en Miami. Diseña y construye software a la medida, agentes de IA para WhatsApp, voz y web, automatización de procesos y webs y tiendas de alto rendimiento para empresas de Colombia, Estados Unidos y Latinoamérica, en español, inglés y portugués.',
  summary:
    'OCEAN (legal name: Ocean Industries) is a software and AI engineering company with teams in Cali and Bogotá, Colombia, and a presence in Miami. It designs and builds custom software, AI agents for WhatsApp, phone and web, process automation and high-performance websites for companies in the United States, Colombia and Latin America, in English, Spanish and Portuguese.',
}

/** Lo que de verdad se usa en los proyectos de OCEAN (brain/infraestructura/capacidades.md). */
export const STACK = [
  'TypeScript',
  'React y Next.js',
  'Node.js',
  'PostgreSQL y Supabase',
  'Vercel',
  'Modelos de Claude y OpenAI',
  'n8n',
  'API de WhatsApp',
  'WebGL y three.js',
  'Wompi (pagos)',
  'Google Workspace',
  'Cal.com',
]

export const PROCESO = [
  {
    t: 'Diagnóstico',
    d: 'Una videollamada de 45 minutos por Google Meet, gratis y sin compromiso. Vemos cómo funciona hoy tu operación, dónde se pierde tiempo o ventas y qué conviene construir primero.',
  },
  {
    t: 'Prototipo en 24 a 48 horas',
    d: 'Antes de cualquier contrato largo ves algo funcionando: una demo navegable o un agente respondiendo con la información de tu negocio. Si te convence, seguimos.',
  },
  {
    t: 'Construcción por etapas',
    d: 'Alcance, etapas y precio por escrito. Cada etapa termina en algo que tu equipo puede usar, no en un informe.',
  },
  {
    t: 'Operación y mejora',
    d: 'Ponemos el sistema en producción, lo medimos con uso real y lo ajustamos. Seguimos disponibles por WhatsApp para cambios y soporte.',
  },
]

export const CASOS = {
  supermachi: {
    nombre: 'El Mesón de Súper Machi',
    lugar: 'Miami, Florida (EE. UU.)',
    url: 'https://supermachirestaurante.com/',
    texto:
      'Restaurante español y cubano con show en vivo casi cada viernes y sábado. Web nueva en español e inglés: la cocina en video, los platos con su precio, la cartelera con una página por show, el menú digital con buscador y reservas por WhatsApp. Web y menú digital publicados y en operación en supermachirestaurante.com.',
    en: 'A Spanish and Cuban restaurant with a live show almost every Friday and Saturday. A new site in Spanish and English: the kitchen on video, dishes with prices, a show calendar with a page per night, a searchable digital menu and WhatsApp bookings. Website and digital menu live at supermachirestaurante.com.',
  },
  humberto: {
    nombre: 'Humberto Garcés',
    lugar: 'Washington, D. C. (EE. UU.)',
    url: 'https://www.humbertogarces.com/',
    texto:
      'Empresario y constructor con 25 años en Washington, D. C. Sitio personal bilingüe hecho como un documental: apertura con su firma y sonido, la entrevista en video por capítulos, su historia en una línea de tiempo y agenda directa. Publicado en humbertogarces.com.',
    en: 'An entrepreneur and builder with 25 years in Washington, D.C. A bilingual personal site made like a documentary: an opening with his signature and sound, the video interview by chapter, his story on a timeline and direct booking. Live at humbertogarces.com.',
  },
  qora: {
    nombre: 'Qora Technologies and Engineering',
    lugar: 'Washington, D. C. (EE. UU.)',
    url: 'https://www.qoratechnologies.com/',
    texto:
      'Firma de IA aliada de OCEAN en Estados Unidos, para empresas, gobiernos y campañas. Web corporativa en inglés con un cristal 3D interactivo, sonido, un asistente para conversar, sus productos y la agenda de diagnósticos. Publicada en qoratechnologies.com.',
    en: 'OCEAN’s partner AI firm in the United States, for companies, governments and campaigns. An English corporate site with an interactive 3D crystal, sound, a conversational assistant, its products and diagnostic booking. Live at qoratechnologies.com.',
  },
  sancho: {
    nombre: 'Sancho Restaurant',
    lugar: 'Miami, Florida (EE. UU.)',
    url: 'https://sanchorestaurantemiami.com/',
    texto:
      'La casa del cochinillo en la Calle Ocho, con una promoción distinta cada día. Web nueva en español e inglés: un sol que muestra la promoción de hoy sobre el plato a pantalla completa, la semana en fotos, pedidos en línea y reservas por WhatsApp. Publicada y en operación en sanchorestaurantemiami.com.',
    en: 'The home of roast suckling pig on Calle Ocho, with a different offer every day. A new site in Spanish and English: a sun that shows today’s offer over a full-screen dish, the week in photos, online ordering and WhatsApp bookings. Live at sanchorestaurantemiami.com.',
  },
  outstanding: {
    nombre: 'Outstanding Garage Doors',
    lugar: 'Miami, Florida (EE. UU.)',
    texto:
      'Negocio de servicio local en el sur de Florida. Su línea telefónica y su WhatsApp conectados a agentes de IA que responden y pasan a una persona. Estado: agente de voz en operación y sitio en inglés publicado; WhatsApp en ajuste.',
    en: 'A local service business in South Florida. Its phone line and WhatsApp connected to AI agents that answer and hand off to a person. Status: voice agent in operation and English website live; WhatsApp being tuned.',
  },
  naidiko: {
    nombre: 'Naidikó',
    lugar: 'Pacífico colombiano',
    texto:
      'Marca de naidí (el açaí del Pacífico) con tres modelos de venta en un mismo sitio: una web propia con catálogo, formularios y pedidos por WhatsApp. En producción: catálogo, mayoreo e inversión activos.',
    en: 'A naidí (Pacific açaí) brand with three sales models on one site: catalog, forms and WhatsApp orders. In production: catalog, wholesale and investment live.',
  },
  arroyo: {
    nombre: 'Álvaro Arroyo',
    lugar: 'Colombia',
    texto:
      'Figura pública sin un sitio propio donde publicar: un sitio de autoridad de 20 páginas pensado para buscadores. Publicado, con 20 páginas indexadas.',
    en: 'A public figure with no site of his own: a 20-page authority site built for search engines. Live, with 20 pages indexed.',
  },
}

const wa = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`

/** Las páginas de servicio, en el orden de importancia de OCEAN: primero la ingeniería. */
export const SERVICIOS = [
  {
    slug: 'desarrollo-de-software-a-la-medida',
    corto: 'Software a la medida',
    title: 'Software a la medida con IA en Colombia | OCEAN',
    description:
      'OCEAN desarrolla software a la medida con IA: paneles, CRM, plataformas internas y SaaS conectados a tus datos. Equipo en Cali y Bogotá. Prototipo en 48 horas.',
    kicker: 'Ingeniería de software',
    h1: 'Desarrollo de software a la medida con inteligencia artificial',
    lead:
      'OCEAN diseña y construye software a la medida para empresas de Colombia, Estados Unidos y Latinoamérica: paneles, CRM, plataformas internas y productos SaaS conectados a tus datos, con inteligencia artificial donde de verdad ahorra trabajo. Equipo de ingeniería en Cali y Bogotá, y el primer prototipo navegable en 24 a 48 horas.',
    serviceType: 'Desarrollo de software a la medida',
    waText: 'Hola OCEAN 👋 Quiero cotizar un software a la medida para mi empresa.',
    construimos: [
      ['Paneles y tableros de control', 'Tus números en un solo lugar y al día: ventas, operación, inventario o cartera, leídos directo de tus sistemas y no de un Excel que alguien actualiza a mano.'],
      ['CRM y sistemas de gestión', 'Clientes, pedidos, citas, cotizaciones o proyectos con el flujo exacto de tu empresa, en vez de adaptar tu operación a una herramienta genérica.'],
      ['Plataformas y SaaS', 'Productos multiusuario con cuentas, roles, permisos, pagos y paneles de administración, listos para crecer de un cliente a muchos.'],
      ['Portales para clientes y proveedores', 'Un lugar donde tus clientes consultan su estado, descargan documentos o pagan, sin escribirle a nadie.'],
      ['Integraciones', 'Conectamos lo que ya usas: APIs, ERP, hojas de cálculo, bases de datos, WhatsApp, pasarelas de pago y calendario.'],
      ['IA aplicada al negocio', 'Clasificar y extraer datos de documentos, resumir, buscar en el conocimiento de tu empresa y responder con él, dentro del flujo de trabajo.'],
    ],
    senales: [
      'Tu equipo copia y pega datos entre sistemas todo el día.',
      'El negocio vive en hojas de cálculo que solo una persona entiende.',
      'La herramienta que pagas no se adapta a cómo trabajas.',
      'Quieres lanzar un producto digital propio y necesitas un equipo de ingeniería.',
    ],
    ingenieria: [
      'Control de acceso en la propia base de datos (cada usuario ve solo lo suyo), no solo en la pantalla.',
      'Secretos y llaves fuera del código; pagos por pasarela, sin tocar los datos de la tarjeta.',
      'Migraciones versionadas, despliegues por ramas con vista previa y vuelta atrás en segundos.',
      'Pruebas en navegador real, en computador y en teléfono, antes de cada entrega.',
    ],
    casos: [],
    faq: [
      ['¿Cuánto cuesta un software a la medida?', 'Depende del alcance. Después del diagnóstico gratuito te entregamos por escrito el alcance, las etapas y el precio de cada una, y empezamos por la que antes produce resultados.'],
      ['¿Cuánto tarda?', 'El primer prototipo navegable está en 24 a 48 horas. Lo demás se construye por etapas y cada etapa termina en algo que tu equipo ya puede usar.'],
      ['¿Se puede conectar con lo que ya usamos?', 'Sí. Trabajamos con APIs, ERP, bases de datos, hojas de cálculo, WhatsApp, pasarelas de pago y calendarios. Si algo no tiene API, buscamos la forma más segura de integrarlo.'],
      ['¿Trabajan con empresas fuera de Colombia?', 'Sí. Atendemos empresas en Colombia, Estados Unidos y Latinoamérica, en español, inglés y portugués, con horario que coincide con el de la costa este de EE. UU.'],
      ['¿Qué pasa después de la entrega?', 'Lo ponemos en producción, lo medimos con uso real y lo seguimos mejorando. Los cambios y el soporte se coordinan por WhatsApp.'],
    ],
  },
  {
    slug: 'agentes-de-ia',
    corto: 'Agentes de IA',
    title: 'Agentes de IA para WhatsApp, voz y web | OCEAN',
    description:
      'Agentes de IA que atienden WhatsApp, llamadas y el chat de tu web 24/7: responden, agendan y pasan a una persona. Demo funcionando en 48 horas.',
    kicker: 'Ingeniería de IA',
    h1: 'Agentes de IA para WhatsApp, voz y web',
    lead:
      'OCEAN construye agentes de inteligencia artificial que atienden a tus clientes por WhatsApp, por teléfono y en tu web las 24 horas: responden con la información de tu negocio, agendan en tu calendario, dejan cada conversación registrada y pasan a una persona cuando no saben. La demo queda funcionando en 48 horas.',
    serviceType: 'Agentes de inteligencia artificial para atención y ventas',
    waText: 'Hola OCEAN 👋 Quiero un agente de IA que atienda a mis clientes.',
    dato: ['11 s', 'respuesta media, medida en la línea de WhatsApp de OCEAN'],
    construimos: [
      ['Agentes de WhatsApp', 'Sobre tu número actual: responden en segundos, de día y de madrugada, con el tono de tu marca y la información de tu negocio.'],
      ['Agentes de voz', 'Contestan las llamadas de tu línea, entienden lo que pide el cliente y lo resuelven o lo pasan a tu equipo.'],
      ['Chat en tu web', 'Un asistente en tu página que responde preguntas, califica al visitante y sigue la conversación por WhatsApp.'],
      ['Agenda y seguimiento', 'Agendan, confirman y recuerdan citas en tu calendario, y hacen seguimiento a quien no respondió.'],
      ['Registro en tu CRM', 'Cada conversación queda guardada con el contacto, lo que pidió y en qué quedó, para que nadie empiece de cero.'],
      ['Paso a una persona', 'Cuando el agente no sabe algo o el cliente lo pide, la conversación pasa a una persona de tu equipo, con todo el contexto.'],
    ],
    senales: [
      'Pierdes ventas porque nadie responde fuera del horario de oficina.',
      'Tu equipo contesta todos los días las mismas preguntas.',
      'Los mensajes de la pauta llegan y se enfrían antes de que alguien los atienda.',
      'Tienes clientes que escriben en inglés o portugués.',
    ],
    ingenieria: [
      'El agente responde con tu información (precios, horarios, servicios) y no inventa: si no sabe, pasa a una persona.',
      'Pruebas de conversación antes de salir en vivo, con mensajes de prueba, nunca con tus clientes.',
      'Español, inglés y portugués en la misma línea.',
      'Conectado a tu calendario, tu CRM y tus pagos.',
    ],
    casos: ['outstanding', 'qora'],
    faq: [
      ['¿Un agente de IA reemplaza a mi equipo?', 'No. Atiende lo repetitivo y lo urgente a cualquier hora, y pasa a una persona lo que necesita criterio humano, con la conversación completa.'],
      ['¿Funciona con mi número de WhatsApp actual?', 'Sí, lo montamos sobre tu número. Tus clientes siguen escribiendo al mismo lugar.'],
      ['¿Qué pasa si el agente no sabe la respuesta?', 'No inventa: le dice al cliente que lo comunica con una persona y le pasa la conversación a tu equipo.'],
      ['¿En qué idiomas atiende?', 'En español, inglés y portugués.'],
      ['¿Cuánto tarda en estar listo?', 'La demo con la información de tu negocio queda funcionando en 48 horas. Después se ajusta con conversaciones reales antes de atender a todos tus clientes.'],
    ],
  },
  {
    slug: 'automatizacion-de-procesos',
    corto: 'Automatización',
    title: 'Automatización de procesos e integraciones con IA | OCEAN',
    description:
      'OCEAN conecta tu CRM, pagos, WhatsApp, calendario, correo y hojas de cálculo en un solo sistema que trabaja solo, con IA. Diagnóstico gratis.',
    kicker: 'Ingeniería de procesos',
    h1: 'Automatización de procesos e integraciones con IA',
    lead:
      'OCEAN conecta tus herramientas —CRM, pagos, WhatsApp, calendario, correo y hojas de cálculo— en un solo sistema que trabaja solo: cuando entra un cliente, un pago o un pedido, cada paso siguiente ocurre sin que nadie copie datos ni se acuerde de hacerlo.',
    serviceType: 'Automatización de procesos e integración de sistemas',
    waText: 'Hola OCEAN 👋 Quiero automatizar procesos y conectar mis herramientas.',
    construimos: [
      ['Leads que llegan solos', 'Los contactos de Meta, de tu web y de WhatsApp entran a tu CRM en segundos, con su origen, y alguien (o un agente) les responde de inmediato.'],
      ['Pagos que actualizan todo', 'Un pago aprobado marca el pedido, avisa al equipo y al cliente y deja el registro contable, sin revisar la pasarela a mano.'],
      ['Citas sin ida y vuelta', 'Agendar, confirmar, recordar y reprogramar sin intercambiar diez mensajes.'],
      ['Reportes que se arman solos', 'El resumen de la semana llega a tu correo o a tu WhatsApp con los números del día, sin que nadie lo prepare.'],
      ['Documentos con IA', 'Facturas, formularios y solicitudes que se leen, se clasifican y se cargan donde corresponde.'],
      ['Flujos a la medida', 'Lo que tu operación hace igual todos los días, convertido en un flujo que se ejecuta solo y avisa cuando algo falla.'],
    ],
    senales: [
      'Tus herramientas no se hablan entre sí.',
      'Alguien pasa horas copiando datos de un sistema a otro.',
      'Los pagos, pedidos o citas se revisan a mano.',
      'Un error de digitación ya te costó un cliente o un pago.',
    ],
    ingenieria: [
      'Flujos versionados y probados con datos de prueba antes de tocar tu operación real.',
      'Cada flujo avisa cuando algo falla, en vez de fallar en silencio.',
      'Credenciales guardadas fuera del código y con el mínimo permiso necesario.',
      'Nada se activa para uso real sin tu visto bueno.',
    ],
    casos: [],
    faq: [
      ['¿Qué se puede automatizar?', 'Casi todo lo que tu equipo hace igual todos los días: pasar datos entre sistemas, responder y registrar contactos, confirmar pagos y citas, armar reportes y procesar documentos.'],
      ['¿Necesito cambiar mis herramientas?', 'Normalmente no. Conectamos las que ya usas. Si alguna no lo permite, te proponemos la alternativa más simple.'],
      ['¿Qué pasa si un paso falla?', 'El flujo avisa a la persona indicada con el detalle del error, en vez de fallar en silencio.'],
      ['¿Cuánto tarda?', 'Un primer flujo funcionando suele estar en 24 a 48 horas; los procesos más grandes se hacen por etapas.'],
    ],
  },
  {
    slug: 'desarrollo-web',
    corto: 'Webs y tiendas',
    title: 'Desarrollo web, tiendas en línea y plataformas | OCEAN',
    description:
      'Webs, tiendas y plataformas que cargan al instante en el celular, con pagos, WhatsApp y SEO técnico y para IA. Prototipo navegable en 48 horas.',
    kicker: 'Ingeniería web',
    h1: 'Desarrollo web: páginas, tiendas y plataformas que venden',
    lead:
      'OCEAN desarrolla webs, tiendas en línea y plataformas que cargan al instante en el celular, con catálogo, pagos, WhatsApp y SEO técnico desde el primer día, también para buscadores con IA. El prototipo navegable está en 48 horas: si te convence, lo lanzamos.',
    serviceType: 'Desarrollo web y comercio electrónico',
    waText: 'Hola OCEAN 👋 Quiero una web que venda.',
    construimos: [
      ['Webs de empresa', 'Rápidas en el celular, claras en lo que vendes y con un solo camino a la conversación: WhatsApp, agenda o formulario.'],
      ['Tiendas en línea', 'Catálogo, carrito y pagos con tarjeta, PSE, Nequi o Bancolombia por Wompi, más pedidos por WhatsApp.'],
      ['Sitios de autoridad', 'Muchas páginas bien estructuradas, pensadas para que Google y los asistentes de IA te encuentren y te citen.'],
      ['Experiencias inmersivas', 'Video, 3D y WebGL cuando la marca lo pide, sin sacrificar la velocidad: esta misma web es una película que avanza con el scroll.'],
      ['Multilenguaje', 'Español, inglés y portugués para vender fuera de Colombia.'],
      ['Medición', 'Analítica de cada botón y cada conversación iniciada, para saber qué funciona.'],
    ],
    senales: [
      'Tu web tarda en cargar y no convierte en el celular.',
      'Vendes por WhatsApp pero tu web no lleva a nadie allá.',
      'No apareces en Google cuando buscan lo que vendes.',
      'Quieres vender fuera de Colombia.',
    ],
    ingenieria: [
      'Rendimiento medido en teléfono con Lighthouse antes de publicar.',
      'Datos estructurados (schema.org), sitemap y llms.txt para buscadores y asistentes de IA.',
      'Accesibilidad: contraste medido, foco visible y movimiento reducido respetado.',
      'Cabeceras de seguridad estrictas y pagos por pasarela.',
    ],
    casos: ['supermachi', 'humberto', 'qora', 'sancho', 'naidiko', 'arroyo'],
    faq: [
      ['¿Cuánto tarda una web?', 'El prototipo navegable está en 48 horas. La web completa depende del número de páginas y de si lleva tienda o integraciones.'],
      ['¿Incluye SEO?', 'Sí: SEO técnico desde el primer día (velocidad, estructura, datos estructurados, sitemap) y contenido pensado para que también te citen los asistentes de IA.'],
      ['¿Puedo recibir pagos?', 'Sí, con tarjeta, PSE, Nequi o Bancolombia a través de Wompi. Los datos de la tarjeta nunca pasan por tu web.'],
      ['¿Pueden rehacer mi web actual?', 'Sí. Partimos de lo que hoy funciona y de dónde se pierden los visitantes, y lo rehacemos para que lleve a la conversación.'],
    ],
  },
  {
    slug: 'contenido-y-pauta',
    corto: 'Contenido y pauta',
    title: 'Contenido UGC y pauta en Meta para WhatsApp | OCEAN',
    description:
      'Contenido vertical para TikTok y Reels y campañas en Meta Ads pensadas para conversaciones, no para clics, conectadas a agentes de IA que responden al instante.',
    kicker: 'Crecimiento',
    h1: 'Contenido UGC y pauta en Meta que terminan en conversaciones',
    lead:
      'OCEAN produce contenido vertical para TikTok, Reels y Facebook y monta campañas en Meta Ads pensadas para conversaciones, no para clics. La diferencia es lo que pasa después: cada mensaje lo recibe un sistema que responde al instante y lo lleva hasta la venta.',
    serviceType: 'Producción de contenido y pauta digital',
    waText: 'Hola OCEAN 👋 Quiero contenido y pauta que traigan clientes.',
    construimos: [
      ['Contenido UGC', 'Videos verticales hechos para retener en los primeros segundos y llevar la conversación a tu WhatsApp.'],
      ['Pauta en Meta', 'Campañas en Facebook e Instagram que buscan conversaciones con gente lista para comprar, no likes.'],
      ['Respuesta inmediata', 'Los mensajes que trae la pauta los atiende un agente de IA en segundos, antes de que se enfríen.'],
      ['Medición de punta a punta', 'Del anuncio a la conversación y de la conversación a la venta, para saber qué anuncio vende.'],
    ],
    senales: [
      'Tienes alcance pero no se traduce en ventas.',
      'Quemas presupuesto en pauta sin leads calificados.',
      'Los mensajes llegan y nadie los responde a tiempo.',
    ],
    ingenieria: [
      'Campañas conectadas a tu WhatsApp y a tu CRM.',
      'Contenido producido por OCEAN y publicado en sus propias redes como prueba (@oceanind.co).',
    ],
    casos: [],
    faq: [
      ['¿Por qué conversaciones y no clics?', 'Porque en Colombia y Latinoamérica la venta se cierra hablando. Una campaña que trae conversaciones calificadas, atendidas al instante, vende más que una que trae visitas.'],
      ['¿Se puede combinar con un agente de IA?', 'Sí, y es lo que más recomendamos: la pauta trae el mensaje y el agente lo responde en segundos, a cualquier hora.'],
    ],
  },
]

export const FAQ_GENERAL = [
  ['¿Qué es OCEAN?', ORG.resumen],
  ['¿Dónde está OCEAN?', 'El equipo trabaja desde Cali y Bogotá, en Colombia, y OCEAN tiene presencia en Miami. Atiende empresas en Colombia, Estados Unidos y Latinoamérica, también por videollamada.'],
  ['¿Cómo empiezo?', 'Escríbenos por WhatsApp al +57 313 872 1665 o agenda una videollamada de 45 minutos, gratis. En 24 a 48 horas te mostramos un primer prototipo funcionando.'],
  ['¿Cómo se paga?', 'En pesos colombianos con tarjeta, PSE, Nequi o Bancolombia a través de Wompi; los valores en dólares se cobran en pesos a la tasa del día. Los datos de la tarjeta nunca pasan por OCEAN.'],
]

/** La página en inglés: el segmento de EE. UU. (nearshore desde Colombia). */
export const EN = {
  slug: 'en',
  title: 'OCEAN | Nearshore AI software and engineering from Colombia',
  description:
    'Custom software, AI agents for WhatsApp, phone and web, automation and websites, built by OCEAN’s team in Colombia for US companies. Demo in 48 hours.',
  kicker: 'Software & AI engineering · Nearshore',
  h1: 'Nearshore software and AI engineering, built in Colombia',
  lead:
    'OCEAN is a software and AI engineering company with teams in Cali and Bogotá, Colombia, and a presence in Miami. We build custom software, AI agents for WhatsApp, phone and web, process automation and high-performance websites for companies in the United States and Latin America, in English, Spanish and Portuguese, during US business hours. Your first working prototype ships in 24 to 48 hours.',
  waText: 'Hi OCEAN 👋 I’d like to talk about a software / AI project.',
  servicios: [
    ['Custom software', 'Dashboards, CRMs, internal platforms and SaaS products connected to your data, with AI where it actually saves work.'],
    ['AI agents', 'Agents that answer WhatsApp, phone calls and web chat 24/7, book appointments, log every conversation and hand off to a person when needed.'],
    ['Process automation', 'Your CRM, payments, WhatsApp, calendar, email and spreadsheets connected into one system that runs on its own.'],
    ['Websites and stores', 'Fast, mobile-first websites and stores with payments, WhatsApp and technical SEO, including for AI search.'],
  ],
  porque: [
    ['Your time zone', 'Colombia sits in US Eastern/Central time, so we work while you do: calls, reviews and fixes the same day.'],
    ['Bilingual by default', 'English, Spanish and Portuguese: we can serve your Hispanic customers in their language, too.'],
    ['Working software first', 'A prototype in 24 to 48 hours before any long contract, then delivery in stages.'],
    ['Production-grade engineering', 'Row-level access control, secrets out of the code, preview deployments and instant rollback.'],
  ],
  faq: [
    ['What is OCEAN?', ORG.summary],
    ['Why build with a team in Colombia?', 'You get an engineering team that works in your time zone, speaks English and Spanish and builds with the same tools a US team would use.'],
    ['How fast can we start?', 'Book a free 45-minute call. Within 24 to 48 hours you see a working prototype or an AI agent answering with your business information.'],
    ['Do you work with US companies?', 'Yes. In Miami we built the websites of El Mesón de Súper Machi and Sancho Restaurant and the AI agents of Outstanding Garage Doors; in Washington, D.C., the sites of Humberto Garcés and Qora Technologies.'],
    ['How do I reach you?', 'WhatsApp +57 313 872 1665 or book a call on Cal.com.'],
  ],
}
