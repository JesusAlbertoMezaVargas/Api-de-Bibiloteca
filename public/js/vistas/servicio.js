import { html, pintar } from '../html.js';
import { icono } from '../iconos.js';
import { CATEGORIAS, buscarServicio } from '../datos/servicios.js';
import { api } from '../api.js';
import { obtenerPreferencias } from '../estado.js';
import { alerta, avisar, encabezadoPagina } from '../ui.js';
import noEncontrada from './noEncontrada.js';

const VOLVER = { href: 'areas.html', texto: 'Plano' };
const hayVoz = 'speechSynthesis' in window;

export default {
  titulo: 'Servicio',
  async render(contenedor, contexto) {
    const contenidoLocal = buscarServicio(contexto.params.id);
    if (!contenidoLocal) {
      document.title = `${noEncontrada.titulo} · Biblioteca de la Alameda`;
      return noEncontrada.render(contenedor, contexto);
    }

    let servicio = contenidoLocal;
    try {
      const respuesta = await api.area(contenidoLocal.id);
      const contenidoRedis = respuesta?.area;
      if (contenidoRedis?.nombre) {
        servicio = {
          ...contenidoLocal,
          nombre: contenidoRedis.nombre,
          detalle: contenidoRedis.descripcion || contenidoLocal.detalle,
          resumen: contenidoRedis.descripcion || contenidoLocal.resumen,
          pasos: contenidoRedis.pasos?.length
            ? contenidoRedis.pasos.map((paso) => paso.texto || paso)
            : contenidoLocal.pasos,
        };
      }
    } catch {
      // El contenido incluido con el sitio permite leer la guía si Redis no responde.
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

          ${hayVoz ? html`<div class="acciones">
            <button type="button" class="boton boton--primario boton--grande" data-escuchar>${icono('altavoz')}Escuchar los pasos</button>
            <button type="button" class="boton boton--secundario" data-detener>${icono('detener')}Detener</button>
          </div>` : ''}
          <div class="acciones">
            <button type="button" class="boton boton--secundario" data-finalizar>Marcar guía como terminada</button>
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

    api.registrarUsoGuia(servicio.id).catch(() => {});
    contenedor.querySelector('[data-escuchar]')?.addEventListener('click', () => {
      speechSynthesis.cancel();
      const frase = new SpeechSynthesisUtterance(servicio.pasos.join('. '));
      frase.lang = 'es-MX';
      frase.rate = obtenerPreferencias().velocidadVoz;
      speechSynthesis.speak(frase);
      api.registrarUsoAudio(servicio.id).catch(() => {});
    });
    contenedor.querySelector('[data-detener]')?.addEventListener('click', () => speechSynthesis.cancel());
    contenedor.querySelector('[data-finalizar]').addEventListener('click', async (evento) => {
      const boton = evento.currentTarget;
      boton.disabled = true;
      try {
        await api.registrarFinalizacion(servicio.id);
        boton.textContent = 'Guía terminada';
      } catch {
        boton.disabled = false;
        avisar('No se pudo registrar que terminaste la guía. Inténtalo de nuevo.', 'error');
      }
    });
    return undefined;
  },
};
