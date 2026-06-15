// ============================================================================
// Spanish (/es/) DRAFT content — machine-translation quality, pending proofreading.
// The proofreader edits THIS file (glossary + strings + per-city text) and re-runs
// `node _build/generate.mjs`; changes apply across every /es/ page.
// ============================================================================

// Key locksmith terms — keep these consistent everywhere. Fix here once, apply everywhere.
export const GLOSSARY = [
  ['locksmith', 'cerrajero'],
  ['mobile locksmith', 'cerrajero móvil'],
  ['car key replacement', 'reemplazo de llaves de auto'],
  ['key fob / remote', 'control remoto'],
  ['transponder key', 'llave con transpondedor'],
  ['push-to-start', 'botón de encendido (push-to-start)'],
  ['key duplication', 'duplicado de llaves'],
  ['spare key', 'llave de repuesto'],
  ['rekey', 'recodificar (cerraduras)'],
  ['deadbolt', 'cerrojo'],
  ['lock installation', 'instalación de cerraduras'],
  ['lock repair', 'reparación de cerraduras'],
  ['smart lock', 'cerradura inteligente'],
  ['master key system', 'sistema de llave maestra'],
  ['high-security lock', 'cerradura de alta seguridad'],
  ['ignition (cylinder)', 'cilindro de encendido'],
  ['lockout (situation)', 'quedarse afuera / bloqueo'],
  ['lockout service', 'servicio de apertura'],
  ['car lockout', 'apertura de auto'],
  ['home lockout', 'apertura de casa'],
  ['24-hour', '24 horas'],
  ['licensed', 'con licencia'],
  ['flat-rate', 'tarifa fija'],
  ['emergency', 'emergencia'],
  ['NASTF-authorized', 'autorizado por NASTF']
];

// Shared UI strings (chrome, sections, buttons)
export const U = {
  nav: { home:'Inicio', automotive:'Automotriz', residential:'Residencial', commercial:'Comercial',
         emergency:'Emergencia', financing:'Financiamiento', warranty:'Garantía',
         faq:'Preguntas frecuentes', payNow:'Pagar', blog:'Blog',
         certifications:'Certificaciones', contact:'Contacto', terms:'Términos y Condiciones' },
  trust: [['⭐','5.0 ★','250+ reseñas de Google'], ['🛡️','Con licencia','Oklahoma #AC441081'],
          ['🕒','24 horas','Lunes a sábado'], ['🚐','Móvil','Vamos a usted']],
  footer: { tagline:'Tu cerrajero móvil de confianza — siempre ahí cuando lo necesitas.',
            services:'Servicios', company:'Empresa', areas:'Zonas de servicio',
            allAreas:'Todas las zonas →', staff:'Acceso de personal',
            copyright:'Derechos de autor © 2026 Turbo KeySmith — Todos los derechos reservados. · Con licencia OK #AC441081' },
  mobilebar: { call:'Llamar', text:'Texto', wa:'WhatsApp' },
  banner: 'BORRADOR — pendiente de revisión · DRAFT — pending proofreading',
  hablas: '¿Hablas español? 💬 Envíanos un texto o WhatsApp',
  howWorks: { title:'Cómo funciona', sub:'Tres pasos simples — sin estrés.',
    s1:['Llama','Llama o envía un texto al 405-870-5397. Cuéntanos qué pasa y dónde estás.'],
    s2t:'Vamos a ti', s2:'Como cerrajero móvil, llevamos el taller a tu puerta en {city}.',
    s3:['De vuelta en marcha','Llaves cortadas, cerraduras arregladas — y puedes pagar en el momento.'] },
  work: { title:'Nuestro trabajo', sub:'Agrega tus propias fotos de {label} en estos espacios marcados.',
    before:'ANTES', after:'DESPUÉS', photo:'FOTO', add:'Agrega tu foto', onjob:'En el trabajo' },
  reviewSlot: '⭐ ESPACIO PARA RESEÑA LOCAL — {label}',
  reviewSlotSub: 'Pega aquí una reseña real de Google de un cliente de {label}, o déjalo por ahora.',
  citySvcHead:'Servicios de cerrajería en {city}', citySvcSub:'Autos, casas y negocios — toca un servicio o solo llama.',
  needHead:'¿Necesitas un cerrajero en {city}?', needSub:'Con licencia OK #AC441081 · calificación 5.0★ · móvil — vamos a ti.',
  callCity:'📞 Llama a tu cerrajero en {city}: 405-870-5397', seeAll:'← Ver todas las zonas de servicio de Turbo Keysmith',
  backCity:'← Volver a los servicios de cerrajería en {city}', moreFor:'Más para {city}:', emergency24:'emergencia 24 horas',
  whatCustomers:'Lo que dicen los clientes de {city}', realReviews:'Reseñas reales de nuestro perfil de Google Business.',
  cardCta:{automotive:'Ver automotriz', residential:'Ver residencial', commercial:'Ver comercial', emergency:'Ver emergencia'},
  cardDesc:{ autoSub:c=>`Reemplazo de llaves, programación de controles y apertura de autos en ${c}.`,
             resSub:c=>`Recodificación, instalación de cerraduras y cerraduras inteligentes para casas en ${c}.`,
             commSub:c=>`Llaves maestras, alta seguridad y cerraduras de negocio en ${c}.`,
             emerSub:c=>`Apertura 24 horas y reemplazo de llaves perdidas en ${c}.` }
};

// Service section templates (per-city sub-pages). {city} and the city's hook are woven in.
export const SVC = {
  automotive: {
    h1:c=>`Reemplazo de Llaves de Auto y Cerrajero Automotriz en ${c}, OK`,
    title:c=>`Reemplazo de Llaves de Auto en ${c}, OK | Cerrajero Automotriz Móvil`,
    desc:(c,h)=>`${h} Cerrajero automotriz móvil en ${c}, OK — llaves de auto, programación de controles, aperturas. Llama 405-870-5397.`,
    lead:(c,h)=>`${h} Turbo Keysmith es un cerrajero automotriz móvil que va a ti en cualquier parte de ${c} — sin necesidad de grúa. Cortamos y programamos llaves de repuesto, llaves inteligentes y controles remotos para casi todas las marcas y modelos, en tu entrada o estacionamiento. Como cerrajero autorizado por NASTF con herramientas de programación a nivel de concesionario, manejamos los sistemas modernos de transpondedor y botón de encendido (push-to-start) que la mayoría de los talleres mandan al concesionario — normalmente más rápido y por menos.`,
    lead2:c=>`Nuestra camioneta está equipada para reemplazar llaves perdidas, reparar o reemplazar encendidos que fallan, y devolverte al volante tras un bloqueo sin daño a tu vehículo. Tarifas fijas y honestas, cotizadas por adelantado, cada vez que salimos a ${c}.`,
    cta:c=>`📞 Llama a tu cerrajero automotriz en ${c}: 405-870-5397`,
    sections:[
      ['Reemplazo y Duplicado de Llaves de Auto','Llaves nuevas y de repuesto para todas las marcas y modelos, cortadas y programadas en sitio.'],
      ['Programación de Llaves con Transpondedor y Controles','Programación a nivel de concesionario para llaves inteligentes, controles y botones de encendido (push-to-start).'],
      ['Servicio de Apertura de Autos','¿Dejaste las llaves dentro del auto? Apertura rápida y sin daños, 24 horas de lunes a sábado.'],
      ['Reparación y Reemplazo de Encendido','¿Encendido desgastado o atascado? Lo diagnosticamos, reparamos o reemplazamos para que arranques.']]
  },
  residential: {
    h1:c=>`Cerrajero Residencial en ${c}, OK`,
    title:c=>`Cerrajero Residencial en ${c}, OK | Recodificación y Cerraduras Inteligentes`,
    desc:(c,h)=>`${h} Recodificación, cerrojos, cerraduras inteligentes y ayuda por bloqueo en ${c}, OK. Llama 405-870-5397.`,
    lead:(c,h)=>`${h} Turbo Keysmith mantiene seguras las casas de ${c} con servicio de cerrajería residencial móvil que va a tu puerta. Recodificamos cerraduras para que las llaves viejas dejen de funcionar, instalamos y reparamos cerrojos y herrajes de puertas, configuramos cerraduras inteligentes y te abrimos rápido cuando te quedas afuera — a cualquier hora, con precios fijos justos y sin dejar desorden.`,
    lead2:c=>`¿Te acabas de mudar a una casa en ${c} o se fue un compañero de cuarto? Recodificar es la forma rápida y económica de asegurar que solo las personas de tu confianza puedan abrir tus puertas.`,
    cta:c=>`📞 Llama a tu cerrajero residencial en ${c}: 405-870-5397`,
    sections:[
      ['Recodificación de Cerraduras','¿Te mudaste o perdiste una llave? Recodificamos tus cerraduras para que solo funcionen tus llaves — sin reemplazo completo.'],
      ['Instalación y Reparación de Cerraduras','Cerrojos nuevos, manijas y herrajes de puerta instalados o reparados correctamente.'],
      ['Instalación de Cerraduras Inteligentes','Entrada sin llave y cerraduras controladas por celular, instaladas y configuradas para ti.'],
      ['Servicio de Apertura de Casa','¿Te quedaste afuera de casa? Apertura rápida y sin daños, 24 horas de lunes a sábado.']]
  },
  commercial: {
    h1:c=>`Cerrajero Comercial para Negocios en ${c}`,
    title:c=>`Cerrajero Comercial en ${c}, OK | Llaves Maestras y Cerraduras`,
    desc:(c,h)=>`${h} Llaves maestras, cerraduras de alta seguridad y apertura de negocios en ${c}, OK. Llama 405-870-5397.`,
    lead:(c,h)=>`${h} Turbo Keysmith ayuda a los negocios de ${c} a mantenerse protegidos con servicio de cerrajería comercial móvil — instalación de cerraduras de alta seguridad, sistemas de llave maestra que ponen las puertas correctas en las manos correctas, reparación de cerraduras y respuesta rápida a bloqueos para que una puerta atascada nunca te cueste un día de trabajo. Con licencia, local y claros con los precios, adaptamos cada trabajo a cómo funciona realmente tu negocio.`,
    lead2:c=>`Ya sea que manejes una sola tienda en ${c} o varias ubicaciones, crearemos un plan de llaves simple de manejar y difícil de vencer.`,
    cta:c=>`📞 Llama a tu cerrajero comercial en ${c}: 405-870-5397`,
    sections:[
      ['Instalación de Cerraduras de Alta Seguridad','Cerraduras de grado comercial que resisten el uso, el clima y los intentos de robo.'],
      ['Sistemas de Llave Maestra','Un sistema organizado para que las personas correctas abran las puertas correctas — y nadie más.'],
      ['Servicio de Apertura Comercial','¿Te quedaste afuera de la oficina o el local? Respuesta rápida para que vuelvas al trabajo.'],
      ['Reparación de Cerraduras Comerciales','Herrajes atascados, desgastados o dañados, reparados o reemplazados en sitio.']]
  }
};

