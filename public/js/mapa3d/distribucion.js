// Distribución de la biblioteca tomada del croquis a mano. Las medidas siguen en "píxeles del
// croquis" para poder compararlas con el dibujo; p() y m() las pasan a metros de la maqueta.
// El croquis mide unos 1560 × 925 px; a 3 cm por píxel da una planta de 46.8 × 27.75 m.
const ESCALA = 0.03;
const ORIGEN = [10, 90];

export const ANCHO = 1560 * ESCALA;
export const FONDO = 925 * ESCALA;
export const ALTO_MURO = 3.2;
export const ALTO_TECHO = 7.4;
export const ALTO_TAPANCO = 3.7;

/** Largo del croquis a metros. */
export const m = (px) => px * ESCALA;
/** Punto del croquis a coordenadas de la maqueta (origen al centro de la planta). */
export const p = (px, py) => ({
  x: (px - ORIGEN[0]) * ESCALA - ANCHO / 2,
  z: (py - ORIGEN[1]) * ESCALA - FONDO / 2,
});

// Rectángulo del croquis: [izquierda, arriba, derecha, abajo]
export const CUARTOS = {
  oficinas: [105, 90, 185, 780],
  aula: [10, 780, 205, 1015],
  modulo: [205, 790, 465, 1015],
  guardia: [465, 885, 540, 975],
  entrada: [640, 840, 770, 1015],
  especial: [1425, 730, 1570, 1015],
  oficinaDerecha: [1490, 550, 1570, 700],
  oficinaCentro: [525, 90, 835, 190],
  banoHombres: [425, 90, 525, 190],
  banoMujeres: [835, 90, 935, 190],
};

export const TAPANCO = [1255, 90, 1570, 510];

export const ESTANTERIAS = [
  { n: 1, px: 324, de: 362, a: 560, clase: ['000', ['Generalidades']] },
  { n: 2, px: 408, de: 358, a: 552, clase: ['300', ['Ciencias sociales']] },
  { n: 3, px: 491, de: 364, a: 540, clase: ['500', ['Ciencias naturales', 'y matemáticas']] },
  { n: 5, px: 866, de: 352, a: 528, clase: ['800', ['Literatura y retórica']] },
  { n: 6, px: 971, de: 352, a: 520, clase: ['900', ['Geografía e historia']] },
  { n: 7, px: 1070, de: 348, a: 503, clase: ['Don', ['Libros donados']] },
];

export const HERRADURA = { px: 680, py: 495, radio: 125 };

export const MESAS_REDONDAS = [
  [362, 640], [447, 632], [530, 628],
  [828, 590], [922, 578], [1035, 570],
  [1315, 848],
];

// Marcadores: id del servicio, punto del croquis, altura y prioridad cuando se enciman
// (los números bajos se quedan). `zona` es el rectángulo que responde al toque en la maqueta y
// `desde`, opcional, el punto donde se para la cámara al recorrer.
export const PUNTOS = [
  { id: 'salon-arguello', px: 668, py: 265, y: 1.6, orden: 1, zona: [360, 190, 975, 340] },
  { id: 'ludoteca', px: 1400, py: 330, y: 1.5, orden: 1, zona: [1255, 200, 1570, 510] },
  { id: 'eventos', px: 1410, py: 230, y: 5.1, orden: 1, nivel: 'alta', zona: [1255, 90, 1570, 510] },
  { id: 'recepcion', px: 900, py: 790, y: 1.9, orden: 1, zona: [810, 735, 1025, 985] },
  { id: 'prestamo', px: 1150, py: 860, y: 1.9, orden: 1, zona: [1070, 730, 1240, 1015] },
  { id: 'modulo-digital', px: 330, py: 900, y: 1.8, orden: 1, zona: CUARTOS.modulo },
  { id: 'aula-trabajo', px: 105, py: 890, y: 1.8, orden: 1, zona: CUARTOS.aula },
  { id: 'espacio-especial', px: 1500, py: 870, y: 1.8, orden: 1, zona: CUARTOS.especial },
  { id: 'consulta', px: 300, py: 150, y: 2.3, orden: 2, zona: [190, 90, 425, 330] },
  { id: 'estanteria-4', px: 680, py: 430, y: 2.5, orden: 2, zona: [555, 365, 805, 535] },
  { id: 'catalogo', px: 1015, py: 130, y: 1.7, orden: 2, zona: [965, 90, 1065, 170] },
  { id: 'guardia', px: 500, py: 930, y: 1.8, orden: 2, zona: CUARTOS.guardia, desde: [610, 930] },
  { id: 'comics', px: 1440, py: 650, y: 2.2, orden: 2, zona: [1415, 585, 1490, 735] },
  { id: 'mesas', px: 447, py: 632, y: 1.3, orden: 3, zona: [320, 590, 570, 680] },
  { id: 'oficinas', px: 145, py: 430, y: 2.4, orden: 3, zona: CUARTOS.oficinas },
  { id: 'bano-hombres', px: 475, py: 140, y: 2.4, orden: 3, zona: CUARTOS.banoHombres },
  { id: 'bano-mujeres', px: 885, py: 140, y: 2.4, orden: 3, zona: CUARTOS.banoMujeres },
  { id: 'salida-emergencia', px: 1155, py: 110, y: 2.4, orden: 3, zona: [1115, 90, 1195, 150] },
  ...ESTANTERIAS.map((e) => ({
    id: `estanteria-${e.n}`,
    px: e.px,
    py: (e.de + e.a) / 2,
    y: 2.7,
    orden: 4,
    zona: [e.px - 24, e.de, e.px + 24, e.a],
  })),
];

// Zonas extra que también abren un servicio al tocarlas.
export const ZONAS_EXTRA = [
  { id: 'mesas', zona: [790, 545, 1075, 620] },
  { id: 'mesas', zona: [1280, 815, 1350, 880] },
  { id: 'oficinas', zona: CUARTOS.oficinaDerecha },
  { id: 'oficinas', zona: CUARTOS.oficinaCentro },
];
