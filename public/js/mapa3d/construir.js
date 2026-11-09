// Construye la maqueta: edificio, tapanco y mobiliario. Casi todo se fusiona por material en
// una sola malla (el edificio no se mueve), así la escena son pocas llamadas de dibujo y corre
// bien en teléfono aunque tenga miles de piezas.
import * as THREE from '../../vendor/three.bundle.js';
import { mergeGeometries } from '../../vendor/three.bundle.js';
import * as tx from './texturas.js';
import {
  ALTO_MURO, ALTO_TAPANCO, ALTO_TECHO, ANCHO, CUARTOS, ESTANTERIAS, FONDO, HERRADURA,
  MESAS_REDONDAS, TAPANCO, m, p,
} from './distribucion.js';

const azar = tx.azarCon(101);
const entre = (a, b) => a + azar() * (b - a);

const pbr = (color, roughness = 0.7, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

function crearMateriales() {
  const enMetros = (t, metros) => { t.repeat.set(1 / metros, 1 / metros); return t; };
  return {
    muro: pbr('#eeece6', 0.92),
    muroFino: pbr('#f4f3ef', 0.85, 0, { emissive: '#c9c7bf', emissiveIntensity: 0.12 }),
    acero: pbr('#5f6a73', 0.55, 0.35),
    aceroClaro: pbr('#a8aeb2', 0.4, 0.5),
    inox: pbr('#d7dadd', 0.22, 1),
    negro: pbr('#17181b', 0.55, 0.1),
    canceleria: pbr('#34383c', 0.5, 0.4),
    plasticoNegro: pbr('#141518', 0.38),
    gris: pbr('#c9c8c2', 0.6, 0.1),
    estante: pbr('#c8c5bd', 0.55, 0.15),
    fondoEstante: pbr('#8f8d87', 0.8),
    azulExhibidor: pbr('#1f3f96', 0.45, 0.25),
    azulBarril: pbr('#1a3fa0', 0.4),
    pisoCuarto: pbr('#d8d6d0', 0.4),
    pantalla: pbr('#0b0d10', 0.18, 0.2, { emissive: '#101c28', emissiveIntensity: 0.6 }),
    roble: pbr('#ffffff', 0.5, 0, { map: enMetros(tx.madera([205, 186, 158]), 1.6) }),
    mostrador: pbr('#ffffff', 0.62, 0, { map: enMetros(tx.madera([177, 160, 138], { lineas: 340 }), 1.2) }),
    cabinete: pbr('#ffffff', 0.5, 0, { map: enMetros(tx.madera([120, 76, 42]), 1) }),
    cubierta: pbr('#d3c49b', 0.42),
    duela: pbr('#ffffff', 0.32, 0, { map: enMetros(tx.duela(), 4.8) }),
    libros: pbr('#ffffff', 0.72, 0, { map: tx.lomos(), alphaTest: 0.5, side: THREE.DoubleSide }),
    portadas: pbr('#ffffff', 0.45, 0, { map: tx.portadas() }),
    mural: pbr('#ffffff', 0.85, 0, { map: tx.mural() }),
    naranja: pbr('#e2691f', 0.7),
    manteleria: pbr('#2c1a14', 0.9),
    rojo: pbr('#d3361f', 0.42),
    amarillo: pbr('#efb91c', 0.42),
    verde: pbr('#2f9a4f', 0.42),
    azul: pbr('#2453b3', 0.42),
    salida: pbr('#17a34a', 0.5, 0, { emissive: '#17a34a', emissiveIntensity: 0.6 }),
    cristal: new THREE.MeshPhysicalMaterial({
      color: '#d7ece8', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16,
      envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide,
    }),
    lampara: new THREE.MeshBasicMaterial({ color: '#fff6e2' }),
    techo: pbr('#ecebe5', 0.75, 0, { emissive: '#c9c7bf', emissiveIntensity: 0.3 }),
  };
}

// Junta piezas por material y al final las vuelca como una sola malla por material.
class Lotes {
  constructor() { this.piezas = new Map(); }

  agregar(material, geometria, matriz) {
    if (matriz) geometria = geometria.clone().applyMatrix4(matriz);
    if (!this.piezas.has(material)) this.piezas.set(material, []);
    this.piezas.get(material).push(geometria.index ? geometria.toNonIndexed() : geometria);
  }

  /** Caja con base en y, centrada en (x, z). Las UV quedan en metros para que la textura no se estire. */
  caja(material, x, y, z, w, h, d, giro = 0) {
    this.agregar(material, cajaEnMetros(w, h, d), new THREE.Matrix4().compose(
      new THREE.Vector3(x, y + h / 2, z),
      new THREE.Quaternion().setFromAxisAngle(EJE_Y, giro),
      UNO,
    ));
  }

  /** Caja entre dos esquinas de la planta. */
  tramo(material, x1, z1, x2, z2, y, h) {
    this.caja(material, (x1 + x2) / 2, y, (z1 + z2) / 2, Math.abs(x2 - x1), h, Math.abs(z2 - z1));
  }

  cilindro(material, x, y, z, radio, alto, radioArriba = radio, lados = 24) {
    const g = new THREE.CylinderGeometry(radioArriba, radio, alto, lados);
    g.translate(x, y + alto / 2, z);
    this.agregar(material, g);
  }

  volcar(padre, { sombra = true } = {}) {
    for (const [material, geometrias] of this.piezas) {
      const malla = new THREE.Mesh(mergeGeometries(geometrias, false), material);
      malla.castShadow = sombra && material.transparent !== true;
      malla.receiveShadow = true;
      if (material.transparent) malla.userData.sinOclusion = true;
      padre.add(malla);
    }
    this.piezas.clear();
  }
}

const EJE_Y = new THREE.Vector3(0, 1, 0);
const UNO = new THREE.Vector3(1, 1, 1);

function cajaEnMetros(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const caras = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let c = 0; c < 6; c++) {
    for (let v = 0; v < 4; v++) {
      const i = c * 4 + v;
      uv.setXY(i, uv.getX(i) * caras[c][0], uv.getY(i) * caras[c][1]);
    }
  }
  return g;
}

function matriz(x, y, z, giro = 0) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(EJE_Y, giro),
    UNO,
  );
}

// ---------------------------------------------------------------------------------------
// Muebles (geometrías en coordenadas locales, se reutilizan con una matriz)
// ---------------------------------------------------------------------------------------

/** Silla apilable negra de las fotos. El frente mira hacia +z. */
function geometriaSilla(escala = 1) {
  const g = [];
  const cajaL = (x, y, z, w, h, d, inclinacion = 0) => {
    const c = new THREE.BoxGeometry(w, h, d);
    if (inclinacion) c.rotateX(inclinacion);
    c.translate(x, y, z);
    g.push(c);
  };
  // Asiento y respaldo curvo
  cajaL(0, 0.45, 0, 0.45, 0.035, 0.42);
  g.push(new THREE.BoxGeometry(0.42, 0.28, 0.025).rotateX(0.14).translate(0, 0.72, -0.22));
  // Patín de alambre
  for (const lado of [-1, 1]) {
    cajaL(lado * 0.2, 0.012, 0, 0.018, 0.018, 0.48);
    cajaL(lado * 0.2, 0.23, 0.22, 0.018, 0.44, 0.018);
    cajaL(lado * 0.2, 0.42, -0.23, 0.018, 0.84, 0.018);
  }
  return mergeGeometries(g, false).scale(escala, escala, escala);
}

