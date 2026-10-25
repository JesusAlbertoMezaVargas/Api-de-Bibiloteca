// Servicios de la Biblioteca de la Alameda que aparecen en el plano (areas.html).
// Cada uno tiene su guía en servicio.html?id=<id>. Mientras GET /api/areas no esté
// implementado, el contenido vive aquí; después puede llegar desde la API con la misma forma.

export const CATEGORIAS = {
  acervo: 'Acervo y catálogo',
  lectura: 'Lectura y estancia',
  actividades: 'Actividades y talleres',
  servicios: 'Servicios al usuario',
  admin: 'Administración',
};

const foto = (archivo, alt) => ({ src: `img/servicios/${archivo}`, alt });

const estanteria = (numero, temas, fotos, extra = {}) => ({
  id: `estanteria-${numero}`,
  nombre: `Estantería ${numero}`,
  detalle: temas,
  categoria: 'acervo',
  ubicacion: numero <= 3
    ? 'Centro de la sala, a la izquierda del Colegio bibliográfico'
    : 'Centro de la sala, a la derecha del Colegio bibliográfico',
  resumen: `Estante de libros de libre acceso con los temas: ${temas}. Los libros están ordenados por número de clasificación; el número aparece en el lomo de cada libro.`,
  queHacer: [
    'Buscar y hojear libros de estos temas sin pedir permiso.',
    'Leerlos en las mesas que están frente a las estanterías.',
    'Llevar el libro a Préstamo de libros si quieres leerlo en casa.',
  ],
  pasos: [
    'Si no sabes qué número buscar, consulta primero el Catálogo público.',
    'Lee el letrero en la cabecera de la estantería para confirmar los temas que tiene.',
    'Busca el número de clasificación en el lomo de los libros; van de menor a mayor.',
    'Toma el libro con cuidado y siéntate en una de las mesas cercanas.',
    'Al terminar, no lo regreses al estante: déjalo en el carrito o en la mesa para que el personal lo acomode.',
  ],
  fotos,
  ...extra,
});