// Metro service pages (/es/automotive, /es/residential, /es/commercial, /es/emergency)
export const METRO = {
  automotive:{ slug:'automotive', ...svcMetro('automotive') },
  residential:{ slug:'residential', ...svcMetro('residential') },
  commercial:{ slug:'commercial', ...svcMetro('commercial') },
  emergency:{ slug:'emergency',
    title:'Cerrajero de Emergencia 24 Horas en Oklahoma City | Turbo Keysmith',
    desc:'Cerrajero de emergencia móvil en el área de OKC, 24 horas de lunes a sábado. Aperturas de auto, casa y negocio, llaves perdidas. Llama 405-870-5397.',
    h1:'Cerrajero de Emergencia 24 Horas en Oklahoma City',
    leads:[
      'Las emergencias no respetan horario — y nosotros tampoco. Turbo Keysmith atiende llamadas de cerrajería de emergencia en toda el área de OKC, abierto 24 horas de lunes a sábado. ¿Te quedaste afuera de tu casa, auto o negocio a media noche? ¿Perdiste tu única llave? ¿Necesitas asegurar una puerta rápido tras un robo? Nuestro cerrajero móvil va a ti rápido, te abre de forma segura sin daño innecesario, y cobra tarifas fijas honestas — incluso a las 3 a. m.',
      'Llama y hablarás con un cerrajero local de verdad, no con un centro de llamadas. Te decimos el precio por adelantado y salimos hacia ti.'],
    sections:[
      ['Servicio de Apertura 24/7','Casa, auto o negocio — apertura rápida y sin daños cuando te quedas afuera.'],
      ['Reemplazo de Llaves Perdidas','Llaves nuevas para casas, negocios y vehículos, hechas en sitio para que no te quedes varado.'],
      ['Reparación de Cerraduras de Emergencia','¿Cerradura rota o fallando? Restauramos tu seguridad en el momento.'],
      ['Reparación tras Robo','¿Sufriste un robo? Aseguramos tus puertas rápido y ayudamos a prevenir el siguiente.']],
    cta:'📞 Llama a tu cerrajero 24 horas en OKC: 405-870-5397' }
};
function svcMetro(kind){
  const M = 'el área de Oklahoma City';
  const s = SVC[kind];
  return {
    title:s.title(M).replace(', OK',''),
    desc:s.desc(M,'').trim(),
    h1:s.h1(M),
    leads:[s.lead(M,'').trim(), s.lead2(M)],
    sections:s.sections,
    cta:s.cta(M)
  };
}

// Homepage (/es/index.html)
export const HOME = {
  title:'Cerrajero en Oklahoma City | Turbo Keysmith — Móvil y 24 Horas',
  desc:'Turbo Keysmith es un cerrajero móvil con licencia que sirve el área de OKC. Reemplazo de llaves de auto, cerraduras de casa y negocio, y apertura 24 horas. Llama 405-870-5397.',
  h1:'Tu Cerrajero Móvil de Confianza en el Área de Oklahoma City',
  lead:'¿Te quedaste afuera, perdiste tu única llave del auto o necesitas recodificar tus cerraduras? Turbo Keysmith va a ti — rápido, amable y con licencia completa (OK Lic. #AC441081). Un cerrajero móvil local y familiar que cubre OKC, Edmond, Moore, Norman, Yukon, Midwest City y el área metropolitana.',
  callBtn:'📞 Llama ahora — 405-870-5397',
  servicesHead:'Servicios de cerrajería en toda el área de OKC',
  servicesSub:'Desde llaves de auto a nivel de concesionario hasta recodificaciones de casa y sistemas de llave maestra — toca un servicio para saber más.',
  areaHead:'Servimos el área metropolitana de Oklahoma City',
  areaSub:'Cerrajero móvil que cubre OKC y las ciudades cercanas — vamos a ti.',
  contactHead:'Mejor aún, ¡ven a vernos en persona!',
  contactSub:'Estamos en contacto en cada paso hasta terminar el trabajo. ¿Preguntas, pedidos especiales o una cotización gratis? Solo contáctanos — ¡estamos para ayudar!',
  infoCall:'Llama o envía un texto', infoAddr:'Dirección', infoHours:'Horario', infoArea:'Zona de servicio',
  hoursVal:'24 horas, lun–sáb<br>Domingo hasta las 5:00 a. m.', areaVal:'Área metro de Oklahoma City y alrededores',
  sendMsg:'✉️ Envíanos un mensaje'
};

// Hub (/es/service-areas/)
export const HUB = {
  title:'Zonas de Servicio | Turbo Keysmith — Cerrajero Móvil en el Área de OKC',
  desc:'Turbo Keysmith es un cerrajero móvil que sirve Oklahoma City y 24 ciudades cercanas dentro de ~30 millas — Edmond, Norman, Yukon, Moore, Guthrie y más. Encuentra tu ciudad. Llama 405-870-5397.',
  h1:'Dónde Trabajamos — Zonas de Servicio del Cerrajero Móvil',
  intro:'Turbo Keysmith tiene su base en 4201 N MacArthur Blvd en Warr Acres y va a ti por toda el área metropolitana de Oklahoma City. Encuentra tu ciudad abajo — cada zona recibe el mismo servicio móvil, con licencia (OK #AC441081) y de tarifa fija. ¿No ves tu pueblo? Llámanos de todos modos — si estás cerca del área metro, probablemente te cubrimos.',
  mapHead:'Servimos el área metropolitana de Oklahoma City', mapSub:'Cerrajero móvil que cubre OKC y las ciudades cercanas — vamos a ti.',
  cityCta:'{city} cerrajero →'
};

// Group labels (mirror English distance bands)
export const GROUP_LABELS = {
  0:'A minutos de nosotros', 1:'Zona metro interior', 2:'Zona metro circundante', 3:'El borde de nuestra zona'
};