function mesaRedonda(l, huellas, sillas, x, z) {
  l.cilindro(l.mat.roble, x, 0.72, z, 0.75, 0.035, 0.75, 40);
  for (const giro of [Math.PI / 4, -Math.PI / 4]) {
    l.caja(l.mat.negro, x, 0.02, z, 1.15, 0.05, 0.06, giro);
    l.caja(l.mat.negro, x, 0.68, z, 0.95, 0.04, 0.05, giro);
  }
  for (const [dx, dz] of [[-0.3, 0], [0.3, 0], [0, -0.3], [0, 0.3]]) l.caja(l.mat.negro, x + dx, 0.06, z + dz, 0.05, 0.64, 0.05);
  const n = 4;
  const inicio = entre(0, 1.5);
  for (let i = 0; i < n; i++) {
    const a = inicio + (i / n) * Math.PI * 2;
    const r = 0.88;
    l.agregar(l.mat.plasticoNegro, sillas, matriz(x + Math.sin(a) * r, 0, z + Math.cos(a) * r, a + Math.PI + entre(-0.25, 0.25)));
  }
  huellas.push({ x, z, r: 0.85, difuso: 0.55 });
}

function mesaRecta(l, huellas, sillas, x, z, { largo = 1.8, conSillas = true, cubierta } = {}) {
  const fondo = 1.0;
  l.caja(cubierta ?? l.mat.cubierta, x, 0.72, z, largo, 0.035, fondo);
  l.caja(l.mat.negro, x, 0.712, z, largo + 0.012, 0.012, fondo + 0.012);
  for (const lado of [-1, 1]) {
    l.caja(l.mat.gris, x + (lado * largo) / 2 - lado * 0.16, 0.04, z, 0.1, 0.68, 0.34);
    l.caja(l.mat.gris, x + (lado * largo) / 2 - lado * 0.16, 0, z, 0.1, 0.05, 0.86);
  }
  if (conSillas) {
    for (const lado of [-1, 1]) {
      for (const dx of [-largo / 4, largo / 4]) {
        l.agregar(l.mat.plasticoNegro, sillas, matriz(x + dx, 0, z + lado * (fondo / 2 + 0.2), lado > 0 ? Math.PI : 0));
      }
    }
  }
  huellas.push({ x, z, w: largo + 0.1, d: fondo + 0.5, difuso: 0.45 });
}

/**
 * Tramo de estante de un metro, de un lado. Es local a la matriz `base`; los libros miran a +z.
 * `agregaFondo` pone tapa trasera; en estantes dobles no hace falta.
 */
function tramoEstante(l, base, { largo = 0.98, fondo = 0.38, alto = 2.1, niveles = 6, agregaFondo = true } = {}) {
  const pieza = (material, geometria, x, y, z) => l.agregar(material, geometria, base.clone().multiply(matriz(x, y, z)));
  const entrepano = cajaEnMetros(largo, 0.025, fondo);
  const altura = (alto - 0.12) / niveles;
  for (let i = 0; i <= niveles; i++) pieza(l.mat.estante, entrepano, 0, 0.1 + i * altura, 0);
  if (agregaFondo) pieza(l.mat.fondoEstante, cajaEnMetros(largo, alto, 0.015), 0, alto / 2, -fondo / 2 + 0.01);

  const huecoUV = 1 / tx.FILAS_LIBROS;
  for (let i = 0; i < niveles; i++) {
    const relleno = azar() < 0.06 ? 0.55 : 1; // algunos entrepaños van medio vacíos
    const ancho = (largo - 0.02) * relleno;
    const altoLibro = altura - 0.02;
    const q = new THREE.PlaneGeometry(ancho, altoLibro);
    const fila = Math.floor(azar() * tx.FILAS_LIBROS);
    const inicio = azar() * (1 - ancho);
    const u = q.attributes.uv;
    u.setXY(0, inicio, 1 - fila * huecoUV);
    u.setXY(1, inicio + ancho, 1 - fila * huecoUV);
    u.setXY(2, inicio, 1 - (fila + 1) * huecoUV);
    u.setXY(3, inicio + ancho, 1 - (fila + 1) * huecoUV);
    const metido = entre(0.01, 0.07);
    pieza(l.mat.libros, q, (ancho - largo) / 2 + 0.01, 0.115 + i * altura + altoLibro / 2, fondo / 2 - metido);
  }
}

/** Estantería doble, recta, a lo largo de z. Termina en cabeceras altas con su letrero. */
function estanteriaDoble(l, malla, huellas, solidos, e) {
  const { x } = p(e.px, 0);
  const z1 = p(0, e.de).z;
  const z2 = p(0, e.a).z;
  const tramos = Math.round(z2 - z1);
  const largo = (z2 - z1) / tramos;
  for (let i = 0; i < tramos; i++) {
    const z = z1 + (i + 0.5) * largo;
    tramoEstante(l, matriz(x + 0.2, 0, z, Math.PI / 2), { largo: largo - 0.02, agregaFondo: i % 2 === 0 });
    tramoEstante(l, matriz(x - 0.2, 0, z, -Math.PI / 2), { largo: largo - 0.02, agregaFondo: false });
  }
  l.caja(l.mat.estante, x, 2.08, (z1 + z2) / 2, 0.82, 0.03, z2 - z1);
  l.caja(l.mat.fondoEstante, x, 0, (z1 + z2) / 2, 0.08, 2.1, z2 - z1);
  for (const z of [z1, z2]) l.caja(l.mat.gris, x, 0, z, 0.9, 2.3, 0.05);
  // Cabecera con el letrero de clase hacia la entrada
  l.caja(l.mat.gris, x, 2.3, z2, 0.9, 0.42, 0.05);
  const [numero, tema] = e.clase;
  const letrero = new THREE.Mesh(
    new THREE.PlaneGeometry(0.88, 0.22),
    new THREE.MeshStandardMaterial({ map: tx.cartelClase(numero, tema), roughness: 0.5 }),
  );
  letrero.position.set(x, 2.52, z2 + 0.032);
  malla.add(letrero);
  huellas.push({ x, z: (z1 + z2) / 2, w: 1.0, d: z2 - z1 + 0.1, difuso: 0.4 });
  solidos.push(cajaPlana(x - 0.5, z1, x + 0.5, z2));
}

const cajaPlana = (x1, z1, x2, z2) => ({ x1, z1, x2, z2 });

/** Hilera de estantes de un lado, entre dos puntos, con los libros hacia el lado `lado` (±1). */
function hilera(l, huellas, x1, z1, x2, z2, lado = 1, opciones = {}) {
  const largoTotal = Math.hypot(x2 - x1, z2 - z1);
  const n = Math.max(1, Math.round(largoTotal));
  const giro = Math.atan2(z1 - z2, x2 - x1) + (lado > 0 ? 0 : Math.PI);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    tramoEstante(l, matriz(x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t, giro), { largo: largoTotal / n - 0.02, ...opciones });
  }
  huellas.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: largoTotal, d: 0.5, giro: Math.atan2(z1 - z2, x2 - x1), difuso: 0.35 });
}

