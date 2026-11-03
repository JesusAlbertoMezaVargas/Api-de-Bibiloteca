// Texturas de la maqueta, dibujadas en <canvas> al cargar. Imitan los acabados de las fotos
// (mármol, mosaico de triángulos, madera, lomos de libros) sin descargar imágenes pesadas.
import * as THREE from '../../vendor/three.bundle.js';

// Generador con semilla: la maqueta se ve igual en cada visita.
export function azarCon(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lienzo(ancho, alto = ancho) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return [c, c.getContext('2d')];
}

function textura(canvas, { repetir = false, color = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function vetas(ctx, x, y, tam, azar, color, cantidad) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, tam, tam);
  ctx.clip();
  for (let i = 0; i < cantidad; i++) {
    let px = x + azar() * tam;
    let py = y + azar() * tam;
    const rumbo = azar() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let j = 0; j < 7; j++) {
      const d = tam * (0.08 + azar() * 0.18);
      const a = rumbo + (azar() - 0.5) * 1.3;
      px += Math.cos(a) * d;
      py += Math.sin(a) * d;
      ctx.lineTo(px, py);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.05 + azar() * 0.22;
    ctx.lineWidth = 0.6 + azar() * 2.6;
    ctx.stroke();
  }
  ctx.restore();
}

/** Mármol blanco en losetas: la textura cubre 4 × 4 losetas. */
export function marmol() {
  const azar = azarCon(11);
  const n = 2048;
  const losetas = 4;
  const tam = n / losetas;
  const [c, ctx] = lienzo(n);
  for (let f = 0; f < losetas; f++) {
    for (let k = 0; k < losetas; k++) {
      const x = k * tam;
      const y = f * tam;
      const tono = 214 + Math.floor(azar() * 12);
      ctx.fillStyle = `rgb(${tono},${tono},${tono - 2})`;
      ctx.fillRect(x, y, tam, tam);
      vetas(ctx, x, y, tam, azar, '#6f7479', 44);
      vetas(ctx, x, y, tam, azar, '#ffffff', 16);
      ctx.strokeStyle = 'rgba(92,92,90,.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, tam - 3, tam - 3);
    }
  }
  return textura(c, { repetir: true });
}

/** Mosaico de triángulos negros y blancos de las franjas del piso. Cubre 2 × 2 m. */
export function mosaico() {
  const azar = azarCon(23);
  const n = 1024;
  const celdas = 4;
  const tam = n / celdas;
  const [c, ctx] = lienzo(n);
  ctx.fillStyle = '#e9e8e4';
  ctx.fillRect(0, 0, n, n);
  for (let f = 0; f < celdas; f++) {
    for (let k = 0; k < celdas; k++) {
      const x = k * tam;
      const y = f * tam;
      const cx = x + tam / 2;
      const cy = y + tam / 2;
      // Molinete: dos de los cuatro triángulos de cada celda van oscuros.
      const giro = (f + k) % 2;
      const esquinas = [[x, y], [x + tam, y], [x + tam, y + tam], [x, y + tam]];
      for (let i = 0; i < 4; i++) {
        const [a, b] = [esquinas[i], esquinas[(i + 1) % 4]];
        const oscuro = (i + giro) % 2 === 0;
        const t = oscuro ? 58 + azar() * 16 : 226 + azar() * 16;
        ctx.fillStyle = `rgb(${t},${t - 2},${t - 5})`;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(70,70,68,.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, tam, tam);
    }
  }
  return textura(c, { repetir: true });
}

/** Veta de madera clara, como las cubiertas de las mesas y el mostrador. */
export function madera(base = [196, 176, 150], { lineas = 240 } = {}) {
  const azar = azarCon(37);
  const n = 1024;
  const [c, ctx] = lienzo(n);
  ctx.fillStyle = `rgb(${base})`;
  ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < lineas; i++) {
    const y = azar() * n;
    const oscuro = azar() > 0.45;
    ctx.strokeStyle = oscuro ? 'rgba(84,62,40,.2)' : 'rgba(255,245,230,.16)';
    ctx.lineWidth = 0.6 + azar() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    const onda = 3 + azar() * 16;
    for (let x = 0; x <= n; x += 64) ctx.lineTo(x, y + Math.sin(x / 150 + i) * onda);
    ctx.stroke();
  }
  return textura(c, { repetir: true });
}

/** Duela laminada del tapanco (planta alta). */
export function duela() {
  const azar = azarCon(41);
  const n = 2048;
  const [c, ctx] = lienzo(n);
  const altoTabla = n / 12;
  for (let f = 0; f < 12; f++) {
    let x = -azar() * 300;
    while (x < n) {
      const largo = 320 + azar() * 340;
      const r = 150 + azar() * 42;
      ctx.fillStyle = `rgb(${r},${r * 0.58},${r * 0.31})`;
      ctx.fillRect(x, f * altoTabla, largo, altoTabla);
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = azar() > 0.5 ? 'rgba(60,28,8,.14)' : 'rgba(255,214,160,.08)';
        ctx.lineWidth = 1 + azar() * 2;
        const y = f * altoTabla + azar() * altoTabla;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + largo, y + (azar() - 0.5) * 8);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(40,18,6,.5)';
      ctx.fillRect(x + largo - 2, f * altoTabla, 2, altoTabla);
      x += largo;
    }
    ctx.fillStyle = 'rgba(40,18,6,.5)';
    ctx.fillRect(0, f * altoTabla, n, 2);
  }
  return textura(c, { repetir: true });
}

