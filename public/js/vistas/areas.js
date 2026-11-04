import { html, pintar } from '../html.js';
import { CATEGORIAS, SERVICIOS, buscarServicio } from '../datos/servicios.js';
import { encabezadoPagina, tarjetaEnlace } from '../ui.js';

// Plano de la biblioteca. Las coordenadas siguen el croquis original (sin escala).
// Cada figura es un enlace a la guía de su servicio: servicio.html?id=<id>.
const enlace = (id) => `servicio.html?id=${encodeURIComponent(id)}`;

const rect = (id, x, y, w, h, titulo, subtitulo, { antetitulo, rx = 10 } = {}) => {
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
      <rect x="${x}" y="415" width="38" height="141" rx="5"></rect>
      <path class="plano__repisas" d="M${x + 5} 437h28m-28 19h28m-28 19h28m-28 19h28m-28 19h28m-28 19h28"></path>
      <rect class="plano__placa-estante" x="${x + 6}" y="477" width="26" height="22" rx="7"></rect>
      <text x="${x + 19}" y="488" class="plano__numero">${n}</text>
    </a>`;
};

const mesa = (cx, cy) => html`
  <a href="${enlace('mesas')}" class="plano__zona plano__zona--lectura" aria-label="Mesa de lectura">
    <circle class="plano__silla" cx="${cx - 17}" cy="${cy - 14}" r="5"></circle>
    <circle class="plano__silla" cx="${cx + 17}" cy="${cy - 14}" r="5"></circle>
    <circle class="plano__silla" cx="${cx - 17}" cy="${cy + 14}" r="5"></circle>
    <circle class="plano__silla" cx="${cx + 17}" cy="${cy + 14}" r="5"></circle>
    <rect class="plano__mesa-superficie" x="${cx - 15}" y="${cy - 11}" width="30" height="22" rx="7"></rect>
    <text x="${cx}" y="${cy}" class="plano__mesa">Mesa</text>
  </a>`;

const plano = () => html`
  <svg class="plano" viewBox="28 108 1224 798" role="group" aria-label="Plano de distribución de la biblioteca. Cada área es un enlace a su guía.">
    <defs>
      <filter id="plano-sombra" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#13233a" flood-opacity=".14" />
      </filter>
      <pattern id="plano-grano" width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r=".55" fill="#fff" opacity=".28" />
      </pattern>
    </defs>
    <rect class="plano__muro" x="34" y="114" width="1212" height="785" rx="18"></rect>
    <rect x="34" y="114" width="1212" height="785" rx="18" fill="url(#plano-grano)" aria-hidden="true"></rect>

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
        <div class="plano-panel__cabecera">
          <div>
            <span class="plano-panel__etiqueta">Biblioteca de la Alameda</span>
            <h2 id="titulo-plano">Mapa del edificio</h2>
          </div>
        </div>
        <div class="plano-marco">
          <div class="plano-marco__barra" aria-hidden="true">
            <span>Planta general</span>
            <span>Seleccione un área</span>
          </div>
          <div class="plano-contenedor">
            <span class="plano-norte" aria-hidden="true"><span>N</span>↑</span>
            ${plano()}
          </div>
        </div>
        <div class="plano-inferior">
          <p class="plano-ayuda"><span aria-hidden="true">↔</span> Selecciona un área para consultar su ubicación y guía.</p>
          <span class="plano-inferior__escala">Plano esquemático · sin escala</span>
        </div>
        ${leyenda()}
      </section>

      <section class="seccion" aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" class="seccion__titulo">Todos los servicios</h2>
        <div class="servicios-grupos">
          ${Object.entries(CATEGORIAS).map(([clave, nombre]) => {
            const grupo = SERVICIOS.filter((s) => s.categoria === clave);
            if (!grupo.length) return '';
            return html`
              <details class="servicios-grupo servicios-grupo--${clave}">
                <summary class="servicios-grupo__cabecera">
                  <span class="servicios-grupo__indicador" aria-hidden="true"></span>
                  <span class="servicios-grupo__titulo">${nombre}</span>
                  <span class="servicios-grupo__cantidad">${grupo.length} ${grupo.length === 1 ? 'servicio' : 'servicios'}</span>
                  <span class="servicios-grupo__flecha" aria-hidden="true">›</span>
                </summary>
                <div class="servicios-grupo__contenido">
                  <ul class="tarjetas">
                    ${grupo.map((s) => html`<li>${tarjetaEnlace({
                      href: enlace(s.id),
                      icono: 'ubicacion',
                      titulo: s.nombre,
                      texto: s.detalle,
                      accion: 'Ver guía',
                    })}</li>`)}
                  </ul>
                </div>
              </details>`;
          })}
        </div>
      </section>`);
  },
};