/** Colegio bibliográfico: estantes en herradura con mesas de exhibición en las puntas. */
function herradura(l, malla, huellas, solidos) {
  const c = p(HERRADURA.px, HERRADURA.py);
  const r = m(HERRADURA.radio);
  const tramos = 15;
  const barrido = Math.PI * 1.16;
  for (let i = 0; i < tramos; i++) {
    const a = -barrido / 2 + ((i + 0.5) / tramos) * barrido;
    const x = c.x + Math.sin(a) * r;
    const z = c.z - Math.cos(a) * r;
    tramoEstante(l, matriz(x, 0, z, -a), { largo: (r * barrido) / tramos - 0.02 });
    // Por fuera, otro tramo: la herradura se recorre por los dos lados
    const rf = r + 0.4;
    tramoEstante(l, matriz(c.x + Math.sin(a) * rf, 0, c.z - Math.cos(a) * rf, -a + Math.PI), { largo: (rf * barrido) / tramos - 0.04, agregaFondo: false });
    solidos.push(cajaPlana(x - 0.5, z - 0.5, x + 0.5, z + 0.5));
  }
  const curva = new THREE.RingGeometry(r - 0.2, r + 0.6, 64, 1, Math.PI / 2 - barrido / 2, barrido);
  curva.rotateX(-Math.PI / 2);
  curva.translate(c.x, 2.112, c.z);
  // RingGeometry queda en el plano XY: al girarla su ángulo 90° apunta a -z, hacia el fondo.
  l.agregar(l.mat.estante, curva);
  for (let i = 0; i < 24; i++) {
    const a = -barrido / 2 + (i / 23) * barrido;
    huellas.push({ x: c.x + Math.sin(a) * (r + 0.2), z: c.z - Math.cos(a) * (r + 0.2), r: 0.65, difuso: 0.35 });
  }
  // Puntas: panel de exhibición del mes y, dentro de la boca, su mesa con mantel, como en la
  // foto de octubre. La mesa va por dentro para no chocar con las mesas redondas de enfrente.
  for (const lado of [-1, 1]) {
    const a = (lado * barrido) / 2;
    const x = c.x + Math.sin(a) * (r + 0.1);
    const z = c.z - Math.cos(a) * (r + 0.1) + 0.5;
    l.caja(l.mat.naranja, x, 0, z - 0.12, 1, 2.45, 0.06);
    const mesaX = c.x + lado * 2.5;
    const mesaZ = c.z + 1.6;
    l.caja(l.mat.manteleria, mesaX, 0, mesaZ, 1.5, 0.8, 0.9);
    for (let i = 0; i < 5; i++) {
      l.caja(l.mat.portadas, mesaX + entre(-0.55, 0.55), 0.8, mesaZ + entre(-0.3, 0.3), 0.26, 0.03, 0.34, entre(-0.5, 0.5));
    }
    huellas.push({ x: mesaX, z: mesaZ, w: 1.6, d: 1, difuso: 0.4 });
  }
}

function escritorioCompu(l, x, z, giro) {
  const b = matriz(x, 0, z, giro);
  l.agregar(l.mat.pantalla, cajaEnMetros(0.54, 0.34, 0.03), b.clone().multiply(matriz(0, 1.1, -0.2)));
  l.agregar(l.mat.negro, cajaEnMetros(0.2, 0.012, 0.16), b.clone().multiply(matriz(0, 0.92, -0.2)));
  l.agregar(l.mat.negro, cajaEnMetros(0.04, 0.16, 0.03), b.clone().multiply(matriz(0, 1.0, -0.2)));
  l.agregar(l.mat.negro, cajaEnMetros(0.42, 0.02, 0.14), b.clone().multiply(matriz(0, 0.93, 0.08)));
}

function monitor(l, x, y, z, giro) {
  l.caja(l.mat.pantalla, x, y + 0.16, z, 0.56, 0.34, 0.03, giro);
  l.caja(l.mat.negro, x, y, z, 0.2, 0.02, 0.16, giro);
  l.caja(l.mat.negro, x, y, z, 0.04, 0.18, 0.04, giro);
}

function ventilador(l, x, z) {
  l.cilindro(l.mat.negro, x, 0, z, 0.26, 0.04);
  l.cilindro(l.mat.negro, x, 0.04, z, 0.018, 1.3);
  // Jaula de aro con aspas, no un disco macizo
  for (const dz of [-0.05, 0.05]) l.agregar(l.mat.negro, new THREE.TorusGeometry(0.34, 0.012, 8, 32).translate(x, 1.42, z + dz));
  for (let i = 0; i < 4; i++) l.agregar(l.mat.negro, new THREE.BoxGeometry(0.1, 0.3, 0.012).translate(0, 0.17, 0).rotateZ(i * 1.57 + 0.3).translate(x, 1.42, z));
}

function carrito(l, x, z, giro) {
  const base = matriz(x, 0, z, giro);
  const pieza = (material, geo, dy) => l.agregar(material, geo, base.clone().multiply(matriz(0, dy, 0)));
  for (const y of [0.25, 0.6, 0.95]) pieza(l.mat.aceroClaro, cajaEnMetros(0.9, 0.02, 0.36), y);
  pieza(l.mat.aceroClaro, cajaEnMetros(0.03, 1.05, 0.36).translate(-0.44, 0, 0), 0.55);
  pieza(l.mat.aceroClaro, cajaEnMetros(0.03, 1.05, 0.36).translate(0.44, 0, 0), 0.55);
  pieza(l.mat.negro, cajaEnMetros(0.85, 0.08, 0.3), 0.04);
}

// ---------------------------------------------------------------------------------------
// Edificio
// ---------------------------------------------------------------------------------------

/**
 * Fachada de cristal con parteluces y persianas arriba, como en las fotos. Va por lado, para
 * que el visor pueda quitar el lado que le estorba a la cámara (la "casa de muñecas").
 */
function fachada(l, x1, z1, x2, z2, { alto = ALTO_TECHO, persiana = true } = {}) {
  const largo = Math.hypot(x2 - x1, z2 - z1);
  const giro = Math.atan2(z1 - z2, x2 - x1);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const modulo = 1.6;
  const n = Math.round(largo / modulo);
  const base = matriz(cx, 0, cz, giro);
  const pieza = (material, geo, x, y) => l.agregar(material, geo, base.clone().multiply(matriz(x, y, 0)));
  const finCristal = persiana ? 5.1 : alto;

  pieza(l.mat.cristal, new THREE.BoxGeometry(largo, finCristal - 0.3, 0.02), 0, 0.3 + (finCristal - 0.3) / 2);
  pieza(l.mat.muro, cajaEnMetros(largo, 0.3, 0.14), 0, 0.15);
  for (let i = 0; i <= n; i++) pieza(l.mat.canceleria, cajaEnMetros(0.05, finCristal, 0.1), -largo / 2 + (i * largo) / n, finCristal / 2);
  for (const y of [0.3, 1.5, 2.8, 4, finCristal]) pieza(l.mat.canceleria, cajaEnMetros(largo, 0.05, 0.08), 0, y);
  if (persiana) {
    for (let y = 5.2; y < alto; y += 0.24) pieza(l.mat.aceroClaro, cajaEnMetros(largo, 0.15, 0.012), 0, y);
    for (let i = 0; i <= n; i += 2) pieza(l.mat.acero, cajaEnMetros(0.08, alto - 5.1, 0.1), -largo / 2 + (i * largo) / n, (alto + 5.1) / 2);
  }
  const columnas = Math.max(1, Math.round(largo / 6.4));
  for (let i = 0; i <= columnas; i++) {
    pieza(l.mat.acero, cajaEnMetros(0.32, alto, 0.4), -largo / 2 + (i * largo) / columnas, alto / 2);
  }
}