const COLORES_LIBRO = [
  '#7c2230', '#a33a2a', '#1f3f66', '#27588a', '#16626b', '#2d7f7a', '#245138', '#3f6b3a',
  '#c9b48a', '#d9cfb8', '#e6e0d0', '#efeadc', '#6a4a2c', '#8a6238', '#2b2b30', '#44444c',
  '#c8862e', '#5c3a6e', '#b7c4cc', '#d6d9dc',
];

export const FILAS_LIBROS = 8;

/**
 * Atlas de lomos de libros: 8 filas de un metro de largo. Lo de arriba de cada libro es
 * transparente, para que se note la altura desigual y el hueco bajo el entrepaño.
 */
export function lomos() {
  const azar = azarCon(53);
  const ancho = 2048;
  const altoFila = 256;
  const [c, ctx] = lienzo(ancho, altoFila * FILAS_LIBROS);
  for (let f = 0; f < FILAS_LIBROS; f++) {
    const pie = (f + 1) * altoFila;
    let x = 0;
    while (x < ancho) {
      const w = 16 + azar() * 46;
      if (azar() < 0.05) { // hueco entre libros
        x += w * 1.4;
        continue;
      }
      const h = altoFila * (0.62 + azar() * 0.34);
      const color = COLORES_LIBRO[Math.floor(azar() * COLORES_LIBRO.length)];
      ctx.fillStyle = color;
      ctx.fillRect(x, pie - h, w - 1.5, h);
      const degradado = ctx.createLinearGradient(x, 0, x + w, 0);
      degradado.addColorStop(0, 'rgba(0,0,0,.42)');
      degradado.addColorStop(0.4, 'rgba(255,255,255,.1)');
      degradado.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = degradado;
      ctx.fillRect(x, pie - h, w - 1.5, h);
      if (azar() > 0.4) { // bandas o título en el lomo
        ctx.fillStyle = 'rgba(235,225,190,.7)';
        ctx.fillRect(x + 2, pie - h + 12 + azar() * 40, w - 6, 3 + azar() * 8);
      }
      // Etiqueta blanca de clasificación
      ctx.fillStyle = '#f2efe6';
      ctx.fillRect(x + 1, pie - 34 - azar() * 6, w - 3.5, 22);
      x += w;
    }
  }
  const t = textura(c);
  t.generateMipmaps = true;
  return t;
}

/** Portadas de cómics y revistas para los exhibidores azules. */
export function portadas() {
  const azar = azarCon(67);
  const [c, ctx] = lienzo(1024, 512);
  const paleta = ['#d7263d', '#f46036', '#2e294e', '#1b998b', '#e2c044', '#3a86ff', '#8338ec', '#fb5607', '#111418', '#f1f1f1'];
  const w = 1024 / 8;
  for (let f = 0; f < 3; f++) {
    for (let k = 0; k < 8; k++) {
      const x = k * w;
      const y = f * (512 / 3);
      const h = 512 / 3;
      ctx.fillStyle = paleta[Math.floor(azar() * paleta.length)];
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      ctx.fillStyle = paleta[Math.floor(azar() * paleta.length)];
      ctx.beginPath();
      ctx.arc(x + w * (0.3 + azar() * 0.4), y + h * (0.45 + azar() * 0.3), 16 + azar() * 28, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 10, y + 12, w * (0.4 + azar() * 0.4), 11);
    }
  }
  return textura(c);
}

/** Mural del friso alto: mar nocturno con barcos y peces de papel, como el de la foto. */
export function mural() {
  const azar = azarCon(79);
  const [c, ctx] = lienzo(2048, 256);
  const fondo = ctx.createLinearGradient(0, 0, 2048, 0);
  fondo.addColorStop(0, '#31406e');
  fondo.addColorStop(0.4, '#5c6fa8');
  fondo.addColorStop(0.75, '#7e6ca0');
  fondo.addColorStop(1, '#c58a5c');
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, 2048, 256);
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = ['#e9d8a6', '#94d2bd', '#ee9b00', '#ffffff', '#ae2012'][i % 5];
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 6 + azar() * 16;
    ctx.beginPath();
    const y = azar() * 256;
    ctx.moveTo(0, y);
    for (let x = 0; x <= 2048; x += 120) ctx.lineTo(x, y + Math.sin(x / 190 + i) * 46);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 40; i++) {
    const x = azar() * 2048;
    const y = 20 + azar() * 216;
    const r = 8 + azar() * 22;
    ctx.fillStyle = ['#1d2433', '#f4e9cd', '#d9772b', '#134074'][i % 4];
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x, y - r * 0.6);
    ctx.lineTo(x + r * 1.4, y);
    ctx.lineTo(x, y + r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  return textura(c);
}