// Contact form (/es/contact/)
export const CONTACT = {
  title:'Contacta a Turbo Keysmith | Solicita un Cerrajero — Área de OKC',
  desc:'Contacta a Turbo Keysmith para una cotización rápida o servicio. Dinos qué necesitas — llaves de auto, cerraduras de casa o negocio, o una apertura — y te responderemos. Llama 405-870-5397.',
  h1:'Solicita un Cerrajero',
  lead:'Cuéntanos qué pasa y cómo contactarte — te responderemos enseguida.',
  fName:'Nombre', fPhone:'Teléfono', fEmail:'Correo electrónico', fAddress:'Dirección',
  fService:'Servicio que necesitas', fNotes:'Detalles (opcional)',
  choose:'Elige una opción…',
  options:['Reemplazo de llave / control de auto','Auto bloqueado','Recodificar / instalar cerradura de casa',
           'Casa bloqueada','Cerraduras de negocio / comercial','Emergencia / 24 horas','Otra cosa'],
  phName:'Tu nombre', phNotes:'Año/marca/modelo del auto, qué pasó, dónde estás…',
  send:'Enviar solicitud', successH:'¡Listo — gracias!',
  successP:'Tu solicitud se guardó y te contactaremos pronto. Si es urgente, llámanos ahora.',
  validate:'Por favor agrega tu nombre, teléfono y el servicio que necesitas.',
  noteTalk:'¿Prefieres hablar? Llama o envía un texto al 405-870-5397 — 24 horas, lunes a sábado. 4201 N MacArthur Blvd, Warr Acres, OK 73122.'
};