function muroInterior(l, huellas, x1, z1, x2, z2, { alto = ALTO_MURO, grosor = 0.14 } = {}) {
  const largo = Math.hypot(x2 - x1, z2 - z1);
  const giro = Math.atan2(z1 - z2, x2 - x1);
  l.caja(l.mat.muro, (x1 + x2) / 2, 0, (z1 + z2) / 2, largo, alto, grosor, giro);
  // Rodapié gris, como en la foto del módulo digital
  l.caja(l.mat.pisoCuarto, (x1 + x2) / 2, 0, (z1 + z2) / 2, largo, 0.1, grosor + 0.02, giro);
  huellas.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: largo, d: 0.22, giro, difuso: 0.5 });
}

function muroConPuerta(l, huellas, x1, z1, x2, z2, puertaEn, anchoPuerta = 1.2, opciones) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const largo = Math.hypot(dx, dz);
  const u = [dx / largo, dz / largo];
  const a = puertaEn - anchoPuerta / 2;
  const b = puertaEn + anchoPuerta / 2;
  muroInterior(l, huellas, x1, z1, x1 + u[0] * a, z1 + u[1] * a, opciones);
  muroInterior(l, huellas, x1 + u[0] * b, z1 + u[1] * b, x2, z2, opciones);
  const alto = opciones?.alto ?? ALTO_MURO;
  l.caja(l.mat.muro, x1 + u[0] * puertaEn, 2.3, z1 + u[1] * puertaEn, anchoPuerta, alto - 2.3, 0.14, Math.atan2(-dz, dx));
}

const esquinas = (r) => {
  const a = p(r[0], r[1]);
  const b = p(r[2], r[3]);
  return { x1: a.x, z1: a.z, x2: b.x, z2: b.z, cx: (a.x + b.x) / 2, cz: (a.z + b.z) / 2, w: b.x - a.x, d: b.z - a.z };
};

function piso(mats, huellas, escena) {
  const marmol = tx.marmol();
  marmol.repeat.set(ANCHO / 3.6, FONDO / 3.6);
  const g = new THREE.PlaneGeometry(ANCHO, FONDO);
  g.rotateX(-Math.PI / 2);
  g.setAttribute('uv1', g.attributes.uv.clone());
  const material = new THREE.MeshStandardMaterial({
    map: marmol,
    roughness: 0.16,
    metalness: 0.02,
    aoMap: tx.sombrasDePiso(huellas, ANCHO, FONDO),
    aoMapIntensity: 1.0,
    envMapIntensity: 1.25,
  });
  const malla = new THREE.Mesh(g, material);
  malla.receiveShadow = true;
  escena.add(malla);

  // Franjas de mosaico: pasillo de mesas y frente de estanterías y mostradores.
  const textura = tx.mosaico();
  textura.repeat.set(0.5, 0.5);
  const franja = new THREE.MeshStandardMaterial({
    map: textura, roughness: 0.2, envMapIntensity: 1.2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const franjas = [
    [205, 686, 1240, 716], [555, 716, 590, 1000], [1240, 545, 1275, 1015],
    [1275, 700, 1415, 730], [1100, 545, 1240, 570],
  ];
  const piezas = franjas.map((r) => {
    const c = esquinas(r);
    const q = new THREE.PlaneGeometry(c.w, c.d);
    q.rotateX(-Math.PI / 2);
    const uv = q.attributes.uv;
    for (let i = 0; i < 4; i++) uv.setXY(i, uv.getX(i) * c.w, uv.getY(i) * c.d);
    q.translate(c.cx, 0.003, c.cz);
    return q;
  });
  const mallaFranjas = new THREE.Mesh(mergeGeometries(piezas, false), franja);
  mallaFranjas.receiveShadow = true;
  escena.add(mallaFranjas);
  return [malla, mallaFranjas];
}

/** Tapanco de planta alta: losa redondeada, columnas, barandal de acero y escalera curva. */
function tapanco(l, loteAlta, alta, huellas) {
  const c = esquinas(TAPANCO);
  const r = 3.2;
  const forma = new THREE.Shape();
  forma.moveTo(c.x1, c.z1);
  forma.lineTo(c.x2, c.z1);
  forma.lineTo(c.x2, c.z2);
  forma.lineTo(c.x1 + r, c.z2);
  forma.quadraticCurveTo(c.x1, c.z2, c.x1, c.z2 - r);
  forma.lineTo(c.x1, c.z1);

  const puntosBorde = forma.getSpacedPoints(120);
  // Cara superior con duela y canto gris, que imita la trabe curva de la foto.
  const losa = new THREE.ExtrudeGeometry(forma, { depth: 0.45, bevelEnabled: false, curveSegments: 16 });
  losa.rotateX(Math.PI / 2);
  losa.translate(0, ALTO_TAPANCO, 0);
  const malla = new THREE.Mesh(losa, [l.mat.duela, l.mat.acero]);
  malla.castShadow = true;
  malla.receiveShadow = true;
  alta.add(malla);
  for (const [px, py] of [[1262, 495], [1262, 300], [1262, 130], [1400, 500], [1540, 500], [1400, 300], [1540, 300]]) {
    const q = p(px, py);
    l.cilindro(l.mat.acero, q.x, 0, q.z, 0.2, ALTO_TAPANCO - 0.4, 0.2, 20);
    huellas.push({ x: q.x, z: q.z, r: 0.34, difuso: 0.3 });
  }

  // Barandal por el borde libre (el lado hacia la sala)
  const borde = puntosBorde.filter((q) => q.x < c.x2 - 0.2 && q.y > c.z1 + 2.4);
  const h = ALTO_TAPANCO;
  const ultimo = borde.length - 1;
  borde.forEach((q, i) => {
    if (i % 4 === 0) loteAlta.cilindro(l.mat.inox, q.x, h, q.y, 0.03, 1.02, 0.03, 10);
    if (i < ultimo) {
      const s = borde[i + 1];
      const largo = Math.hypot(s.x - q.x, s.y - q.y);
      if (largo > 2) return;
      for (const y of [h + 1.02, h + 0.75, h + 0.5, h + 0.25]) {
        const grueso = y === h + 1.02 ? 0.045 : 0.018;
        const tubo = new THREE.CylinderGeometry(grueso / 2 + 0.006, grueso / 2 + 0.006, largo, 8).rotateZ(Math.PI / 2);
        loteAlta.agregar(l.mat.inox, tubo, matriz((q.x + s.x) / 2, y, (q.y + s.y) / 2, Math.atan2(q.y - s.y, s.x - q.x)));
      }
    }
  });

  // Escalera en arco, pegada al tapanco
  const eje = p(1290, 270);
  const radio = 3;
  const escalones = 19;
  const desde = 2.27;
  const hasta = 4.1;
  const barandal = [];
  for (let i = 0; i < escalones; i++) {
    const t = (i + 0.5) / escalones;
    const a = desde + t * (hasta - desde);
    const x = eje.x + Math.cos(a) * radio;
    const z = eje.z + Math.sin(a) * radio;
    const y = (i * ALTO_TAPANCO) / escalones;
    l.caja(l.mat.muroFino, x, y, z, 1.25, ALTO_TAPANCO / escalones + 0.02, 0.36, -a);
    barandal.push({ x: eje.x + Math.cos(a) * (radio + 0.62), z: eje.z + Math.sin(a) * (radio + 0.62), y });
    huellas.push({ x, z, r: 0.75, difuso: 0.3 });
  }
  // Descanso entre el último escalón y la losa
  const final = esquinas([1225, 170, 1258, 225]);
  l.caja(l.mat.muroFino, final.cx, ALTO_TAPANCO - 0.2, final.cz, final.w, 0.2, final.d);
  barandal.forEach((q, i) => {
    l.cilindro(l.mat.inox, q.x, q.y, q.z, 0.022, 1, 0.022, 8);
    const s = barandal[i + 1];
    if (!s) return;
    const largo = Math.hypot(s.x - q.x, s.y - q.y, s.z - q.z);
    const tubo = new THREE.CylinderGeometry(0.024, 0.024, largo, 8);
    const orienta = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(s.x - q.x, s.y - q.y, s.z - q.z).normalize(),
    );
    l.agregar(l.mat.inox, tubo, new THREE.Matrix4().compose(
      new THREE.Vector3((q.x + s.x) / 2, (q.y + s.y) / 2 + 1, (q.z + s.z) / 2), orienta, UNO,
    ));
  });
}

function ludoteca(l, huellas) {
  const c = esquinas(TAPANCO);
  const colores = [l.mat.rojo, l.mat.amarillo, l.mat.verde, l.mat.azul];
  const silla = geometriaSilla(0.68);
  const mesas = [[1330, 300], [1420, 280], [1505, 300], [1340, 420], [1430, 400], [1520, 420], [1400, 180], [1490, 170]];
  for (const [px, py] of mesas) {
    const q = p(px, py);
    const hex = new THREE.CylinderGeometry(0.72, 0.72, 0.03, 6);
    hex.translate(q.x, 0.52, q.z);
    l.agregar(colores[Math.floor(azar() * 4)], hex);
    l.cilindro(l.mat.negro, q.x, 0, q.z, 0.05, 0.5);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + entre(-0.2, 0.2);
      l.agregar(colores[Math.floor(azar() * 4)], silla, matriz(q.x + Math.sin(a) * 0.85, 0, q.z + Math.cos(a) * 0.85, a + Math.PI));
    }
    huellas.push({ x: q.x, z: q.z, r: 0.85, difuso: 0.5 });
  }
  // Libreros bajos contra los cristales
  hilera(l, huellas, c.x2 - 0.4, c.z1 + 1, c.x2 - 0.4, c.z2 - 1, 1, { alto: 1.15, niveles: 3 });
  hilera(l, huellas, c.x1 + 5, c.z1 + 0.5, c.x2 - 1, c.z1 + 0.5, 1, { alto: 1.15, niveles: 3 });
  // Mostrador corto de la entrada al área
  l.caja(l.mat.mostrador, c.x1 + 0.7, 0, c.z2 - 1, 3.4, 1.05, 0.5, Math.PI / 2 + 0.25);
  huellas.push({ x: c.x1 + 0.7, z: c.z2 - 1, w: 3.5, d: 0.6, giro: Math.PI / 2 + 0.25, difuso: 0.4 });
}

