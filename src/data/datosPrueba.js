'use strict';

const areas = [
  { id: 'acervo', nombre: 'Acervo y catálogo', x: 30, y: 48 },
  { id: 'lectura', nombre: 'Lectura y estancia', x: 52, y: 55 },
  { id: 'actividades', nombre: 'Actividades y talleres', x: 82, y: 28 },
  { id: 'servicios', nombre: 'Servicios al usuario', x: 78, y: 80 },
  { id: 'admin', nombre: 'Administración', x: 8, y: 20 },
];

const servicios = [
  {
    id: 'salon-arguello', areaId: 'lectura', nombre: 'Salón Argüello',
    descripcion: 'Área general con mesas y sillas para leer, estudiar o hacer tareas.',
    pasos: ['Regístrate en Recepción y guarda tus pertenencias.', 'Elige una mesa libre en el centro de la biblioteca.', 'Al terminar, deja los libros en la mesa o en el carrito.'],
  },
  {
    id: 'consulta', areaId: 'acervo', nombre: 'Colección de consulta',
    descripcion: 'Diccionarios, enciclopedias y atlas para consultar dentro de la biblioteca.',
    pasos: ['Busca la colección junto a las Oficinas.', 'Localiza el tema en los estantes.', 'Consulta el material en una mesa y déjalo ahí al terminar.'],
  },
  {
    id: 'catalogo', areaId: 'acervo', nombre: 'Catálogo público',
    descripcion: 'Ficheros con tarjetas ordenadas por autor, título y materia.',
    pasos: ['Elige si buscarás por autor, título o materia.', 'Busca la tarjeta y anota su número de clasificación.', 'Consulta ese número en las estanterías.'],
  },
  {
    id: 'estanteria-1', areaId: 'acervo', nombre: 'Estantería 1',
    descripcion: 'Generalidades, filosofía, religión y ciencias sociales.',
    pasos: ['Confirma los temas en el letrero del estante.', 'Busca los libros por número de clasificación.', 'Lleva tus libros a una mesa o al mostrador de préstamo.'],
  },
  {
    id: 'estanteria-2', areaId: 'acervo', nombre: 'Estantería 2',
    descripcion: 'Libros de clasificación intermedia entre las estanterías 1 y 3.',
    pasos: ['Revisa el letrero de clasificación.', 'Busca el número en el lomo del libro.', 'Al terminar, deja el material en el carrito.'],
  },
  {
    id: 'estanteria-3', areaId: 'acervo', nombre: 'Estantería 3',
    descripcion: 'Ciencias naturales, matemáticas y tecnología.',
    pasos: ['Identifica el tema en el letrero.', 'Ordena tu búsqueda por el número de clasificación.', 'Consulta en una mesa o pide el préstamo.'],
  },
  {
    id: 'estanteria-4', areaId: 'acervo', nombre: 'Colegio bibliográfico',
    descripcion: 'Selección temática de libros y exhibiciones que cambia durante el año.',
    pasos: ['Busca la herradura entre las estanterías 3 y 5.', 'Revisa los libros destacados del mes.', 'Consulta el libro ahí o llévalo al mostrador de préstamo.'],
  },
  {
    id: 'estanteria-5', areaId: 'acervo', nombre: 'Estantería 5',
    descripcion: 'Libros de literatura y retórica.',
    pasos: ['Confirma el tema en la cabecera del estante.', 'Busca por número de clasificación.', 'Al terminar, deja el libro en el carrito o en una mesa.'],
  },
  {
    id: 'estanteria-6', areaId: 'acervo', nombre: 'Estantería 6',
    descripcion: 'Literatura, geografía e historia.',
    pasos: ['Revisa el rango de clasificación del letrero.', 'Localiza el libro por su número.', 'Consulta en sala o solicita el préstamo.'],
  },
  {
    id: 'estanteria-7', areaId: 'acervo', nombre: 'Estantería 7',
    descripcion: 'Libros donados por la comunidad; hay temas variados.',
    pasos: ['Dirígete a la última estantería del lado derecho.', 'Revisa los títulos disponibles, que no están ordenados por tema.', 'Pregunta en Recepción si deseas donar un libro.'],
  },
  {
    id: 'mesas', areaId: 'lectura', nombre: 'Mesas de lectura',
    descripcion: 'Mesas para leer, estudiar y revisar libros cerca de las estanterías.',
    pasos: ['Elige una mesa libre.', 'Lleva solo los materiales que vas a utilizar.', 'Al irte, deja los libros sobre la mesa para que el personal los acomode.'],
  },
  {
    id: 'eventos', areaId: 'actividades', nombre: 'Eventos y presentaciones',
    descripcion: 'Espacio para presentaciones de libros, conferencias y talleres.',
    pasos: ['Consulta la programación en Recepción.', 'Regístrate con anticipación si la actividad lo requiere.', 'Llega unos minutos antes al espacio de la planta alta.'],
  },
  {
    id: 'ludoteca', areaId: 'actividades', nombre: 'Área infantil · Ludoteca',
    descripcion: 'Libros, juegos didácticos y actividades de lectura para niñas y niños.',
    pasos: ['Dirígete al área infantil de la planta baja.', 'Acompaña a niñas y niños durante la visita.', 'Regresa los libros y juegos a su lugar al terminar.'],
  },
  {
    id: 'comics', areaId: 'lectura', nombre: 'Área de cómics',
    descripcion: 'Colección de historietas, mangas y novelas gráficas.',
    pasos: ['Busca el estante del lado derecho de la biblioteca.', 'Elige un cómic disponible.', 'Léelo en el área o en una mesa cercana.'],
  },
  {
    id: 'aula-trabajo', areaId: 'actividades', nombre: 'Aula de trabajo',
    descripcion: 'Espacio para exposiciones, talleres, clases y trabajo en grupo.',
    pasos: ['Pregunta en Recepción por disponibilidad.', 'Solicita el espacio con anticipación si es para un grupo.', 'Al terminar, deja el aula limpia y ordenada.'],
  },
  {
    id: 'modulo-digital', areaId: 'actividades', nombre: 'Módulo digital',
    descripcion: 'Computadoras con internet para tareas, búsquedas y trámites.',
    pasos: ['Solicita un turno en el Módulo digital o en Recepción.', 'Utiliza la computadora asignada para actividades permitidas.', 'Cierra tu sesión y avisa al personal al terminar.'],
  },
  {
    id: 'guardia', areaId: 'servicios', nombre: 'Guardia',
    descripcion: 'Personal de seguridad que puede orientar y ayudar a los visitantes.',
    pasos: ['Acércate al módulo junto a la entrada si necesitas ayuda.', 'Entrega al personal los objetos encontrados.', 'Sigue las indicaciones de seguridad del recinto.'],
  },
  {
    id: 'recepcion', areaId: 'servicios', nombre: 'Recepción',
    descripcion: 'Registro de visitantes, guardarropa e información general.',
    pasos: ['Acércate al mostrador al entrar.', 'Registra tu visita y deja tus pertenencias si lo necesitas.', 'Conserva la ficha para recoger tus cosas al salir.'],
  },
  {
    id: 'prestamo', areaId: 'servicios', nombre: 'Préstamo de libros',
    descripcion: 'Mostrador para tramitar la credencial y solicitar préstamos a domicilio.',
    pasos: ['Pregunta por los requisitos de la credencial.', 'Lleva el libro y tu credencial al mostrador.', 'Devuelve el libro en la fecha indicada.'],
  },
  {
    id: 'espacio-especial', areaId: 'lectura', nombre: 'Espacio especial',
    descripcion: 'Espacio tranquilo y apartado para leer con calma.',
    pasos: ['Dirígete a la esquina inferior derecha.', 'Elige un lugar disponible y mantén silencio.', 'Deja los libros en la mesa al retirarte.'],
  },
  {
    id: 'bano-hombres', areaId: 'servicios', nombre: 'Baño de hombres',
    descripcion: 'Sanitarios para visitantes, ubicados junto a la Colección de consulta.',
    pasos: ['Dirígete a la parte superior de la biblioteca.', 'Sigue el letrero de sanitarios.', 'Ayuda a mantener limpio el espacio.'],
  },
  {
    id: 'bano-mujeres', areaId: 'servicios', nombre: 'Baño de mujeres',
    descripcion: 'Sanitarios para visitantes, ubicados junto al Catálogo público.',
    pasos: ['Dirígete a la parte superior de la biblioteca.', 'Sigue el letrero de sanitarios.', 'Ayuda a mantener limpio el espacio.'],
  },
  {
    id: 'oficinas', areaId: 'admin', nombre: 'Oficinas',
    descripcion: 'Área administrativa de acceso restringido al personal.',
    pasos: ['No ingreses a las oficinas sin autorización.', 'Si necesitas atención, pregunta primero en Recepción.', 'El personal te indicará cómo contactar a administración.'],
  },
];

module.exports = { areas, servicios };