// Per-city Spanish text, keyed by slug. Structure (tier/hasSub/order) comes from cities.mjs.
export const CITIES_ES = {
  'warr-acres':{ metaTitle:'Cerrajero en Warr Acres | Nuestra Base — Respuesta Más Rápida',
    metaDesc:'Turbo Keysmith tiene su base en Warr Acres, OK. La respuesta local más rápida para llaves de auto, recodificaciones, cerraduras de negocio y aperturas 24 horas en el corredor de MacArthur. Llama 405-870-5397.',
    h1:'Cerrajero en Warr Acres — Este Es Nuestro Vecindario',
    intro:'Warr Acres es nuestro hogar, así que cuando llamas desde aquí recibes la respuesta más rápida que ofrecemos. Cuidamos las casas del noroeste de Oklahoma City y los negocios pequeños del corredor de MacArthur — llaves de auto, recodificaciones, reparación de cerraduras, aperturas — de día o de noche, con precios fijos honestos de un vecino con licencia.',
    sub:{auto:'La ayuda más rápida con llaves y controles en nuestro territorio.',res:'Recodificación y reparación de cerraduras para casas de Warr Acres.',comm:'Cerraduras de negocio en MacArthur Blvd.'} },
  'bethany':{ metaTitle:'Cerrajero en Bethany | Llaves de Auto, Recodificación y Aperturas | Turbo Keysmith',
    metaDesc:'Cerrajero móvil rápido en Bethany, OK — justo al lado de nuestra base. Recodificaciones, cerrojos, reemplazo de llaves de auto y apertura cerca de NW 39th y SNU. Llama 405-870-5397.',
    h1:'Tu Cerrajero Local en Bethany — A Minutos de Distancia',
    intro:'Bethany está justo al lado de nuestra base en Warr Acres, así que obtienes algunos de nuestros tiempos de respuesta más rápidos del área metro. Atendemos las muchas casas establecidas a lo largo de la NW 39th Expressway y cerca de Southern Nazarene University — recodificaciones tras una mudanza, mejoras de cerrojos, aperturas — además de llaves de auto y cerraduras de negocios pequeños.',
    sub:{auto:'Servicio rápido de llaves y controles para quienes viajan en Bethany.',res:'Recodificación y cerrojos para las casas establecidas de Bethany.',comm:'Cerraduras y llaves maestras para negocios de NW 39th.'} },
  'the-village':{ metaTitle:'Cerrajero en The Village OK | Recodificación, Cerraduras Inteligentes y Aperturas',
    metaDesc:'Cerrajero móvil para The Village, OK. Recodificaciones, mejoras de cerrojos, cerraduras inteligentes y apertura para casas de mediados de siglo del centro-norte. Llama 405-870-5397.',
    h1:'Servicios de Cerrajería en The Village',
    intro:'The Village es un vecindario unido del centro-norte lleno de casas bien cuidadas de mediados de siglo, y conocemos bien sus herrajes de puerta. Recodificamos cerraduras tras una mudanza, mejoramos cerrojos cansados, instalamos cerraduras inteligentes y te abrimos rápido cuando te quedas afuera.',
    sub:{auto:'Reemplazo de llaves y controles en tu puerta.',res:'Recodificación y cerraduras inteligentes para casas de The Village.',comm:'Cerraduras para tiendas y oficinas de la zona de The Village.'} },
  'nichols-hills':{ metaTitle:'Cerrajero en Nichols Hills | Alta Seguridad y Cerraduras Inteligentes',
    metaDesc:'Cerrajero móvil discreto y con licencia para Nichols Hills, OK. Cerraduras de alta seguridad, instalación de cerraduras inteligentes, recodificaciones y aperturas para casas de alto nivel. Llama 405-870-5397.',
    h1:'Cerrajero de Confianza para las Casas de Nichols Hills',
    intro:'Los dueños de casa de Nichols Hills esperan seguridad bien hecha y con discreción — y así trabajamos. Como cerrajero con licencia y asegurado (OK #AC441081), instalamos cerraduras de alta seguridad e inteligentes, hacemos recodificaciones y mejoras, y respondemos rápido a aperturas, con el profesionalismo que el vecindario espera.',
    sub:{auto:'Servicio de llaves y controles en sitio para vehículos de lujo.',res:'Cerraduras de alta seguridad e inteligentes para casas finas.',comm:'Control de acceso y llaves maestras para oficinas.'} },
  'oklahoma-city':{ metaTitle:'Cerrajero en Oklahoma City, OK | Turbo Keysmith — Móvil y 24 Horas',
    metaDesc:'Cerrajero móvil que sirve toda Oklahoma City — Downtown, Bricktown, Midtown y más. Llaves de auto, cerraduras de casa y negocio, aperturas 24 horas. Llama 405-870-5397.',
    h1:'Cerrajero Móvil que Sirve Toda Oklahoma City',
    intro:'Turbo Keysmith cubre toda la ciudad — desde Downtown y Bricktown hasta Capitol Hill y los suburbios del lejano noroeste y suroeste — con una camioneta totalmente equipada que va a ti. Reemplazo de llaves de auto, recodificaciones de casa, seguridad de negocios y apertura 24 horas, todo de un cerrajero local con licencia (OK #AC441081). Sin grúa, sin ir al taller, tarifas fijas justas.',
    sub:{auto:'Programación de llaves y controles en sitio para todas las marcas, en cualquier parte de la ciudad.',res:'Recodificaciones, instalación y cerraduras inteligentes para casas de OKC.',comm:'Llaves maestras y cerraduras de alta seguridad para negocios de OKC.'} },
  'yukon':{ metaTitle:'Cerrajero en Yukon OK | Llaves de Auto, Casa y Negocio | Turbo Keysmith',
    metaDesc:'Cerrajero móvil en Yukon, OK. Reemplazo de llaves de auto, recodificaciones de casa y cerraduras de negocio cerca de la Ruta 66 y Garth Brooks Blvd. Aperturas 24 horas. Llama 405-870-5397.',
    h1:'El Cerrajero Móvil de Yukon — Auto, Casa y Negocio',
    intro:'Desde la histórica calle principal de la Ruta 66 hasta el concurrido comercio a lo largo de Garth Brooks Boulevard, Yukon sigue creciendo — y nosotros mantenemos cubiertos a sus conductores, dueños de casa y comerciantes. Llaves y controles de auto perdidos cortados en sitio, recodificaciones de casa y cerraduras comerciales, todo desde una camioneta móvil que va a ti por toda esta comunidad del oeste del área metro.',
    sub:{auto:'Programación de llaves y controles para quienes viajan en Yukon.',res:'Recodificación y cerraduras inteligentes para los vecindarios en crecimiento de Yukon.',comm:'Cerraduras de negocio para el comercio de Garth Brooks Blvd.'} },
  'piedmont':{ metaTitle:'Cerrajero en Piedmont OK | Vamos a Ti | Llaves de Auto y Recodificación',
    metaDesc:'Cerrajero móvil que sirve Piedmont, OK y sus casas en terrenos amplios. Llaves de auto, recodificaciones y apertura — vamos hasta ti. Llama 405-870-5397.',
    h1:'Cerrajero en Piedmont — Salimos Hasta Ti',
    intro:'Las casas de Piedmont están repartidas por mucho campo del noroeste, y eso no es problema para un cerrajero móvil — vamos a ti, sin importar qué tan larga sea la entrada. Llaves de auto perdidas, recodificaciones de casa y aperturas, atendidas en sitio con tarifas fijas honestas.',
    sub:{auto:'Reemplazo de llaves y controles en sitio, por lejos que estés.',res:'Recodificación y cerraduras para casas en terrenos de Piedmont.',comm:'Cerraduras para negocios y tiendas de Piedmont.'} },
  'del-city':{ metaTitle:'Cerrajero en Del City | Descuento Militar | Llaves de Auto y Aperturas',
    metaDesc:'Cerrajero móvil en Del City, OK cerca de Tinker AFB. Descuento militar, reemplazo de llaves de auto, recodificaciones y apertura 24 horas. Llama 405-870-5397.',
    h1:'Cerrajero en Del City — Orgullosos de Servir a Nuestras Familias Militares',
    intro:'Justo al lado de la Base de la Fuerza Aérea Tinker, Del City es hogar de muchas familias militares — y se lo agradecemos con un descuento militar en nuestros servicios. Reemplazamos llaves de auto perdidas para quienes viajan, recodificamos las casas establecidas de la zona y respondemos rápido a aperturas, todo desde una camioneta local con licencia.',
    sub:{auto:'Reemplazo de llaves y controles para quienes viajan cerca de Tinker.',res:'Recodificación y cerrojos para casas de Del City.',comm:'Cerraduras y llaves maestras para negocios locales.'} },
  'mustang':{ metaTitle:'Cerrajero en Mustang OK | Llaves de Auto, Cerraduras Inteligentes y Recodificación',
    metaDesc:'Cerrajero móvil en Mustang, OK. Reemplazo de llaves de auto, cerraduras inteligentes y recodificaciones de casas nuevas para esta comunidad del suroeste en rápido crecimiento. Aperturas 24 horas. Llama 405-870-5397.',
    h1:'Cerrajero para los Vecindarios en Crecimiento de Mustang',
    intro:'Mustang es uno de los suburbios de más rápido crecimiento del área metro, lleno de casas más nuevas y familias ocupadas — justo el trabajo que nos encanta. Recodificamos casas recién compradas para que las llaves del constructor dejen de funcionar, instalamos cerraduras inteligentes, reemplazamos llaves de auto en sitio y vamos a ti rápido cuando te quedas afuera.',
    sub:{auto:'Servicio de llaves y controles para las familias de Mustang.',res:'Recodificaciones de casas nuevas y cerraduras inteligentes.',comm:'Cerraduras para las zonas comerciales en crecimiento de Mustang.'} },
  'midwest-city':{ metaTitle:'Cerrajero en Midwest City OK | Tinker AFB | Llaves de Auto y Aperturas',
    metaDesc:'Cerrajero móvil en Midwest City, OK cerca de Tinker AFB. Reemplazo de llaves de auto amigable con militares, recodificaciones y apertura 24 horas. Llama 405-870-5397.',
    h1:'Cerrajero en Midwest City — Sirviendo a Tinker y Más Allá',
    intro:'Construida alrededor de la Base de la Fuerza Aérea Tinker, Midwest City es hogar de familias militares, personas que viajan al trabajo y el concurrido comercio de la SE 29th y el Town Center. Reemplazamos llaves de auto en sitio, recodificamos casas entre mudanzas y despliegues, instalamos cerrojos nuevos y cerraduras inteligentes, y respondemos rápido a aperturas — desde una camioneta local con licencia.',
    sub:{auto:'Reemplazo de llaves y controles para Midwest City y quienes viajan a Tinker.',res:'Recodificación y cerrojos para casas de Midwest City entre mudanzas.',comm:'Cerraduras de negocio para SE 29th y el Town Center.'} },
  'edmond':{ metaTitle:'Cerrajero en Edmond OK | Llaves de Auto, Casa y Negocio | Turbo Keysmith',
    metaDesc:'Cerrajero móvil en Edmond, OK. Reemplazo de llaves de auto, recodificaciones de casa, cerraduras inteligentes y apertura 24 horas cerca de UCO, Downtown Edmond y el corredor I-35. Llama 405-870-5397.',
    h1:'El Cerrajero Móvil de Edmond — Auto, Casa y Negocio',
    intro:'Edmond combina la vida universitaria alrededor de la University of Central Oklahoma con vecindarios establecidos y subdivisiones de rápido crecimiento hacia la I-35. Cubrimos todo — llaves y controles de auto cortados en sitio, recodificaciones y cerraduras inteligentes para dueños nuevos y de toda la vida, cerraduras de negocio en el centro y apertura 24 horas — desde una camioneta móvil con licencia que va a ti.',
    sub:{auto:'Reemplazo de llaves y controles para quienes viajan en Edmond y estudiantes de UCO.',res:'Recodificación y cerraduras inteligentes para casas nuevas y establecidas de Edmond.',comm:'Cerraduras y llaves maestras para oficinas y tiendas de Edmond.'} },
  'spencer':{ metaTitle:'Cerrajero en Spencer OK | Llaves de Auto Móviles y Aperturas',
    metaDesc:'Cerrajero móvil en Spencer, OK. Reemplazo rápido de llaves de auto, recodificaciones de casa y apertura a lo largo del corredor de la NE 23rd. Llama 405-870-5397.',
    h1:'Cerrajero Móvil en Spencer',
    intro:'Spencer recibe servicio de cerrajería móvil rápido y amable de un equipo local con licencia. Ya sea que hayas dejado las llaves dentro del auto en la NE 23rd, necesites recodificar una casa o hayas perdido tu única llave, vamos a ti y lo resolvemos.',
    sub:{auto:'Reemplazo de llaves y controles en tu ubicación.',res:'Recodificaciones y aperturas para casas de Spencer.',comm:'Cerraduras para negocios de la zona de Spencer.'} },
  'moore':{ metaTitle:'Cerrajero en Moore OK | Llaves de Auto, Recodificación y Aperturas 24 Horas',
    metaDesc:'Cerrajero móvil en Moore, OK. Reemplazo de llaves de auto, recodificaciones de casa, cerraduras inteligentes y apertura rápida a lo largo del corredor I-35 y Old Town Moore. Llama 405-870-5397.',
    h1:'El Cerrajero Móvil de Moore — Vamos a Ti',
    intro:'Justo entre Oklahoma City y Norman sobre la I-35, Moore está lleno de familias ocupadas y casas más nuevas construidas y reconstruidas con los años. Recodificamos casas tras una mudanza o cierre, instalamos cerraduras inteligentes y cerrojos nuevos, reemplazamos llaves de auto perdidas en sitio y respondemos rápido a aperturas — tarifa fija, de día o de noche.',
    sub:{auto:'Reemplazo de llaves y controles para quienes viajan por la I-35 en Moore.',res:'Recodificaciones, cerrojos y cerraduras inteligentes para casas de familia en Moore.',comm:'Cerraduras de negocio para el comercio de Moore en el corredor I-35.'} },
  'nicoma-park':{ metaTitle:'Cerrajero en Nicoma Park OK | Recodificación, Llaves de Auto y Aperturas',
    metaDesc:'Cerrajero móvil en Nicoma Park, OK. Recodificaciones, reemplazo de llaves de auto y apertura 24 horas para esta comunidad del noreste cerca de Choctaw. Llama 405-870-5397.',
    h1:'Servicios de Cerrajería en Nicoma Park',
    intro:'Junto a Choctaw en el lado este del área metro, las casas más antiguas de Nicoma Park a menudo necesitan una recodificación o una renovación de cerraduras — y con gusto ayudamos. Llaves de auto, recodificaciones, reparación de cerraduras y servicio rápido de apertura, todo móvil y de tarifa fija.',
    sub:{auto:'Servicio de llaves y controles en tu puerta.',res:'Recodificación y reparación de cerraduras para casas más antiguas.',comm:'Cerraduras para negocios locales.'} },
  'jones':{ metaTitle:'Cerrajero en Jones OK | Llaves de Auto Móviles y Cerraduras de Casa',
    metaDesc:'Cerrajero móvil que sirve Jones, OK. Reemplazo de llaves de auto, recodificaciones y apertura para esta pequeña comunidad del noreste. Vamos a ti. Llama 405-870-5397.',
    h1:'Cerrajero Móvil para Jones, Oklahoma',
    intro:'Jones conserva su ambiente de pueblo pequeño y campestre, y un cerrajero móvil le queda perfecto — llevamos el taller a tu entrada. Llaves de auto perdidas, recodificaciones de casa y aperturas atendidas en sitio, sin necesidad de ir a la ciudad.',
    sub:{auto:'Servicio de llaves y controles en sitio.',res:'Recodificaciones y aperturas para casas de Jones.',comm:'Cerraduras para negocios y granjas de la zona de Jones.'} },
  'choctaw':{ metaTitle:'Cerrajero en Choctaw OK | Llaves de Auto, Casa y Negocio',
    metaDesc:'Cerrajero móvil en Choctaw, OK. Reemplazo de llaves de auto, recodificaciones de casa y cerraduras de negocio para el lado este del área metro. Aperturas 24 horas. Llama 405-870-5397.',
    h1:'Cerrajero que Sirve Choctaw, Oklahoma',
    intro:'El encanto del “pueblo histórico más grande” de Choctaw viene con una mezcla de casas de toda la vida y vecindarios nuevos en crecimiento cerca de Choctaw Creek Park. Los cubrimos todos — llaves de auto cortadas en sitio, recodificaciones de casa, cerraduras de negocio y ayuda rápida por bloqueo desde una camioneta móvil con licencia.',
    sub:{auto:'Reemplazo de llaves y controles para conductores de Choctaw.',res:'Recodificación y cerraduras inteligentes para casas de Choctaw.',comm:'Cerraduras de negocio y llaves maestras.'} },
  'newcastle':{ metaTitle:'Cerrajero en Newcastle OK | Llaves de Auto, Casa y Negocio',
    metaDesc:'Cerrajero móvil en Newcastle, OK. Reemplazo de llaves de auto, recodificaciones de casa y cerraduras comerciales para esta comunidad del suroeste en crecimiento. Llama 405-870-5397.',
    h1:'El Cerrajero Móvil de Newcastle',
    intro:'Justo al cruzar el río Canadian y creciendo rápido, Newcastle recibe servicio móvil completo — desde llaves de auto para el viaje por la I-44 hasta recodificaciones de casa en sus nuevas subdivisiones y cerraduras para negocios cerca del casino. Vamos a ti, tarifa fija.',
    sub:{auto:'Reemplazo de llaves y controles en sitio.',res:'Recodificaciones de casas nuevas y cerraduras inteligentes.',comm:'Cerraduras de negocio y de llave maestra.'} },
  'norman':{ metaTitle:'Cerrajero en Norman OK | Llaves de Auto, Rentas de OU y Cerraduras de Negocio',
    metaDesc:'Cerrajero móvil en Norman, OK. Reemplazo de llaves de auto, recodificación de rentas estudiantiles, cerraduras inteligentes y cerraduras de negocio cerca de OU y Campus Corner. Llama 405-870-5397.',
    h1:'El Cerrajero Móvil de Norman — Hogar de OU',
    intro:'Hogar de la University of Oklahoma, Norman funciona con estudiantes, inquilinos y residentes de toda la vida por igual. Recodificamos rentas entre inquilinos, reemplazamos llaves y controles de auto en sitio para quienes viajan, instalamos cerraduras inteligentes y aseguramos las tiendas alrededor de Campus Corner y a lo largo de Main Street — todo de un cerrajero móvil con licencia que va a ti.',
    sub:{auto:'Reemplazo de llaves y controles para conductores de Norman y estudiantes de OU.',res:'Recodificación y cerraduras inteligentes para casas de Norman y rentas cerca de OU.',comm:'Cerraduras y llaves maestras cerca de Campus Corner y Main Street.'} },
  'harrah':{ metaTitle:'Cerrajero en Harrah OK | Llaves de Auto, Recodificación y Aperturas',
    metaDesc:'Cerrajero móvil en Harrah, OK. Reemplazo de llaves de auto para quienes viajan, recodificaciones de casa y apertura 24 horas en el lejano lado este del área metro. Llama 405-870-5397.',
    h1:'Servicios de Cerrajería en Harrah',
    intro:'En el lejano borde este del área metro, quienes viajan y los dueños de casa de Harrah aún reciben servicio de cerrajería móvil completo. Cortamos y programamos llaves de auto en sitio, recodificamos casas tras una mudanza y respondemos a aperturas — hacemos el viaje para que tú no tengas que hacerlo.',
    sub:{auto:'Llaves y controles para quienes viajan en Harrah.',res:'Recodificaciones y cerraduras para casas de Harrah.',comm:'Cerraduras de negocio para la zona.'} },
  'el-reno':{ metaTitle:'Cerrajero en El Reno OK | Llaves de Auto, Casa y Negocio',
    metaDesc:'Cerrajero móvil en El Reno, OK. Reemplazo de llaves de auto, recodificaciones de casa y cerraduras de negocio del centro a lo largo de la Ruta 66 y la I-40. Llama 405-870-5397.',
    h1:'Cerrajero que Sirve El Reno, Oklahoma',
    intro:'Hogar de la hamburguesa con cebolla frita y un orgulloso pueblo de la Ruta 66, El Reno es la sede del condado de Canadian con un centro activo. Reemplazamos llaves de auto en sitio para quienes viajan por la I-40, recodificamos casas y aseguramos las tiendas y oficinas alrededor de Main Street.',
    sub:{auto:'Servicio de llaves y controles para conductores de El Reno.',res:'Recodificación y reparación de cerraduras para casas de El Reno.',comm:'Cerraduras de negocio del centro y llaves maestras.'} },
  'guthrie':{ metaTitle:'Cerrajero en Guthrie OK | Casas Históricas, Llaves de Auto y Cerraduras',
    metaDesc:'Cerrajero móvil en Guthrie, OK. Reparación y recodificación de cerraduras para casas históricas, reemplazo de llaves de auto y cerraduras de negocio en el centro. Llama 405-870-5397.',
    h1:'Cerrajero para las Casas y Negocios Históricos de Guthrie',
    intro:'Primera capital de Oklahoma, Guthrie es famosa por su centro victoriano y sus casas históricas — que a menudo tienen cerraduras antiguas y con carácter que necesitan una mano cuidadosa. Las reparamos y recodificamos, reemplazamos llaves de auto en sitio y aseguramos las tiendas históricas del centro.',
    sub:{auto:'Reemplazo de llaves y controles para conductores de Guthrie.',res:'Recodificación y reparación de cerraduras para casas históricas.',comm:'Cerraduras para los negocios históricos del centro.'} },
  'tuttle':{ metaTitle:'Cerrajero en Tuttle OK | Llaves de Auto Móviles, Recodificación y Aperturas',
    metaDesc:'Cerrajero móvil que sirve Tuttle, OK. Reemplazo de llaves de auto, recodificaciones de casa y apertura para este pueblo del suroeste en crecimiento. Vamos a ti. Llama 405-870-5397.',
    h1:'Cerrajero Móvil en Tuttle, Oklahoma',
    intro:'El ritmo de pueblo pequeño de Tuttle y sus casas nuevas en crecimiento están cubiertos por nuestra camioneta móvil. Cortamos y programamos llaves de auto en el momento, recodificamos casas tras un cierre y respondemos a aperturas por toda esta comunidad del suroeste — tarifas fijas, sin ir al taller.',
    sub:{auto:'Servicio de llaves y controles en sitio.',res:'Recodificaciones de casas nuevas y cerraduras inteligentes.',comm:'Cerraduras para negocios de Tuttle.'} },
  'goldsby':{ metaTitle:'Cerrajero en Goldsby OK | Llaves de Auto Móviles y Cerraduras de Casa',
    metaDesc:'Cerrajero móvil que sirve Goldsby, OK cerca de Riverwind. Reemplazo de llaves de auto, recodificaciones y apertura — vamos a ti. Llama 405-870-5397.',
    h1:'Cerrajero Móvil que Sirve Goldsby',
    intro:'Cerca de Riverwind, las casas y los viajeros de Goldsby reciben servicio móvil completo — llaves de auto perdidas hechas en sitio, recodificaciones de casa y ayuda por bloqueo. Llevamos el taller a ti, con precios fijos honestos.' },
  'noble':{ metaTitle:'Cerrajero en Noble OK | Llaves de Auto, Recodificación y Aperturas',
    metaDesc:'Cerrajero móvil en Noble, OK, la Capital de la Rosa de Roca. Reemplazo de llaves de auto, recodificaciones de casa y apertura 24 horas cerca de Norman. Llama 405-870-5397.',
    h1:'Cerrajero Móvil para Noble, Oklahoma',
    intro:'Noble — la Capital de la Rosa de Roca justo al sur de Norman — recibe llaves de auto, recodificaciones de casa, cerraduras de negocio y ayuda rápida por bloqueo, todo en sitio. Una llamada lleva un cerrajero móvil con licencia a tu puerta, tarifa fija y amable.' },
  'blanchard':{ metaTitle:'Cerrajero en Blanchard OK | Llaves de Auto, Casa y Negocio',
    metaDesc:'Cerrajero móvil que sirve Blanchard, OK. Reemplazo de llaves de auto, recodificaciones de casa, cerraduras de negocio y apertura — vamos hasta ti. Llama 405-870-5397.',
    h1:'Cerrajero Móvil que Sirve Blanchard',
    intro:'Esta comunidad dormitorio en crecimiento del suroeste recibe servicio de cerrajería móvil completo de un equipo local con licencia — llaves de auto cortadas y programadas en sitio, recodificaciones de casa, cerraduras de negocio y ayuda por bloqueo. Hacemos el viaje a Blanchard para que tú no tengas que ir a la ciudad.' }
};