function salon(l, huellas, sillas) {
  // Dos filas de mesas de trabajo, como en la foto del Salón Argüello
  for (const py of [230, 300]) {
    for (let px = 410; px <= 930; px += 104) {
      const q = p(px, py);
      mesaRecta(l, huellas, sillas, q.x, q.z);
    }
  }
}

function comics(l, huellas) {
  const rack = (x1, z1, x2, z2) => {
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / 1.1));
    const giro = Math.atan2(z1 - z2, x2 - x1);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const base = matriz(x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t, giro);
      const pieza = (material, geo, x, y, z = 0) => l.agregar(material, geo, base.clone().multiply(matriz(x, y, z)));
      for (const lado of [-0.52, 0.52]) pieza(l.mat.azulExhibidor, cajaEnMetros(0.05, 2.05, 0.3), lado, 1.02);
      for (let k = 0; k < 5; k++) {
        const y = 0.3 + k * 0.38;
        pieza(l.mat.azulExhibidor, cajaEnMetros(1.04, 0.03, 0.14), 0, y - 0.03, 0.08);
        const portada = new THREE.PlaneGeometry(1.02, 0.34);
        const fila = Math.floor(azar() * 3);
        const u = portada.attributes.uv;
        for (let v = 0; v < 4; v++) u.setY(v, (u.getY(v) + fila) / 3);
        pieza(l.mat.portadas, portada, 0, y + 0.15, 0.06);
      }
      pieza(l.mat.negro, cajaEnMetros(1.04, 2, 0.02), 0, 1.02, -0.05);
    }
    huellas.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: Math.hypot(x2 - x1, z2 - z1), d: 0.5, giro, difuso: 0.35 });
  };
  const a = p(1468, 590);
  const b = p(1468, 705);
  rack(a.x, a.z, b.x, b.z);
  const d = p(1420, 722);
  const e = p(1490, 722);
  rack(d.x, d.z, e.x, e.z);
}

