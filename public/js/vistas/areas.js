import { html, pintar } from '../html.js';
import { CATEGORIAS, SERVICIOS, buscarServicio } from '../datos/servicios.js';
import { encabezadoPagina, tarjetaEnlace } from '../ui.js';

// Plano de la biblioteca. Las coordenadas siguen el croquis original (sin escala).
// Cada figura es un enlace a la guía de su servicio: servicio.html?id=<id>.
const enlace = (id) => `servicio.html?id=${encodeURIComponent(id)}`;

const rect = (id, x, y, w, h, titulo, subtitulo, { antetitulo, rx = 2 } = {}) => {
  const s = buscarServicio(id);
  const cx = x + w / 2;
  const cy = y + h / 2;
  // Un renglón por elemento; el título puede venir partido en varios renglones.
  const lineas = [
    antetitulo && { t: antetitulo, c: 'plano__antetitulo' },
    ...[].concat(titulo).map((t) => ({ t, c: 'plano__titulo' })),
    subtitulo && { t: subtitulo, c: 'plano__sub' },
  ].filter(Boolean);
  const inicio = cy - ((lineas.length - 1) * 20) / 2;
  return html`
    <a href="${enlace(id)}" class="plano__zona plano__zona--${s.categoria}" aria-label="${s.nombre}: ${s.detalle}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"></rect>
      ${lineas.map((l, i) => html`<text x="${cx}" y="${inicio + i * 20}" class="${l.c}">${l.t}</text>`)}
    </a>`;
};

const estante = (n, x) => {
  const s = buscarServicio(`estanteria-${n}`);
  return html`
    <a href="${enlace(s.id)}" class="plano__zona plano__zona--acervo" aria-label="${s.nombre}: ${s.detalle}">
      <rect x="${x}" y="415" width="38" height="141" rx="2"></rect>
      <text x="${x + 19}" y="486" class="plano__numero">${n}</text>
    </a>`;
};

const mesa = (cx, cy) => html`
  <a href="${enlace('mesas')}" class="plano__zona plano__zona--lectura" aria-label="Mesa de lectura">
    <circle cx="${cx}" cy="${cy}" r="20"></circle>
    <text x="${cx}" y="${cy}" class="plano__mesa">Mesa</text>
  </a>`;

const plano = () => html`
  <svg class="plano" viewBox="28 108 1224 798" role="group" aria-label="Plano de distribución de la biblioteca. Cada área es un enlace a su guía.">
    <rect class="plano__muro" x="34" y="114" width="1212" height="785"></rect>

    ${rect('oficinas', 36, 116, 132, 230, 'Oficinas', 'Administración')}
    ${rect('consulta', 170, 116, 158, 70, 'Colección de consulta')}
    ${rect('bano-hombres', 356, 116, 88, 70, 'Baño', 'Hombres')}
    ${rect('bano-mujeres', 605, 116, 88, 70, 'Baño', 'Mujeres')}
    ${rect('catalogo', 711, 116, 150, 70, 'Catálogo público', 'Clasificación de libros')}
    ${rect('eventos', 889, 116, 354, 128, 'Eventos y presentaciones', 'Talleres', { antetitulo: 'PLANTA ALTA' })}
    ${rect('ludoteca', 889, 244, 354, 128, 'Área infantil · Ludoteca', 'Juegos, libros y lectura', { antetitulo: 'PLANTA BAJA' })}
    <line class="plano__division" x1="889" y1="244" x2="1243" y2="244"></line>
    ${rect('salon-arguello', 250, 215, 575, 150, 'Salón Argüello', 'Área general (usuarios)', { rx: 75 })}

    <text x="313" y="404" class="plano__rotulo">Estanterías 1–3</text>
    <text x="730" y="404" class="plano__rotulo">Estanterías 5–7</text>
    ${estante(1, 223)}${estante(2, 294)}${estante(3, 365)}
    ${estante(5, 640)}${estante(6, 711)}${estante(7, 782)}

    <a href="${enlace('estanteria-4')}" class="plano__zona plano__zona--acervo plano__zona--arco" aria-label="Colegio bibliográfico: Estantería 4">
      <path d="M431 556V504a89 89 0 0 1 178 0v52h-22v-52a67 67 0 0 0-134 0v52z"></path>
      <text x="520" y="524" class="plano__numero">4</text>
      <text x="520" y="543" class="plano__sub plano__sub--fuerte">Colegio bibliográfico</text>
    </a>

    ${mesa(241, 603)}${mesa(312, 603)}${mesa(383, 603)}
    ${mesa(659, 603)}${mesa(730, 603)}${mesa(801, 603)}
    ${mesa(1090, 809)}

    ${rect('comics', 1076, 508, 167, 72, 'Área de cómics')}
    <text x="595" y="676" class="plano__circulacion">Circulación</text>

    ${rect('aula-trabajo', 36, 667, 159, 230, 'Aula de trabajo', 'Exposiciones, talleres, etc.')}
    ${rect('modulo-digital', 197, 739, 184, 158, 'Módulo digital', 'Computadoras')}
    ${rect('guardia', 410, 739, 78, 158, 'Guardia')}
    <g class="plano__entrada" aria-hidden="true">
      <rect x="534" y="810" width="123" height="87"></rect>
      <path d="M595 850v-14m-6 6 6-6 6 6"></path>
      <text x="595" y="866" class="plano__titulo">Entrada</text>
    </g>
    ${rect('recepcion', 712, 757, 167, 140, 'Recepción', 'Guardarropa')}
    ${rect('prestamo', 925, 721, 132, 176, ['Préstamo de', 'libros'])}
    ${rect('espacio-especial', 1125, 685, 118, 212, ['Espacio', 'especial'], 'Lectura de libros')}
  </svg>`;

const leyenda = () => html`
  <ul class="plano-leyenda" aria-label="Colores del plano">
    ${Object.entries(CATEGORIAS).map(([clave, nombre]) => html`
      <li><span class="plano-leyenda__muestra plano-leyenda__muestra--${clave}" aria-hidden="true"></span>${nombre}</li>`)}
  </ul>`;

export default {
  titulo: 'Áreas',
  render(contenedor) {
    pintar(contenedor, html`
      ${encabezadoPagina({
        titulo: 'Plano de la biblioteca',
        entrada: 'Toca un área del plano para ver de qué trata y cómo usarla paso a paso.',
      })}

      <section class="panel plano-panel" aria-labelledby="titulo-plano">
        <h2 id="titulo-plano" class="visualmente-oculto">Plano de distribución</h2>
        <div class="plano-contenedor">${plano()}</div>
        <p class="plano-ayuda">Croquis esquemático, sin escala. En el teléfono desliza el plano hacia los lados.</p>
        ${leyenda()}
      </section>

      <section class="seccion" aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" class="seccion__titulo">Todos los servicios</h2>
        <ul class="tarjetas">
          ${SERVICIOS.map((s) => html`<li>${tarjetaEnlace({
            href: enlace(s.id),
            icono: 'ubicacion',
            titulo: s.nombre,
            texto: s.detalle,
            accion: 'Ver guía',
          })}</li>`)}
        </ul>
      </section>`);
  },
};