// ============================================================================
//  NEW pages/sections mirrored from English (2026-06). All DRAFT / machine-quality.
//  ⚠️ WARRANTY and TERMS especially MUST be proofread by a bilingual professional
//  (locksmith + legal terms) before /es/ is published.
// ============================================================================

// Financing / Payment-Options page (/es/financing/)
export const FINANCING = {
  title:'Cerrajero Económico y Planes de Pago en OKC | Turbo Keysmith',
  desc:'Cerrajero económico en Oklahoma City, hecho bien — con licencia, autorizado por NASTF, trabajo de calidad con planes de pago flexibles y sin intereses (Klarna, Afterpay, Zip) en pago seguro. No el más barato; el de mejor valor. Llama 405-870-5397.',
  h1:'Servicio de Cerrajería Económico en OKC — Sin Atajos',
  intro:'¿Buscas un cerrajero barato o económico en Oklahoma City? Respuesta honesta: no somos los más baratos — y cuando se trata de tu auto, tu casa o la seguridad de tu familia, probablemente no quieres lo más barato. Somos el de mejor valor: trabajo con licencia, autorizado por NASTF y de alta calidad, junto con opciones de pago flexibles, para que un bloqueo inesperado nunca tenga que esperar al día de pago.',
  payHead:'Trabajo de calidad, pagado a tu manera',
  payBody:'A través de nuestro pago seguro puedes dividir tu cuenta en 4 pagos sin intereses en trabajos que califican con Klarna, Afterpay o Zip — la aprobación toma segundos y el trabajo se hace hoy. También aceptamos todas las tarjetas principales, efectivo y pago digital rápido con Amazon Pay, Cash App Pay y Link. (PayPal Pay-in-4 disponible si lo solicitas.)',
  oneOf:'Somos uno de los pocos cerrajeros del área metro de OKC que ofrece financiamiento de pago a plazos.',
  cheapHead:'Por qué lo «barato» puede costar más',
  cheapBody:'Una programación de llave mal hecha, una cerradura perforada sin necesidad o una pieza barata que falla pronto — el cerrajero más barato a menudo termina siendo el más caro. Lo hacemos bien a la primera, y los pagos flexibles hacen que obtengas esa calidad sin el golpe por adelantado.',
  whenHead:'Cuándo ayuda más el financiamiento',
  whenBody:'Ideal para trabajos grandes e inesperados — reemplazo de llave de auto cuando se perdieron todas, instalación de cerraduras inteligentes, recodificación de toda la casa y mejoras de seguridad comercial.',
  ctaQuote:'Obtén una cotización al instante', payNow:'Pagar →'
};