function recepcion(l, huellas, malla, solidos, sillas) {
  // Son mostradores delgados en L: el personal y el guardarropa quedan adentro.
  const h = esquinas([810, 735, 1025, 760]);
  const v = esquinas([810, 760, 835, 985]);
  const mostrador = (c) => {
    // Forro de madera con cubierta sobresaliente y una ranura, igual que el real
    l.caja(l.mat.mostrador, c.cx, 0.05, c.cz, c.w, 1.05, c.d);
    l.caja(l.mat.pisoCuarto, c.cx, 0, c.cz, c.w - 0.04, 0.05, c.d - 0.04);
    l.caja(l.mat.mostrador, c.cx, 1.1, c.cz, c.w + 0.1, 0.05, c.d + 0.1);
    huellas.push({ x: c.cx, z: c.cz, w: c.w, d: c.d, difuso: 0.4 });
    solidos.push(cajaPlana(c.x1, c.z1, c.x2, c.z2));
  };
  mostrador(h);
  mostrador(v);
  monitor(l, v.cx, 1.15, v.cz + 1.5, Math.PI / 2);
  monitor(l, h.cx - 0.6, 1.15, h.cz, Math.PI);
  monitor(l, h.cx + 1.6, 1.15, h.cz, Math.PI);
  for (const [px, py] of [[905, 790], [960, 790], [865, 880]]) {
    const q = p(px, py);
    l.agregar(l.mat.plasticoNegro, sillas, matriz(q.x, 0, q.z, Math.PI));
  }
  // Guardarropa: repisas contra el muro de atrás
  const f = esquinas([860, 960, 1025, 1000]);
  hilera(l, huellas, f.x1, f.cz, f.x2, f.cz, 1, { alto: 1.6, niveles: 4 });
  l.cilindro(l.mat.azulBarril, h.x2 + 1.0, 0, h.cz, 0.3, 0.9, 0.3);
  huellas.push({ x: h.x2 + 1.0, z: h.cz, r: 0.42, difuso: 0.3 });

  const letrero = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.42),
    new THREE.MeshStandardMaterial({
      map: tx.cartel([{ texto: 'REGISTRO DE', tam: 96 }, { texto: 'USUARIOS Y GUARDARROPA', tam: 86 }], { proporcion: 2.6 }),
      roughness: 0.5,
    }),
  );
  letrero.position.set(v.cx, 0.86, h.z1 - 0.012);
  letrero.rotation.y = Math.PI;
  malla.add(letrero);
}

function prestamo(l, huellas, malla, solidos) {
  const c = esquinas([1070, 730, 1240, 1015]);
  const barra = (x1, z1, x2, z2) => {
    const q = { cx: (x1 + x2) / 2, cz: (z1 + z2) / 2, w: Math.abs(x2 - x1), d: Math.abs(z2 - z1) };
    l.caja(l.mat.mostrador, q.cx, 0.05, q.cz, q.w, 1.05, q.d);
    l.caja(l.mat.mostrador, q.cx, 1.1, q.cz, q.w + 0.1, 0.05, q.d + 0.1);
    huellas.push({ x: q.cx, z: q.cz, w: q.w, d: q.d, difuso: 0.4 });
    solidos.push(cajaPlana(Math.min(x1, x2), Math.min(z1, z2), Math.max(x1, x2), Math.max(z1, z2)));
  };
  barra(c.x1, c.z1, c.x2, c.z1 + 0.75);
  barra(c.x1, c.z1 + 0.75, c.x1 + 0.75, c.z2 - 1.6);
  monitor(l, c.cx - 1, 1.15, c.z1 + 0.38, Math.PI);
  monitor(l, c.cx + 1.4, 1.15, c.z1 + 0.38, Math.PI);
  hilera(l, huellas, c.x1 + 1.2, c.z2 - 0.4, c.x2 - 0.2, c.z2 - 0.4, 1);
  l.caja(l.mat.negro, c.cx, 0, c.cz + 1.2, 1.6, 0.74, 0.7);

  const letrero = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.34),
    new THREE.MeshStandardMaterial({ map: tx.cartel([{ texto: 'PRÉSTAMOS A DOMICILIO', tam: 92 }], { proporcion: 4.7 }), roughness: 0.5 }),
  );
  letrero.position.set(c.cx, 0.72, c.z1 - 0.012);
  letrero.rotation.y = Math.PI;
  malla.add(letrero);
}