export const SERVICIOS = [
  {
    id: 'salon-arguello',
    nombre: 'Salón Argüello',
    detalle: 'Área general (usuarios)',
    categoria: 'lectura',
    ubicacion: 'Centro de la biblioteca, frente a la entrada',
    resumen: 'Es el área general de la biblioteca, abierta a todos los usuarios. Tiene mesas y sillas para leer, estudiar o hacer tareas, rodeada de las estanterías del acervo.',
    queHacer: [
      'Leer libros del acervo o tus propios materiales.',
      'Estudiar o hacer tareas de forma individual o en grupo.',
      'Consultar libros de las estanterías cercanas.',
    ],
    pasos: [
      'Regístrate en Recepción al entrar y deja ahí tus mochilas o bolsas.',
      'Camina hacia el centro de la biblioteca, bajo el letrero "Solón Argüello".',
      'Elige una mesa libre.',
      'Toma los libros que necesites de las estanterías.',
      'Mantén un volumen de voz bajo para no molestar a los demás.',
      'Al irte, deja los libros sobre la mesa o en el carrito y recoge tus pertenencias en Recepción.',
    ],
    fotos: [
      foto('salon-arguello-1.jpeg', 'Mesas de lectura del Salón Argüello'),
      foto('salon-arguello-2.jpeg', 'Vista general del Salón Argüello con estanterías alrededor'),
    ],
  },
  {
    id: 'consulta',
    nombre: 'Colección de consulta',
    detalle: 'Diccionarios, enciclopedias y obras de referencia',
    categoria: 'acervo',
    ubicacion: 'Esquina superior izquierda, junto a Oficinas',
    resumen: 'Reúne obras de referencia como enciclopedias, diccionarios y atlas. Estos materiales se consultan dentro de la biblioteca y no se prestan a domicilio.',
    queHacer: [
      'Consultar enciclopedias, diccionarios y atlas.',
      'Buscar datos rápidos para tareas o investigaciones.',
    ],
    pasos: [
      'Dirígete a la esquina superior izquierda de la biblioteca.',
      'Busca el tema o el tipo de obra que necesitas en los estantes.',
      'Lee el material en una mesa cercana.',
      'Si necesitas copiar información, toma notas o fotografías sin flash.',
      'Al terminar, deja el libro sobre la mesa para que el personal lo acomode.',
    ],
    nota: 'Los libros de consulta no salen de la biblioteca.',
    fotos: [foto('consulta.jpeg', 'Estantes de la Colección de consulta')],
  },
  {
    id: 'catalogo',
    nombre: 'Catálogo público',
    detalle: 'Clasificación de libros',
    categoria: 'acervo',
    ubicacion: 'Parte superior, junto al baño de mujeres',
    resumen: 'Ficheros de madera con tarjetas de todos los libros de la biblioteca, ordenadas por autor, título y materia. Te dicen el número de clasificación para encontrar el libro en las estanterías.',
    queHacer: [
      'Buscar un libro por autor, título o tema.',
      'Conocer el número de clasificación de un libro.',
      'Saber en qué estantería está un libro.',
    ],
    pasos: [
      'Decide cómo vas a buscar: por autor, por título o por materia (tema).',
      'Abre el cajón del fichero que corresponde a la letra inicial de lo que buscas.',
      'Pasa las tarjetas hasta encontrar el libro.',
      'Anota el número de clasificación que aparece en la tarjeta (por ejemplo, 860).',
      'Busca la estantería con ese rango de números: 000 a 300 en la 1, 500 a 600 en la 3 y 800 a 900 en la 5 y 6.',
      'Regresa la tarjeta a su lugar y cierra el cajón.',
    ],
    fotos: [foto('catalogo.jpeg', 'Ficheros del Catálogo público')],
  },
  estanteria(1, '000 Generalidades, 100 Filosofía y psicología, 200 Religión y 300 Ciencias sociales', [
    foto('estanteria-1.jpeg', 'Estantería 1 con letreros de las clases 000 a 300'),
  ]),
  estanteria(2, 'continúa la clasificación entre la estantería 1 y la 3 (300 a 400)', [
    foto('estanteria-2-1.jpeg', 'Cabecera de la Estantería 2 con la tabla de clasificación'),
    foto('estanteria-2-2.jpeg', 'Pasillo de la Estantería 2'),
  ]),
  estanteria(3, '500 Ciencias naturales y matemáticas y 600 Tecnología (ciencias aplicadas)', [
    foto('estanteria-3.jpeg', 'Estantería 3 con letreros de las clases 500 y 600'),
  ]),
  {
    id: 'estanteria-4',
    nombre: 'Colegio bibliográfico',
    detalle: 'Estantería 4',
    categoria: 'acervo',
    ubicacion: 'Centro de la sala, entre las estanterías 3 y 5',
    resumen: 'Estantería en forma de herradura que reúne una selección de libros y exhibiciones temáticas que cambian según el mes (por ejemplo, la exhibición de octubre).',
    queHacer: [
      'Ver las exhibiciones y novedades del mes.',
      'Hojear libros de la selección temática.',
    ],
    pasos: [
      'Camina al centro de la sala, entre las estanterías 3 y 5.',
      'Revisa las mesas de exhibición al frente: ahí están los libros destacados del mes.',
      'Recorre la herradura para ver el resto de la selección.',
      'Lee el libro en una de las mesas cercanas o llévalo a Préstamo de libros.',
    ],
    fotos: [
      foto('colegio-bibliografico.jpeg', 'Colegio bibliográfico en forma de herradura con exhibición de octubre'),
      foto('estanteria-4.jpeg', 'Cabecera de estantería con la tabla de clasificación'),
    ],
  },
  estanteria(5, '800 Literatura y retórica', [
    foto('estanteria-5.jpeg', 'Estantería 5 con el letrero de la clase 800'),
  ]),
  estanteria(6, '800 Literatura y retórica y 900 Geografía e historia', [
    foto('estanteria-6.jpeg', 'Estantería 6 con letreros de las clases 800 y 900'),
  ]),
  estanteria(7, 'libros donados: encuentras de todo un poco', [
    foto('estanteria-7.jpeg', 'Estantería 7 de libros donados'),
  ], {
    resumen: 'Estante de libros donados por la comunidad. Hay de todo un poco: novelas, libros de texto, revistas y más, sin un orden por tema.',
    pasos: [
      'Camina a la estantería 7, la última a la derecha.',
      'Recorre los estantes con calma: los libros no están ordenados por tema.',
      'Toma el libro que te interese y léelo en una de las mesas cercanas.',
      'Si quieres donar un libro, pregunta en Recepción.',
    ],
  }),
  {
    id: 'mesas',
    nombre: 'Mesas de lectura',
    detalle: 'Frente a las estanterías y junto a Préstamo',
    categoria: 'lectura',
    ubicacion: 'Frente a las estanterías 1 a 3 y 5 a 7, y una junto a Préstamo de libros',
    resumen: 'Mesas pequeñas para leer cerca de los estantes, ideales para hojear un libro antes de decidir si lo pides prestado.',
    queHacer: [
      'Leer o revisar libros recién tomados de las estanterías.',
      'Estudiar en un lugar tranquilo.',
    ],
    pasos: [
      'Busca una mesa libre frente a las estanterías.',
      'Lleva solo los libros que vas a usar.',
      'Mantén la mesa limpia: no se permite comer.',
      'Al irte, deja los libros sobre la mesa para que el personal los acomode.',
    ],
    fotos: [
      foto('mesas-izquierda.jpeg', 'Mesas de lectura del lado izquierdo'),
      foto('mesas-derecha.jpeg', 'Mesas de lectura del lado derecho'),
      foto('mesa-prestamo.jpeg', 'Mesa junto a Préstamo de libros'),
    ],
  },
  {
    id: 'eventos',
    nombre: 'Eventos y presentaciones',
    detalle: 'Planta alta · Talleres',
    categoria: 'actividades',
    ubicacion: 'Planta alta, sobre el Área infantil (se sube por la escalera)',
    resumen: 'Espacio en la planta alta para presentaciones de libros, conferencias, talleres y actividades culturales abiertas al público.',
    queHacer: [
      'Asistir a presentaciones de libros y conferencias.',
      'Participar en talleres culturales.',
    ],
    pasos: [
      'Consulta en Recepción qué eventos o talleres hay en la semana.',
      'Si el taller pide inscripción, regístrate con anticipación en Recepción.',
      'El día del evento, sube por la escalera al lado del Área infantil.',
      'Llega unos minutos antes para conseguir lugar.',
    ],
    fotos: [
      foto('eventos-1.jpeg', 'Sala de eventos en la planta alta'),
      foto('eventos-2.jpeg', 'Espacio para presentaciones y talleres'),
    ],
  },
  {
    id: 'ludoteca',
    nombre: 'Área infantil · Ludoteca',
    detalle: 'Planta baja · Juegos, libros y lectura',
    categoria: 'actividades',
    ubicacion: 'Esquina superior derecha, planta baja',
    resumen: 'Espacio pensado para niñas y niños, con libros infantiles, juegos didácticos y actividades de lectura.',
    queHacer: [
      'Leer cuentos y libros infantiles.',
      'Jugar con juegos didácticos.',
      'Participar en actividades de fomento a la lectura.',
    ],
    pasos: [
      'Dirígete a la esquina superior derecha de la biblioteca.',
      'Las niñas y los niños deben estar acompañados por una persona adulta.',
      'Elige un libro o un juego de los estantes.',
      'Úsalo en las mesas o tapetes del área.',
      'Al terminar, regresa los juegos a su lugar.',
    ],
    fotos: [
      foto('ludoteca-1.jpeg', 'Área infantil con libros y mesas pequeñas'),
      foto('ludoteca-2.jpeg', 'Juegos didácticos de la Ludoteca'),
      foto('ludoteca-3.jpeg', 'Estantes de libros infantiles'),
    ],
  },
  {
    id: 'comics',
    nombre: 'Área de cómics',
    detalle: 'Historietas y novela gráfica',
    categoria: 'lectura',
    ubicacion: 'Lado derecho, debajo del Área infantil',
    resumen: 'Colección de historietas, mangas y novelas gráficas para leer en un espacio cómodo.',
    queHacer: [
      'Leer cómics, mangas y novelas gráficas.',
    ],
    pasos: [
      'Camina hacia el lado derecho de la biblioteca, debajo del Área infantil.',
      'Elige un cómic del estante.',
      'Léelo en el área de cómics o en una mesa cercana.',
      'Al terminar, déjalo en su lugar o en la mesa.',
    ],
    fotos: [foto('comics.jpeg', 'Estante del Área de cómics')],
  },
  {
    id: 'aula-trabajo',
    nombre: 'Aula de trabajo',
    detalle: 'Exposiciones, talleres, etc.',
    categoria: 'actividades',
    ubicacion: 'Esquina inferior izquierda, junto al Módulo digital',
    resumen: 'Salón cerrado para exposiciones, talleres, clases y trabajo en grupo.',
    queHacer: [
      'Tomar talleres y cursos.',
      'Ver exposiciones.',
      'Trabajar en grupo, si el aula está disponible.',
    ],
    pasos: [
      'Pregunta en Recepción si el aula está disponible o qué actividad hay programada.',
      'Si quieres usarla para un grupo, solicita el espacio con anticipación.',
      'Dirígete a la esquina inferior izquierda de la biblioteca.',
      'Al terminar, deja el aula limpia y ordenada.',
    ],
    fotos: [
      foto('aula-trabajo-1.jpeg', 'Aula de trabajo con mesas y sillas'),
      foto('aula-trabajo-2.jpeg', 'Exposición dentro del Aula de trabajo'),
    ],
  },
  {
    id: 'modulo-digital',
    nombre: 'Módulo digital',
    detalle: 'Computadoras',
    categoria: 'actividades',
    ubicacion: 'Parte inferior izquierda, entre el Aula de trabajo y Guardia',
    resumen: 'Computadoras con internet de uso gratuito para hacer tareas, buscar información o hacer trámites en línea.',
    queHacer: [
      'Usar una computadora con internet.',
      'Hacer tareas, buscar información o hacer trámites en línea.',
    ],
    pasos: [
      'Pide un turno en el Módulo digital o en Recepción.',
      'Siéntate en la computadora que te asignen.',
      'Usa la computadora solo para actividades permitidas.',
      'Guarda tu trabajo en tu propia memoria USB o en tu correo.',
      'Al terminar, cierra tu sesión y avisa al personal.',
    ],
    fotos: [
      foto('modulo-digital-1.jpeg', 'Computadoras del Módulo digital'),
      foto('modulo-digital-2.jpeg', 'Otra vista del Módulo digital'),
    ],
  },
  {
    id: 'guardia',
    nombre: 'Guardia',
    detalle: 'Seguridad de la biblioteca',
    categoria: 'servicios',
    ubicacion: 'A la izquierda de la entrada',
    resumen: 'Personal de seguridad que cuida a las personas y los materiales de la biblioteca.',
    queHacer: [
      'Pedir ayuda si te sientes inseguro o ves algo extraño.',
      'Reportar objetos perdidos o encontrados.',
    ],
    pasos: [
      'Al entrar o salir, el personal de guardia puede pedirte revisar tus pertenencias.',
      'Si necesitas ayuda, acércate al módulo a la izquierda de la entrada.',
      'Si encontraste un objeto olvidado, entrégalo al guardia.',
    ],
    fotos: [foto('guardia.jpeg', 'Módulo de guardia junto a la entrada')],
  },
  {
    id: 'recepcion',
    nombre: 'Recepción',
    detalle: 'Registro de usuarios y guardarropa',
    categoria: 'servicios',
    ubicacion: 'A la derecha de la entrada',
    resumen: 'Es el primer punto al llegar. Aquí te registras como visitante y dejas tus mochilas o bolsas en el guardarropa. También tiene la información de la red WiFi pública.',
    queHacer: [
      'Registrar tu visita.',
      'Dejar mochilas y bolsas en el guardarropa.',
      'Pedir información sobre servicios, eventos y la red WiFi.',
    ],
    pasos: [
      'Al entrar, gira a la derecha y acércate al mostrador de Recepción.',
      'Da tu nombre al personal para registrar tu visita.',
      'Entrega tu mochila o bolsa; te darán una ficha con un número.',
      'Guarda bien la ficha: la necesitas para recoger tus cosas.',
      'Si necesitas internet, escanea el código QR de la red WiFi pública en el mostrador.',
      'Al salir, entrega la ficha y recoge tus pertenencias.',
    ],
    fotos: [foto('recepcion.jpeg', 'Mostrador de Recepción con letrero "Registro de usuarios y guardarropa"')],
  },
  {
    id: 'prestamo',
    nombre: 'Préstamo de libros',
    detalle: 'Préstamos a domicilio',
    categoria: 'servicios',
    ubicacion: 'Parte inferior derecha, junto al Espacio especial',
    resumen: 'Mostrador donde puedes tramitar tu credencial de la biblioteca y llevarte libros a casa por un tiempo.',
    queHacer: [
      'Tramitar la credencial de préstamo a domicilio.',
      'Llevarte libros a casa.',
      'Devolver o renovar libros.',
    ],
    pasos: [
      'Si es tu primera vez, pide en el mostrador los requisitos para tramitar tu credencial (están en el reglamento pegado al mostrador).',
      'Busca el libro que quieres llevarte en las estanterías.',
      'Llévalo al mostrador de Préstamo de libros junto con tu credencial.',
      'El personal registrará el préstamo y te dirá la fecha de devolución.',
      'Cuida el libro y devuélvelo a tiempo en este mismo mostrador.',
      'Si necesitas más tiempo, pide una renovación antes de la fecha de devolución.',
    ],
    nota: 'Los libros de la Colección de consulta no se prestan a domicilio.',
    fotos: [foto('prestamo.jpeg', 'Mostrador de Préstamos a domicilio con el reglamento del servicio')],
  },
  {
    id: 'espacio-especial',
    nombre: 'Espacio especial',
    detalle: 'Lectura de libros',
    categoria: 'lectura',
    ubicacion: 'Esquina inferior derecha',
    resumen: 'Espacio tranquilo y apartado para leer con calma, lejos del movimiento de la entrada.',
    queHacer: [
      'Leer en un lugar tranquilo.',
    ],
    pasos: [
      'Dirígete a la esquina inferior derecha de la biblioteca.',
      'Elige un lugar libre.',
      'Guarda silencio: es un espacio de lectura.',
      'Al irte, deja los libros sobre la mesa para que el personal los acomode.',
    ],
    fotos: [foto('espacio-especial.jpeg', 'Espacio especial de lectura')],
  },
  {
    id: 'bano-hombres',
    nombre: 'Baño de hombres',
    detalle: 'Sanitarios',
    categoria: 'servicios',
    ubicacion: 'Parte superior, a la derecha de la Colección de consulta',
    resumen: 'Sanitarios para hombres, de uso gratuito para los usuarios de la biblioteca.',
    queHacer: ['Usar los sanitarios.'],
    pasos: [
      'Camina hacia la parte superior de la biblioteca, pasando el Salón Argüello.',
      'El baño de hombres está a la derecha de la Colección de consulta.',
      'No entres con libros de la biblioteca.',
      'Ayuda a mantenerlo limpio.',
    ],
    fotos: [foto('bano-hombres.jpeg', 'Entrada al baño de hombres')],
  },
  {
    id: 'bano-mujeres',
    nombre: 'Baño de mujeres',
    detalle: 'Sanitarios',
    categoria: 'servicios',
    ubicacion: 'Parte superior, a la izquierda del Catálogo público',
    resumen: 'Sanitarios para mujeres, de uso gratuito para los usuarios de la biblioteca.',
    queHacer: ['Usar los sanitarios.'],
    pasos: [
      'Camina hacia la parte superior de la biblioteca, pasando el Salón Argüello.',
      'El baño de mujeres (letrero "Damas") está junto al Catálogo público.',
      'No entres con libros de la biblioteca.',
      'Ayuda a mantenerlo limpio.',
    ],
    fotos: [foto('bano-mujeres.jpeg', 'Entrada al baño de mujeres')],
  },
  {
    id: 'oficinas',
    nombre: 'Oficinas',
    detalle: 'Administración (no público)',
    categoria: 'admin',
    ubicacion: 'Esquina superior izquierda',
    resumen: 'Oficinas administrativas de la biblioteca. No son de acceso al público.',
    queHacer: [
      'Solo personal de la biblioteca.',
    ],
    pasos: [
      'Si necesitas hablar con la administración (quejas, donaciones o permisos), pregunta primero en Recepción.',
      'El personal de Recepción te indicará si pueden atenderte y cuándo.',
    ],
    nota: 'Área restringida: no es de acceso al público.',
    fotos: [foto('oficinas.jpeg', 'Puerta de las oficinas administrativas')],
  },
];

export const buscarServicio = (id) => SERVICIOS.find((s) => s.id === id);
