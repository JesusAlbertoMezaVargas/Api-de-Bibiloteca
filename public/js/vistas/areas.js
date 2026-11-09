import { html, pintar } from '../html.js';
import { CATEGORIAS, SERVICIOS, buscarServicio } from '../datos/servicios.js';
import { icono } from '../iconos.js';
import { alerta, encabezadoPagina, tarjetaEnlace } from '../ui.js';

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

    ${rect('oficinas', 36, 116, 132, 549, 'Oficinas', 'Administración')}
    ${rect('consulta', 170, 116, 158, 70, 'Colección de consulta')}
    ${rect('bano-hombres', 356, 116, 88, 70, 'Baño', 'Hombres')}
    ${rect('oficinas', 448, 116, 153, 70, 'Oficina', 'Servidores')}
    ${rect('bano-mujeres', 605, 116, 88, 70, 'Baño', 'Mujeres')}
    ${rect('catalogo', 700, 116, 100, 70, ['Catálogo', 'público'])}
    ${rect('salida-emergencia', 804, 116, 82, 70, ['Salida de', 'emergencia'])}
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

    ${rect('comics', 1076, 508, 88, 72, ['Área de', 'cómics'])}
    ${rect('oficinas', 1168, 508, 75, 72, 'Oficina')}
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

// Plano 2D: se queda para equipos sin WebGL o si la maqueta no pudo cargar.
const planoRespaldo = () => html`
  ${alerta('info', html`<p>Tu dispositivo no pudo mostrar la maqueta 3D, así que te mostramos el plano.</p>`)}
  <div class="plano-contenedor">${plano()}</div>
  <p class="plano-ayuda">Croquis esquemático, sin escala. En el teléfono desliza el plano hacia los lados.</p>
  ${leyenda()}`;

// Recorrido a la altura de los ojos: está completo en mapa3d/visor.js (modo 'recorrer'),
// pero todavía no se publica. Para mostrar el botón "Recorrer", cambia esto a true.
const RECORRIDO_ACTIVO = false;

const MODOS = [
  { clave: 'maqueta', texto: 'Maqueta' },
  { clave: 'planta', texto: 'Planta' },
  RECORRIDO_ACTIVO && { clave: 'recorrer', texto: 'Recorrer' },
].filter(Boolean);

const AYUDAS = {
  maqueta: 'Arrastra para girar, pellizca o usa la rueda para acercar. Toca un punto o un área.',
  planta: 'Arrastra para moverte y pellizca para acercar. Toca un punto o un área.',
  recorrer: 'Arrastra para mirar alrededor y toca el piso para caminar hasta ahí.',
};

const visor3d = () => html`
  <div class="visor" data-visor>
    <div class="visor__capa" data-marcadores></div>
    <p class="visor__carga" data-carga role="status">Armando la maqueta…</p>
    <div class="visor__arriba">
      <label class="visor__buscar">
        <span class="visualmente-oculto">Ir a un área</span>
        <select data-destino>
          <option value="">¿A dónde quieres ir?</option>
          ${Object.entries(CATEGORIAS).map(([clave, nombre]) => html`
            <optgroup label="${nombre}">
              ${SERVICIOS.filter((s) => s.categoria === clave).map((s) => html`<option value="${s.id}">${s.nombre}</option>`)}
            </optgroup>`)}
        </select>
      </label>
      <div class="visor__lado">
        <button type="button" class="visor__boton" data-ampliar aria-pressed="false">Ampliar</button>
        <button type="button" class="visor__boton" data-alta aria-pressed="true">Planta alta</button>
      </div>
    </div>
    <div class="visor__ficha" data-ficha hidden></div>
    <div class="visor__abajo">
      <div class="visor__modos" role="group" aria-label="Vista de la maqueta">
        ${MODOS.map((m) => html`<button type="button" class="visor__boton" data-modo="${m.clave}" aria-pressed="${m.clave === 'maqueta'}">${m.texto}</button>`)}
      </div>
    </div>
  </div>
  <p class="plano-ayuda" data-ayuda>${AYUDAS.maqueta}</p>`;