function cuartos(l, huellas, sillas, malla, solidos) {
  // Oficinas: un solo espacio corrido, sin divisiones. Su única entrada es un vano con
  // letrero que da a la sala; no se comunica con el Aula de trabajo ni con el Módulo digital.
  const of = esquinas(CUARTOS.oficinas);
  const puertaOficinas = 15;
  muroConPuerta(l, huellas, of.x2, of.z1, of.x2, of.z2, puertaOficinas, 1.1);
  const letreroOficinas = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.32),
    new THREE.MeshStandardMaterial({
      map: tx.cartel([{ texto: 'OFICINAS', tam: 120 }, { texto: 'Solo personal', tam: 70, peso: 400 }], { proporcion: 3.1 }),
      roughness: 0.5,
    }),
  );
  letreroOficinas.position.set(of.x2 + 0.08, 2.6, of.z1 + puertaOficinas);
  letreroOficinas.rotation.y = Math.PI / 2;
  malla.add(letreroOficinas);
  for (const z of [of.z1 + 2.6, of.z1 + 12, of.z1 + 16.5]) {
    const x = of.cx - 0.1;
    l.caja(l.mat.cabinete, x, 0.72, z, 1, 0.04, 1.6);
    l.caja(l.mat.negro, x, 0, z, 0.9, 0.72, 0.05);
    monitor(l, x, 0.76, z, Math.PI / 2);
  }

  // Aula de trabajo: mesas sueltas y la mesa en L del croquis
  const au = esquinas(CUARTOS.aula);
  // Cerrado por arriba (ahí están las oficinas); se entra solo desde la sala.
  muroInterior(l, huellas, au.x1, au.z1, au.x2, au.z1);
  muroConPuerta(l, huellas, au.x2, au.z1, au.x2, au.z2, 2.4, 1.3);
  for (const [dx, dz] of [[1.6, 1.6], [4.2, 1.6], [1.6, 3.7], [4.2, 3.7]]) mesaRecta(l, huellas, sillas, au.x1 + dx, au.z1 + dz, { largo: 1.6 });
  l.caja(l.mat.cabinete, au.x1 + 2, 0.72, au.z2 - 0.65, 3.4, 0.04, 0.8);
  l.caja(l.mat.cabinete, au.x1 + 0.6, 0.72, au.z2 - 1.5, 0.8, 0.04, 1.2);
  l.caja(l.mat.negro, au.x1 + 2, 0, au.z2 - 0.65, 3.2, 0.72, 0.05);

  // Módulo digital
  const mo = esquinas(CUARTOS.modulo);
  muroConPuerta(l, huellas, mo.x1, mo.z1, mo.x2, mo.z1, 6.6, 1.4);
  muroInterior(l, huellas, mo.x2, mo.z1, mo.x2, mo.z2);
  const mesa = esquinas([250, 905, 405, 985]);
  for (const fila of [mesa.z1 + 0.6, mesa.z2 - 0.6]) {
    l.caja(l.mat.cubierta, mesa.cx, 0.86, fila, mesa.w, 0.04, 0.95);
    l.caja(l.mat.negro, mesa.x1, 0, fila, 0.06, 0.86, 0.9);
    l.caja(l.mat.negro, mesa.x2, 0, fila, 0.06, 0.86, 0.9);
    for (let i = 0; i < 4; i++) {
      const x = mesa.x1 + ((i + 0.5) * mesa.w) / 4;
      escritorioCompu(l, x, fila, fila === mesa.z1 + 0.6 ? 0 : Math.PI);
      l.agregar(l.mat.plasticoNegro, sillas, matriz(x, 0, fila + (fila === mesa.z1 + 0.6 ? 0.8 : -0.8), fila === mesa.z1 + 0.6 ? Math.PI : 0));
    }
    huellas.push({ x: mesa.cx, z: fila, w: mesa.w, d: 1.6, difuso: 0.4 });
  }

  // Guardia: mostrador de madera en el área abierta, a la izquierda de la entrada, con el muro
  // del Módulo digital detrás, el garrafón junto al cristal y el ventilador, como en la foto.
  const gu = esquinas(CUARTOS.guardia);
  const frente = gu.x1 + 1.35;
  l.caja(l.mat.mostrador, frente, 0.05, gu.cz, 0.5, 1.05, gu.d);
  l.caja(l.mat.pisoCuarto, frente, 0, gu.cz, 0.46, 0.05, gu.d - 0.04);
  l.caja(l.mat.mostrador, frente, 1.1, gu.cz, 0.6, 0.05, gu.d + 0.1);
  for (const lado of [-1, 1]) l.caja(l.mat.mostrador, frente - 0.45, 0.05, gu.cz + lado * (gu.d / 2 - 0.25), 0.5, 1.05, 0.5);
  l.agregar(l.mat.plasticoNegro, sillas, matriz(gu.x1 + 0.7, 0, gu.cz, Math.PI / 2));
  l.cilindro(l.mat.azulExhibidor, gu.x1 + 0.45, 0.85, gu.z2 - 0.35, 0.14, 0.42, 0.14, 16);
  l.caja(l.mat.negro, gu.x1 + 0.45, 0, gu.z2 - 0.35, 0.34, 0.85, 0.34);
  ventilador(l, gu.x1 + 0.5, gu.z1 + 0.3);
  huellas.push({ x: frente, z: gu.cz, w: 0.6, d: gu.d, difuso: 0.4 });
  solidos.push(cajaPlana(frente - 0.3, gu.z1, frente + 0.3, gu.z2));

  // Vestíbulo de entrada: marco de cristal
  const en = esquinas(CUARTOS.entrada);
  for (const x of [en.x1, en.x2]) {
    l.caja(l.mat.cristal, x, 0, en.cz, 0.02, 2.6, en.d);
    l.caja(l.mat.negro, x, 0, en.cz, 0.08, 0.1, en.d);
    l.caja(l.mat.negro, x, 2.6, en.cz, 0.08, 0.08, en.d);
    l.caja(l.mat.negro, x, 0, en.z1, 0.08, 2.6, 0.08);
  }
  l.caja(l.mat.acero, en.cx, 2.6, en.z1, en.w, 0.08, 0.08);

  // Espacio especial
  const es = esquinas(CUARTOS.especial);
  muroConPuerta(l, huellas, es.x1, es.z1, es.x1, es.z2, 2.2, 1.4);
  muroInterior(l, huellas, es.x1, es.z1, es.x2, es.z1);
  mesaRecta(l, huellas, sillas, es.cx - 0.6, es.cz - 1.4, { cubierta: l.mat.roble });
  mesaRecta(l, huellas, sillas, es.cx - 0.6, es.cz + 2, { cubierta: l.mat.roble });
  hilera(l, huellas, es.x2 - 0.35, es.z1 + 0.6, es.x2 - 0.35, es.z2 - 0.6, 1);

  // Oficina derecha y su acceso restringido
  const od = esquinas(CUARTOS.oficinaDerecha);
  muroInterior(l, huellas, od.x1, od.z1, od.x2, od.z1);
  muroConPuerta(l, huellas, od.x1, od.z1, od.x1, od.z2, 3.2, 1);
  muroInterior(l, huellas, od.x1, od.z2, od.x2, od.z2);
  l.caja(l.mat.cabinete, od.cx, 0.72, od.cz, 1, 0.04, 1.6);

  // Baños: cubos blancos pegados al muro del fondo, con letrero
  const bano = (r, texto) => {
    const b = esquinas(r);
    muroInterior(l, huellas, b.x1, b.z1, b.x1, b.z2);
    muroInterior(l, huellas, b.x2, b.z1, b.x2, b.z2);
    muroConPuerta(l, huellas, b.x1, b.z2, b.x2, b.z2, b.w / 2, 1);
    l.caja(l.mat.pisoCuarto, b.cx, 0.005, b.cz, b.w - 0.14, 0.01, b.d - 0.14);
    for (const dx of [-0.8, 0, 0.8]) l.caja(l.mat.muroFino, b.cx + dx, 0, b.z1 + 0.4, 0.42, 0.45, 0.55);
    const letrero = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.26),
      new THREE.MeshStandardMaterial({ map: tx.cartel([{ texto, tam: 120 }], { proporcion: 3 }), roughness: 0.5 }),
    );
    letrero.position.set(b.cx, 2.55, b.z2 + 0.08);
    malla.add(letrero);
  };
  bano(CUARTOS.banoHombres, 'Caballeros');
  bano(CUARTOS.banoMujeres, 'Damas');

  // Entre los baños: oficina con el cuarto de servidores. Solo la barda y su puerta, vacía.
  const ofCentro = esquinas(CUARTOS.oficinaCentro);
  muroConPuerta(l, huellas, ofCentro.x1, ofCentro.z2, ofCentro.x2, ofCentro.z2, ofCentro.w / 2, 1);

  // Salida de emergencia, en el muro del fondo
  const sa = esquinas([1120, 90, 1195, 100]);
  l.caja(l.mat.acero, sa.cx, 0, sa.z1 + 0.09, 1.9, 2.3, 0.08);
  l.caja(l.mat.salida, sa.cx, 2.42, sa.z1 + 0.09, 1, 0.26, 0.05);
}