// 6-Month Key Warranty page (/es/warranty/) — ⚠️ NEEDS HUMAN PROOFREADING
export const WARRANTY = {
  reviewNote:'⚠️ BORRADOR — Esta traducción de la garantía debe ser revisada por un hablante nativo de español con conocimiento de cerrajería antes de publicar. No confiar en la traducción automática para los términos técnicos.',
  title:'Garantía de Llaves de 6 Meses | Turbo Keysmith — Cerrajero de OKC',
  desc:'Cada llave y control de auto que programamos está respaldado por una garantía de mano de obra de 6 meses — programación, función del control / botón de encendido y el corte. Consulta la cobertura, exclusiones y cómo funciona. Llama 405-870-5397.',
  h1:'Garantía de Llaves de 6 Meses — Respaldamos Nuestro Trabajo',
  intro:'Cada llave y control de auto que programamos está respaldado por una garantía de mano de obra de 6 meses. Si una llave o control que hicimos falla por un defecto — pierde su programación, los botones dejan de funcionar, el botón de encendido o el arranque remoto deja de ser reconocido, o la llave no gira por un corte defectuoso — la repararemos o reprogramaremos sin cargo por piezas ni mano de obra durante seis meses.',
  coveredHead:'Qué cubre',
  coveredBody:'Programación / reconocimiento del inmovilizador, función del control y de proximidad (botón de encendido), cualquier arranque remoto que configuremos, el corte mecánico y los defectos en la llave o el control que suministramos.',
  notCoveredHead:'Qué no cubre',
  notCoveredBody:'Llaves perdidas o robadas; daño físico o por agua (caída, atropello, aplastamiento, mordeduras, líquidos); baterías agotadas del control (un artículo de desgaste normal); y problemas causados por el vehículo y no por la llave — una batería de auto descargada, cableado o inmovilizador defectuoso del vehículo, o actualizaciones de software del fabricante/concesionario que borran la programación.',
  howHead:'Cómo funciona',
  howIntro:'Si ocurre un defecto cubierto dentro de los 6 meses, llámanos.',
  bullets:[
    'Si tu vehículo se puede conducir, tráelo y repararemos o reprogramaremos gratis un defecto cubierto. Si prefieres que vayamos a ti, está bien — pero aplica una tarifa por visita.',
    'Si tu vehículo no se puede conducir, iremos a ti gratis por un defecto cubierto, en cualquier lugar dentro de nuestra zona de servicio del área de OKC (un radio de unas 30 millas).',
    'Fuera de nuestra zona de servicio, el defecto sigue cubierto pero el viaje no — no ofrecemos servicio móvil, no reembolsamos a otro cerrajero ni cubrimos grúa para vehículos a más de ~30 millas o fuera de la ciudad. Eres bienvenido a traerlo con nosotros.',
    'Aplica una tarifa por visita y no se exime si vamos y el problema resulta ser daño, una batería de auto descargada o que no es un problema de la llave.'
  ],
  cta:'📞 ¿Preguntas? Llama 405-870-5397', seeTerms:'Ver los Términos y Condiciones completos →'
};

