import { html, pintar } from '../html.js';
import { icono } from '../iconos.js';
import { CATEGORIAS, buscarServicio } from '../datos/servicios.js';
import { alerta, avisar, encabezadoPagina } from '../ui.js';
import noEncontrada from './noEncontrada.js';

const VOLVER = { href: 'areas.html', texto: 'Plano' };

export default {
  titulo: 'Servicio',
  render(contenedor, contexto) {
    const servicio = buscarServicio(contexto.params.id);
    if (!servicio) {
      document.title = `${noEncontrada.titulo} · Biblioteca de la Alameda`;
      return noEncontrada.render(contenedor, contexto);
    }

    document.title = `${servicio.nombre} · Biblioteca de la Alameda`;
    pintar(contenedor, html`
      ${encabezadoPagina({ titulo: servicio.nombre, entrada: servicio.detalle, volver: VOLVER })}

      <div class="servicio">
        <article class="panel lectura">
          <p class="etiqueta etiqueta--${servicio.categoria}">${CATEGORIAS[servicio.categoria]}</p>

          <p class="dato">
            ${icono('ubicacion')}
            <span><span class="dato__etiqueta">Ubicación</span><span class="dato__valor">${servicio.ubicacion}</span></span>
          </p>

          ${servicio.nota ? alerta('construccion', html`<p>${servicio.nota}</p>`) : ''}

          <h2 class="panel__titulo">¿De qué trata?</h2>
          <p>${servicio.resumen}</p>

          <h2 class="panel__titulo">¿Qué puedes hacer aquí?</h2>
          <ul class="lista">${servicio.queHacer.map((q) => html`<li>${q}</li>`)}</ul>

          <h2 class="panel__titulo">Paso a paso</h2>
          <ol class="pasos">${servicio.pasos.map((p) => html`<li><span>${p}</span></li>`)}</ol>

          <div class="acciones">
            <button type="button" class="boton boton--primario boton--grande" data-escuchar>${icono('altavoz')}Escuchar los pasos</button>
          </div>
        </article>

        ${servicio.fotos.length ? html`
          <section class="galeria" aria-labelledby="titulo-fotos">
            <h2 id="titulo-fotos" class="panel__titulo">Fotos del área</h2>
            ${servicio.fotos.map((f) => html`
              <figure class="galeria__foto">
                <img src="${f.src}" alt="${f.alt}" loading="lazy" decoding="async">
                <figcaption>${f.alt}</figcaption>
              </figure>`)}
          </section>` : ''}
      </div>`);

    // TODO: leer servicio.pasos en voz alta (speechSynthesis, como en vistas/area.js).
    contenedor.querySelector('[data-escuchar]').addEventListener('click', () => {
      avisar('La lectura en voz alta estará disponible pronto.', 'info');
    });
    return undefined;
  },
};