const ficha = (s) => html`
  ${s.fotos[0] ? html`<img class="visor__foto" src="${s.fotos[0].src}" alt="${s.fotos[0].alt}">` : ''}
  <div class="visor__texto">
    <h3 class="visor__titulo">${s.nombre}</h3>
    <p class="visor__detalle">${s.detalle}</p>
    <a class="boton boton--primario" href="${enlace(s.id)}">Ver guía${icono('flecha-der')}</a>
  </div>
  <button type="button" class="visor__cerrar" data-cerrar aria-label="Cerrar">×</button>`;

async function montarVisor(panel) {
  const visor = panel.querySelector('[data-visor]');
  const carga = panel.querySelector('[data-carga]');
  const fichaEl = panel.querySelector('[data-ficha]');
  const destino = panel.querySelector('[data-destino]');
  const ayuda = panel.querySelector('[data-ayuda]');
  const usarRespaldo = () => pintar(panel, planoRespaldo());

  try {
    // Three.js pesa: solo se descarga en esta página y después de pintar el resto.
    const { crearVisor } = await import('../mapa3d/visor.js');
    await document.fonts?.load('700 40px "Atkinson Hyperlegible"').catch(() => {});
    const maqueta = crearVisor(visor, panel.querySelector('[data-marcadores]'), {
      servicios: buscarServicio,
      alSeleccionar(id) {
        destino.value = id ?? '';
        fichaEl.hidden = !id;
        if (id) pintar(fichaEl, ficha(buscarServicio(id)));
      },
      alCambiarModo(modo) {
        panel.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
        panel.querySelector('[data-alta]').hidden = modo === 'recorrer';
        ayuda.textContent = AYUDAS[modo];
      },
      alCambiarAlta(visible) {
        panel.querySelector('[data-alta]').setAttribute('aria-pressed', String(visible));
      },
    });
    carga.hidden = true;

    visor.addEventListener('maqueta-perdida', usarRespaldo);
    destino.addEventListener('change', () => maqueta.seleccionar(destino.value || null));
    panel.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { maqueta.modo = b.dataset.modo; }));
    panel.querySelector('[data-alta]').addEventListener('click', () => { maqueta.altaVisible = !maqueta.altaVisible; });
    panel.querySelector('[data-ampliar]').addEventListener('click', (e) => {
      const ampliado = visor.classList.toggle('visor--completo');
      document.body.classList.toggle('sin-desplazar', ampliado);
      e.currentTarget.setAttribute('aria-pressed', String(ampliado));
      e.currentTarget.textContent = ampliado ? 'Reducir' : 'Ampliar';
    });
    fichaEl.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar]')) maqueta.limpiar(); });
  } catch (error) {
    console.error('No se pudo cargar la maqueta 3D', error);
    usarRespaldo();
  }
}

export default {
  titulo: 'Áreas',
  render(contenedor) {
    pintar(contenedor, html`
      ${encabezadoPagina({
        titulo: 'Maqueta de la biblioteca',
        entrada: 'Explora la biblioteca en 3D. Toca un área para ver de qué trata y cómo usarla paso a paso.',
      })}

      <section class="panel plano-panel" aria-labelledby="titulo-plano" data-maqueta>
        <h2 id="titulo-plano" class="visualmente-oculto">Maqueta 3D de la biblioteca</h2>
        ${visor3d()}
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
                    ${grupo.map((s) => html`<li>${tarjetaEnlace({ href: enlace(s.id), icono: 'ubicacion', titulo: s.nombre, texto: s.detalle, accion: 'Ver guía' })}</li>`)}
                  </ul>
                </div>
              </details>`;
          })}
        </div>
      </section>`);

    montarVisor(contenedor.querySelector('[data-maqueta]'));
  },
};