// Terms & Conditions page (/es/terms/) — ⚠️ NEEDS HUMAN LEGAL PROOFREADING
export const TERMS = {
  reviewNote:'⚠️ BORRADOR LEGAL — Esta traducción debe ser revisada por un profesional bilingüe (términos legales y de cerrajería) antes de usarse o publicarse. No usar como contrato hasta su revisión.',
  title:'Términos y Condiciones / Acuerdo de Servicio | Turbo Keysmith',
  desc:'Acuerdo de servicio de Turbo Keysmith: autorización y propiedad, precios y pago, la garantía de llaves de auto de 6 meses, limitación de responsabilidad y aceptación. Con licencia OK #AC441081.',
  h1:'Términos y Condiciones — Acuerdo de Servicio',
  printBtn:'⬇ Descargar / Imprimir PDF',
  s1h:'1. Autorización y Propiedad',
  s1:'Al solicitar el servicio y firmar, confirmas que eres dueño del vehículo o la propiedad, o que estás autorizado para aprobar este trabajo, y que cualquier identificación o prueba de propiedad solicitada se proporcionó con veracidad. Podemos rechazar o detener el servicio si no se puede verificar la propiedad/autorización.',
  s2h:'2. Precios y Pago',
  s2:'Damos un precio antes de comenzar el trabajo; el pago vence al completarse. Aceptamos efectivo, tarjetas de débito/crédito, billeteras digitales (Amazon Pay, Cash App Pay, Link) y financiamiento de pago a plazos (Klarna, Afterpay, Zip; PayPal Pay-in-4 si lo solicitas). Aplica un recargo de hasta el 2% solo a los pagos con tarjeta de crédito — nunca a débito ni a financiamiento — y se informa antes de cobrar. El financiamiento lo proporcionan terceros bajo sus propios términos; a nosotros se nos paga en su totalidad al momento del servicio.',
  s3h:'3. Garantía de Llaves de Auto de 6 Meses',
  s3:'Cada llave y control de auto que programamos está respaldado por una garantía de mano de obra de 6 meses. Cubre: programación/reconocimiento del inmovilizador, función del control y de proximidad (botón de encendido), cualquier arranque remoto que configuremos, el corte mecánico y los defectos en la llave o el control que suministramos. No cubre: llaves perdidas o robadas; daño físico o por agua; baterías agotadas del control; y problemas del lado del vehículo (batería descargada, cableado o inmovilizador defectuoso, o actualizaciones de software del fabricante/concesionario que borran la programación). Servicio: si tu vehículo se puede conducir, tráelo y un defecto cubierto se repara o reprograma gratis; si no se puede conducir, vamos a ti gratis dentro de nuestra zona de servicio del área de OKC (radio de ~30 millas). Fuera de esa zona, el defecto está cubierto pero el viaje no. Aplica una tarifa por visita y no se exime si el problema resulta ser daño, una batería de auto descargada o que no es un problema de la llave. Términos completos: nuestra página de Garantía.',
  s4h:'4. Limitación de Responsabilidad',
  s4:'No somos responsables de condiciones preexistentes, daños previos ni fallas mecánicas/eléctricas no causadas por nuestro trabajo. Nuestra responsabilidad total por cualquier reclamo se limita al monto pagado por el servicio. No somos responsables de pérdidas indirectas o consecuentes.',
  s5h:'5. Aceptación',
  s5:'Al firmar nuestra factura/recibo, reconoces que has leído y aceptas estos Términos y Condiciones.',
  footLine:'Turbo Keysmith · OK Lic. #AC441081 · 405-870-5397 · turbokeysmith.com/terms'
};

// FAQ (/es/faq/) — visible Q&As + FAQPage schema. `link` (optional) is appended to
// the VISIBLE answer only; the schema "text" uses the plain `a` to stay in sync.
export const FAQ_META = {
  title:'Preguntas Frecuentes | Turbo Keysmith — Cerrajero del Área de OKC',
  desc:'Respuestas rápidas sobre el servicio de cerrajería móvil de Turbo Keysmith en el área de OKC — horario, zonas, llaves de auto, pagos, financiamiento y garantía. Llama 405-870-5397.',
  h1:'Preguntas Frecuentes',
  intro:'Respuestas rápidas sobre el servicio de cerrajería móvil de Turbo Keysmith en el área metropolitana de OKC.',
  still:'📞 ¿Aún tienes una pregunta? Llama: 405-870-5397'
};
export const FAQ = [
  { q:'¿Son un cerrajero móvil?', a:'Sí. Turbo Keysmith es totalmente móvil — vamos a ti en cualquier parte del área metropolitana de Oklahoma City, ya sea en casa, en el trabajo o varado en un estacionamiento.' },
  { q:'¿Cuál es su horario?', a:'Estamos abiertos las 24 horas, de lunes a sábado, para emergencias, y el domingo hasta las 5:00 a. m. Llama o envía un texto al 405-870-5397 a cualquier hora.' },
  { q:'¿Qué zonas atienden?', a:'Atendemos Oklahoma City, Edmond, Moore, Norman, Yukon, Warr Acres, Bethany, Midwest City, Del City y el área metropolitana circundante.' },
  { q:'¿Pueden hacer una llave de auto si perdí todas las mías?', a:'Sí. Como cerrajero autorizado por NASTF con herramientas a nivel de concesionario, podemos cortar y programar llaves y controles de repuesto para la mayoría de las marcas y modelos en sitio — normalmente más rápido y por menos que el concesionario.' },
  { q:'¿Cómo puedo pagar?', a:'Aceptamos efectivo, todas las tarjetas de crédito y débito principales, y opciones digitales rápidas como Amazon Pay, Cash App Pay y Link. ¿Quieres dividir el costo? En trabajos que califican puedes pagar a plazos, sin intereses, dividiéndolo en 4 pagos con Klarna, Afterpay o Zip — directamente en nuestro pago en línea seguro en la página de Pagar. PayPal Pay-in-4 está disponible si lo solicitas.', link:{ href:'pay-now', label:'Ir a Pagar →' } },
  { q:'¿Ofrecen financiamiento o planes de pago?', a:'Sí. El trabajo de cerrajería de calidad no debería tener que esperar al día de pago. En trabajos que califican puedes dividir tu cuenta en 4 pagos sin intereses con Klarna, Afterpay o Zip directamente en nuestro pago seguro — la aprobación toma segundos. Así hacemos accesible el trabajo a nivel de concesionario y autorizado por NASTF: no somos el cerrajero más barato, somos el de mejor valor, con la flexibilidad de pagar a plazos. PayPal Pay-in-4 está disponible si lo solicitas.', link:{ href:'financing', label:'Ver opciones de pago →' } },
  { q:'¿Dan garantía a sus llaves de auto?', a:'Sí — cada llave y control de auto que programamos lleva una garantía de mano de obra de 6 meses que cubre la programación, la función del control / botón de encendido y el corte. No cubre llaves perdidas, robadas o dañadas, baterías agotadas del control, ni problemas del vehículo. Si tu auto se puede conducir, tráelo y un defecto cubierto se arregla gratis; si no se puede conducir, vamos a ti dentro de nuestra zona de servicio de OKC. Consulta nuestra página de Garantía para los términos completos.', link:{ href:'warranty', label:'Ver la Garantía →' } },
  { q:'¿Tienen licencia?', a:'Sí — Turbo Keysmith es un cerrajero con licencia de Oklahoma, OK Lic. #AC441081.' }
];

// Teasers (homepage + service pages)
export const FINTEASER = { title:'Financiamiento flexible disponible', body:'Divide los trabajos que califican en 4 pagos sin intereses con Klarna, Afterpay o Zip — trabajo de calidad que no tiene que esperar al día de pago.', more:'Ver opciones de pago →' };
export const WARRTEASER = { title:'Garantía de Llaves de 6 Meses', body:'Cada llave y control de auto que programamos está respaldado por 6 meses — programación, botón de encendido, control y el corte.', more:'Ver la garantía →' };