/** Vista del parque de la Alameda que se ve por los cristales al recorrer la biblioteca. */
export function jardin() {
  const azar = azarCon(97);
  const [c, ctx] = lienzo(2048, 512);
  const cielo = ctx.createLinearGradient(0, 0, 0, 340);
  cielo.addColorStop(0, '#9fd0f5');
  cielo.addColorStop(1, '#e8f3f2');
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, 2048, 512);
  const verdes = ['#3f7f3a', '#5a9b45', '#7cb655', '#a4c96a', '#2f6531'];
  for (let i = 0; i < 26; i++) { // troncos
    const x = azar() * 2048;
    ctx.fillStyle = '#4b3a2b';
    ctx.beginPath();
    ctx.moveTo(x - 9, 512);
    ctx.lineTo(x - 4, 190);
    ctx.lineTo(x + 5, 190);
    ctx.lineTo(x + 11, 512);
    ctx.fill();
  }
  // Copas: miles de hojitas chicas agrupadas alrededor de cada árbol
  for (let i = 0; i < 90; i++) {
    const cx = azar() * 2048;
    const cy = 90 + azar() * 240;
    const radio = 70 + azar() * 130;
    for (let k = 0; k < 900; k++) {
      const a = azar() * 6.3;
      const r = Math.sqrt(azar()) * radio;
      ctx.fillStyle = verdes[Math.floor(azar() * verdes.length)];
      ctx.globalAlpha = 0.35 + azar() * 0.5;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 0.8, 1.5 + azar() * 4.5, 0, 7);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#6f9e50';
  ctx.fillRect(0, 440, 2048, 72);
  const t = textura(c, { repetir: true });
  t.repeat.x = 3;
  return t;
}

/** Letrero de texto. `lineas`: [{ texto, tam, peso, color }], en píxeles de un lienzo de 1024 de ancho. */
export function cartel(lineas, { proporcion = 4, fondo = '#f4f3ef', borde, ancho = 1024 } = {}) {
  const alto = Math.round(ancho / proporcion);
  const [c, ctx] = lienzo(ancho, alto);
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ancho, alto);
  if (borde) {
    ctx.strokeStyle = borde;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, ancho - 10, alto - 10);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const total = lineas.reduce((s, l) => s + l.tam * 1.3, 0);
  let y = (alto - total) / 2;
  for (const l of lineas) {
    ctx.font = `${l.peso ?? 700} ${l.tam}px "Atkinson Hyperlegible", Arial, sans-serif`;
    ctx.fillStyle = l.color ?? '#1b1f24';
    ctx.fillText(l.texto, ancho / 2, y + (l.tam * 1.3) / 2);
    y += l.tam * 1.3;
  }
  return textura(c);
}

/** Letrero de la cabecera de una estantería: número en verde y tema, como los reales. */
export function cartelClase(numero, tema) {
  const [c, ctx] = lienzo(1024, 256);
  ctx.fillStyle = '#f3f0e6';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = '#2f9e5e';
  ctx.fillRect(16, 16, 300, 224);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '700 150px "Atkinson Hyperlegible", Arial, sans-serif';
  ctx.fillText(numero, 166, 134);
  ctx.fillStyle = '#16191d';
  ctx.textAlign = 'left';
  ctx.font = '700 66px "Atkinson Hyperlegible", Arial, sans-serif';
  tema.forEach((linea, i) => ctx.fillText(linea, 344, 128 + (i - (tema.length - 1) / 2) * 76));
  return textura(c);
}

/**
 * Sombra de contacto pintada sobre el piso (mapa de oclusión). Hace que muebles y muros
 * "asienten" también en teléfonos, donde no se usa la oclusión en tiempo real.
 */
export function sombrasDePiso(huellas, anchoMetros, altoMetros) {
  const pxPorMetro = 40;
  const [c, ctx] = lienzo(Math.ceil(anchoMetros * pxPorMetro), Math.ceil(altoMetros * pxPorMetro));
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.scale(pxPorMetro, pxPorMetro);
  ctx.translate(anchoMetros / 2, altoMetros / 2);
  ctx.shadowColor = 'rgba(0,0,0,.85)';
  ctx.fillStyle = '#000';
  for (const h of huellas) {
    ctx.shadowBlur = (h.difuso ?? 0.35) * pxPorMetro;
    // shadowOffset no gira ni escala con el contexto: la figura se dibuja fuera del lienzo
    // y solo cae su sombra, ya en su lugar.
    const fuera = 4000;
    ctx.shadowOffsetX = fuera;
    const dx = -fuera / pxPorMetro;
    ctx.beginPath();
    if (h.r) {
      ctx.arc(h.x + dx, h.z, h.r, 0, 7);
    } else {
      const [cos, sen] = [Math.cos(h.giro ?? 0), Math.sin(h.giro ?? 0)];
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const [lx, lz] = [(a * h.w) / 2, (b * h.d) / 2];
        ctx.lineTo(h.x + dx + lx * cos + lz * sen, h.z - lx * sen + lz * cos);
      }
    }
    ctx.fill();
  }
  const t = textura(c, { color: false });
  t.channel = 1;
  return t;
}