function acervoLateral(l, huellas, sillas, malla) {
  // Colección de consulta, como en la foto: estantes contra el cristal del fondo y contra un muro
  // blanco bajo con su letrero. Detrás del muro no queda pasillo: llega hasta las oficinas.
  const a = p(195, 96);
  const b = p(420, 96);
  hilera(l, huellas, a.x, a.z + 0.2, b.x, a.z + 0.2, 1);
  const k = p(190, 150);
  const q = p(190, 330);
  const muroX = k.x + 0.12;
  l.caja(l.mat.muro, muroX, 0, (k.z + q.z) / 2, 0.24, 2.6, q.z - k.z);
  huellas.push({ x: muroX, z: (k.z + q.z) / 2, w: 0.3, d: q.z - k.z, difuso: 0.5 });
  hilera(l, huellas, muroX + 0.32, k.z + 0.3, muroX + 0.32, q.z - 0.3, -1);
  const letrero = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.36),
    new THREE.MeshStandardMaterial({
      map: tx.cartel([{ texto: 'COLECCIÓN DE', tam: 110 }, { texto: 'CONSULTA', tam: 110 }], { proporcion: 3, fondo: '#e9f3ea', borde: '#2f9e5e' }),
      roughness: 0.5,
    }),
  );
  letrero.position.set(muroX + 0.13, 2.3, (k.z + q.z) / 2);
  letrero.rotation.y = Math.PI / 2;
  malla.add(letrero);
  // Estante del croquis pegado al muro de las oficinas; termina antes de su puerta.
  const s1 = p(185, 365);
  const s2 = p(185, 555);
  hilera(l, huellas, s1.x + 0.28, s1.z, s2.x + 0.28, s2.z, -1);
  for (const [px, py] of [[300, 165], [370, 165]]) {
    const q2 = p(px, py);
    mesaRecta(l, huellas, sillas, q2.x, q2.z, { largo: 1.6 });
  }

  // Catálogo público: fichero de madera con cajoncitos
  const c = p(1015, 130);
  l.caja(l.mat.negro, c.x, 0, c.z, 1.7, 0.72, 0.55);
  l.caja(l.mat.cabinete, c.x, 0.72, c.z, 1.8, 0.44, 0.6);
  for (let f = 0; f < 3; f++) {
    for (let k2 = 0; k2 < 8; k2++) {
      l.caja(l.mat.inox, c.x - 0.77 + k2 * 0.22, 0.81 + f * 0.13, c.z + 0.31, 0.07, 0.024, 0.02);
    }
  }
  huellas.push({ x: c.x, z: c.z, w: 1.9, d: 0.7, difuso: 0.4 });

  // Letrero colgante "Solón Argüello", con el poema calado como el real
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(11.5, 1.75, 0.03),
    [l.mat.aceroClaro, l.mat.aceroClaro, l.mat.aceroClaro, l.mat.aceroClaro,
      new THREE.MeshStandardMaterial({
        roughness: 0.42,
        metalness: 0.25,
        map: tx.cartel([
          { texto: 'Solón  Argüello', tam: 150 },
          { texto: 'Acercadme el reflector: Quiero que todos veáis este', tam: 50 },
          { texto: 'pecho que tantas veces combatió por la libertad.', tam: 50 },
        ], { proporcion: 11.5 / 1.75, fondo: '#d9dcdc', ancho: 2048 }),
      }),
      l.mat.aceroClaro],
  );
  const centro = p(668, 165);
  panel.position.set(centro.x, 5, centro.z);
  panel.castShadow = true;
  malla.add(panel);
}

function techumbre(l, techo) {
  // Plafón de lámina, largueros blancos y trabes grises, con lámparas colgantes
  l.caja(l.mat.techo, 0, ALTO_TECHO + 0.2, 0, ANCHO + 0.6, 0.06, FONDO + 0.6);
  for (let z = -FONDO / 2; z <= FONDO / 2; z += 1.8) l.caja(l.mat.muroFino, 0, ALTO_TECHO, z, ANCHO, 0.2, 0.14);
  for (let x = -ANCHO / 2; x <= ANCHO / 2; x += 6.4) l.caja(l.mat.acero, x, ALTO_TECHO - 0.32, 0, 0.3, 0.52, FONDO);
  const lamparas = [];
  for (let x = -ANCHO / 2 + 5; x < ANCHO / 2; x += 6.4) {
    for (let z = -FONDO / 2 + 4; z < FONDO / 2; z += 5.6) lamparas.push([x, z]);
  }
  for (const [x, z] of lamparas) {
    l.cilindro(l.mat.negro, x, 5.9, z, 0.01, ALTO_TECHO - 5.9, 0.01, 6);
    l.cilindro(l.mat.aceroClaro, x, 5.72, z, 0.3, 0.2, 0.06, 18);
    const foco = new THREE.SphereGeometry(0.12, 12, 8);
    foco.translate(x, 5.72, z);
    l.agregar(l.mat.lampara, foco);
  }
  l.volcar(techo);
}

/** Crea la maqueta completa y regresa los grupos que el visor enciende o apaga. */
export function construirMaqueta(escena) {
  const mats = crearMateriales();
  const l = new Lotes();
  l.mat = mats;
  const huellas = [];
  const solidos = [];
  const sillas = geometriaSilla();

  const baja = new THREE.Group();
  const alta = new THREE.Group();
  const techo = new THREE.Group();
  const lados = { norte: new THREE.Group(), sur: new THREE.Group(), este: new THREE.Group(), oeste: new THREE.Group() };
  escena.add(baja, alta, techo, ...Object.values(lados));

  salon(l, huellas, sillas);
  ESTANTERIAS.forEach((e) => estanteriaDoble(l, baja, huellas, solidos, e));
  herradura(l, baja, huellas, solidos);
  MESAS_REDONDAS.forEach(([px, py]) => { const q = p(px, py); mesaRedonda(l, huellas, sillas, q.x, q.z); });
  ludoteca(l, huellas);
  comics(l, huellas);
  recepcion(l, huellas, baja, solidos, sillas);
  prestamo(l, huellas, baja, solidos);
  cuartos(l, huellas, sillas, baja, solidos);
  acervoLateral(l, huellas, sillas, baja);
  for (const [x, z] of [[1085, 620], [590, 590]]) { const q = p(x, z); ventilador(l, q.x, q.z); }
  const cq = p(600, 650);
  carrito(l, cq.x, cq.z, 0.5);
  const cq2 = p(770, 640);
  carrito(l, cq2.x, cq2.z, -0.4);

  // Losa y barandal van aparte para poder ocultar la planta alta; columnas y escalera se quedan.
  const loteAlta = new Lotes();
  tapanco(l, loteAlta, alta, huellas);
  loteAlta.volcar(alta);
  l.volcar(baja);

  // Fachadas
  const O = -ANCHO / 2;
  const E = ANCHO / 2;
  const N = -FONDO / 2;
  const S = FONDO / 2;
  const izqArriba = p(105, 90).x;
  const quiebre = p(105, 780).z;
  const puerta = esquinas(CUARTOS.entrada);
  const conLote = (grupo, fn) => { const q = new Lotes(); q.mat = mats; fn(q); q.volcar(grupo); };
  conLote(lados.norte, (q) => {
    fachada(q, izqArriba, N, E, N);
    q.caja(mats.mural, (p(1255, 0).x + E) / 2, 6.0, N + 0.09, E - p(1255, 0).x, 1.4, 0.02);
  });
  conLote(lados.sur, (q) => {
    fachada(q, O, S, puerta.x1, S);
    fachada(q, puerta.x2, S, E, S);
  });
  conLote(lados.este, (q) => fachada(q, E, N, E, S));
  conLote(lados.oeste, (q) => {
    fachada(q, izqArriba, N, izqArriba, quiebre);
    fachada(q, O, quiebre, izqArriba, quiebre, { alto: 3.4, persiana: false });
    fachada(q, O, quiebre, O, S, { alto: 3.4, persiana: false });
  });

  const pisos = piso(mats, huellas, escena);

  // Zócalo de concreto: despega la maqueta del fondo negro. Es un marco y no una caja
  // para no tapar el reflejo que se dibuja bajo el piso.
  const zocalo = new Lotes();
  const concreto = pbr('#3c3e40', 0.9);
  const b = 0.6;
  zocalo.caja(concreto, 0, -0.5, N - b / 2, ANCHO + b * 2, 0.5, b);
  zocalo.caja(concreto, 0, -0.5, S + b / 2, ANCHO + b * 2, 0.5, b);
  zocalo.caja(concreto, O - b / 2, -0.5, 0, b, 0.5, FONDO);
  zocalo.caja(concreto, E + b / 2, -0.5, 0, b, 0.5, FONDO);
  zocalo.volcar(escena);

  techumbre(l, techo);

  return { baja, alta, techo, lados, solidos, pisos };
}