// ── Certifications (/es/certifications/ hub + dedicated pages) ──────────────
// ⚠️ Credential pages — accuracy matters; MUST be proofread by a fluent reviewer.
export const CRED_REVIEW_NOTE = '⚠️ BORRADOR — Página de credenciales: la exactitud importa. Esta traducción debe ser revisada por un hablante nativo de español antes de publicar.';
export const BUSINESSRATE = 'Cerrajero Mejor Calificado — BusinessRate (según reseñas verificadas de clientes).';
// ⚠️ DRAFT — award claim, proofread before publish.
export const AWARD = '🏆 Lo Mejor de 2026 · Cerrajero #1 en el Oeste de Oklahoma — BusinessRate';
export const AWARD_ND = '🏡 Votado Favorito del Vecindario 2025 en Nextdoor';
export const CERTHUB = {
  title:'Certificaciones, Licencias y Credenciales | Turbo Keysmith — Cerrajero de OKC',
  desc:'Turbo Keysmith es un cerrajero de Oklahoma con licencia y verificado: Google Verified, Licencia OK #AC441081, NASTF VSP, Certificado Keyless2Go, además de membresía en OMLA y OKBFAA. Llama 405-870-5397.',
  h1:'Certificaciones, Licencias y Credenciales',
  intro:'Cuando dejas entrar a un cerrajero a tu casa, auto o negocio, las credenciales importan. Turbo Keysmith es un cerrajero de Oklahoma con licencia, verificado y local — aquí está la prueba, y lo que cada una significa para ti.',
  licHead:'Licencias y Credenciales', licSub:'Verificadas de forma independiente — las credenciales que cuesta ganarse.',
  assocHead:'Asociaciones Profesionales', assocSub:'Membresías que reflejan capacitación continua y estándares profesionales.',
  recHead:'Reconocimiento', learnMore:'Más información →', crumb:'Certificaciones',
  whatIs:'Qué es', whatTakes:'Qué se necesita para obtenerla', whatMeans:'Qué significa para ti',
  backHub:'← Todas las certificaciones y credenciales'
};
export const CREDS = [
  { slug:'certifications/google-verified', group:'license', featured:true, name:'Google Verified (Verificado por Google)',
    title:'Cerrajero Verificado por Google en OKC | Turbo Keysmith',
    metaDesc:'Turbo Keysmith tiene la insignia Google Verified — Google verifica antecedentes, licencia y seguro del negocio. Qué significa para ti. Llama 405-870-5397.',
    h1:'Google Verified — Verificado de Forma Independiente por Google',
    teaser:'La marca de confianza de Google para negocios que pasan su verificación de Local Services — antecedentes, licencia y seguro.',
    whatIs:'Tenemos la insignia Google Verified — la marca de confianza que Google muestra para los negocios que pasan su verificación de Local Services.',
    whatTakes:'Para obtenerla, Google verifica el negocio mediante revisión de antecedentes, validación de licencia y verificación de seguro.',
    whatMeans:'El propio Google ha confirmado que somos un cerrajero real, con licencia, asegurado y con antecedentes verificados — un voto de confianza independiente antes de que siquiera levantes el teléfono.' },
  { slug:'oklahoma-license', group:'license', featured:true, name:'Licencia de Cerrajero de Oklahoma #AC441081',
    title:'Licencia de Cerrajero de Oklahoma #AC441081 | Turbo Keysmith',
    metaDesc:'Turbo Keysmith tiene la Licencia de Cerrajero de Oklahoma #AC441081 (Departamento de Trabajo de Oklahoma) — huellas, verificación de antecedentes del FBI y un examen estatal. Llama 405-870-5397.',
    h1:'Licencia de Cerrajero de Oklahoma #AC441081',
    teaser:'Licencia estatal #AC441081 — Oklahoma es uno de ~15 estados que exigen huellas, verificación de antecedentes del FBI y un examen de competencia.',
    whatIs:'Oklahoma es uno de solo unos 15 estados que exigen legalmente que los cerrajeros tengan licencia — la mayoría no lo hace, lo que significa que cualquiera puede llamarse cerrajero. La licencia se tramita a través del programa de Alarmas, Cerrajería y Rociadores contra Incendios del Departamento de Trabajo de Oklahoma.',
    whatTakes:'Obtenerla requiere toma de huellas, una verificación de antecedentes del FBI y aprobar el examen estatal de competencia.',
    whatMeans:'Confías la seguridad de tu casa, vehículo o negocio a alguien a quien el estado ha verificado, examinado y responsabiliza — tu primera protección frente a las estafas de cerrajeros en aumento.' },
  { slug:'nastf', group:'license', name:'Profesional de Seguridad Vehicular NASTF (VSP)',
    title:'Cerrajero Profesional de Seguridad Vehicular NASTF (VSP) | Turbo Keysmith',
    metaDesc:'Turbo Keysmith está acreditado como NASTF VSP con un LSID personal — acceso verificado a nivel de concesionario a códigos de llave e inmovilizador del fabricante. Llama 405-870-5397.',
    h1:'Profesional de Seguridad Vehicular NASTF (VSP) — Acreditado con LSID',
    teaser:'Acceso verificado, a nivel de concesionario, a los códigos de llave y datos del inmovilizador del fabricante, con un LSID personal.',
    whatIs:'El National Automotive Service Task Force es una organización sin fines de lucro fundada en 2000 por los fabricantes de autos y la industria de reparación independiente, y su Registro de Profesionales de Seguridad Vehicular verifica y acredita a cerrajeros profesionales para acceder a los sistemas de seguridad del fabricante.',
    whatTakes:'Acreditarse implica pasar una verificación de antecedentes y aceptar términos estrictos, tras lo cual se te asigna un número personal de Identificación de Cerrajero (LSID), asignado uno a uno a la persona.',
    whatMeans:'Es acceso legítimo a nivel de concesionario — nos permite obtener los mismos códigos de llave seguros y datos del inmovilizador que usa el concesionario, para hacer y programar llaves de prácticamente cualquier marca, de la forma correcta, como profesionales verificados y no como intermediarios dudosos de códigos.' },
  { slug:'keyless2go', group:'license', name:'Cerrajero Certificado Keyless2Go',
    title:'Cerrajero Certificado Keyless2Go | Turbo Keysmith — OKC',
    metaDesc:'Turbo Keysmith es un cerrajero Certificado Keyless2Go — controles de calidad de fábrica (OE), registrados ante la FCC, con precios claros por adelantado, hasta 70% menos que el concesionario. Llama 405-870-5397.',
    h1:'Cerrajero Certificado Keyless2Go',
    teaser:'Instalador certificado de controles de calidad de fábrica (OE), registrados ante la FCC — precios transparentes, hasta 70% menos que el concesionario.',
    whatIs:'Keyless2Go es una de las principales marcas de controles de llave de auto del mercado de repuestos del país, con más de 5 millones de controles vendidos, conocida por componentes de calidad de fábrica (OE) y registrados ante la FCC.',
    whatTakes:'Su Red de Instaladores Certificados verifica que los participantes sean cerrajeros profesionales genuinos y los somete a un código de conducta con precios claros por adelantado, sin cargos sorpresa, y un sistema de reseñas de clientes en el que debes mantener una calificación satisfactoria para seguir certificado.',
    whatMeans:'Piezas de llave de calidad premium, equivalentes a las del concesionario, que cubren la gran mayoría de los vehículos, con ahorros de hasta 70% frente al concesionario — y con precios que ves antes de empezar cualquier trabajo.' },
  { slug:'omla', group:'assoc', name:'Asociación de Cerrajeros Maestros de Oklahoma (OMLA)', link:'https://omla.com',
    title:'Miembro de la Asociación de Cerrajeros Maestros de Oklahoma (OMLA) | Turbo Keysmith',
    metaDesc:'Turbo Keysmith es miembro de la Asociación de Cerrajeros Maestros de Oklahoma (OMLA) — capacitación continua y estándares profesionales más altos. Llama 405-870-5397.',
    h1:'Asociación de Cerrajeros Maestros de Oklahoma (OMLA)',
    teaser:'La asociación profesional de cerrajeros del estado — capacitación continua y estándares de seguridad más altos.',
    whatIs:'OMLA es la asociación profesional de cerrajeros del estado, dedicada a la cooperación entre los cerrajeros de Oklahoma y a promover estándares más altos de seguridad y profesionalismo.',
    whatTakes:'Los miembros tienen acceso a clases de preparación para la licencia y de educación continua sancionadas por el ODOL, que cubren cerrajería y control de acceso.',
    whatMeans:'La membresía indica un cerrajero que invierte en capacitación continua y se exige los estándares de la profesión, en lugar de improvisar.' },
  { slug:'okbfaa', group:'assoc', name:'Asociación de Alarmas contra Robo e Incendio de Oklahoma (OKBFAA)', link:'https://okbfaa.org',
    title:'Miembro de la Asociación de Alarmas contra Robo e Incendio de Oklahoma (OKBFAA) | Turbo Keysmith',
    metaDesc:'Turbo Keysmith es miembro de la Asociación de Alarmas contra Robo e Incendio de Oklahoma (OKBFAA) — al día en códigos y estándares de seguridad electrónica para trabajos comerciales. Llama 405-870-5397.',
    h1:'Asociación de Alarmas contra Robo e Incendio de Oklahoma (OKBFAA)',
    teaser:'Membresía en la asociación estatal de seguridad electrónica — al día en códigos y estándares de control de acceso.',
    whatIs:'OKBFAA se dedica a promover a profesionales con licencia en la industria de la seguridad electrónica y a educar a sus miembros sobre los últimos productos, códigos y estándares, trabajando de cerca con el Departamento de Trabajo de Oklahoma.',
    whatMeans:'Demuestra que nos mantenemos al día en estándares de seguridad electrónica y control de acceso — especialmente relevante para el trabajo de seguridad comercial y de negocios.' }
];
