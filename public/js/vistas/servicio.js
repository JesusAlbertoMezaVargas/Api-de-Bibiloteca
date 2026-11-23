import { html, pintar } from '../html.js';
import { icono } from '../iconos.js';
import { obtenerPreferencias } from '../estado.js';
import { CATEGORIAS, buscarServicio, codigoQrServicio } from '../datos/servicios.js';
import { alerta, avisar, encabezadoPagina } from '../ui.js';
import noEncontrada from './noEncontrada.js';

const hayVoz = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const VOLVER = { href: 'areas.html', texto: 'Plano' };

function leerEnVozAlta(texto) {
  if (!hayVoz) return;
  window.speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = 'es-MX';
  frase.rate = obtenerPreferencias().velocidadVoz;
  window.speechSynthesis.speak(frase);
}

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
          <div class="servicio__cabecera">
            <p class="etiqueta etiqueta--${servicio.categoria}">${CATEGORIAS[servicio.categoria]}</p>
            ${hayVoz ? html`
              <div class="acciones">
                <button type="button" class="boton boton--primario" data-escuchar>${icono('altavoz')}Escuchar la guía</button>
                <button type="button" class="boton boton--secundario" data-detener>${icono('detener')}Detener</button>
              </div>` : ''}
          </div>

          <p class="dato">
            ${icono('ubicacion')}
            <span><span class="dato__etiqueta">Ubicación</span><span class="dato__valor">${servicio.ubicacion}</span></span>
          </p>

          <p class="dato">
            ${icono('qr')}
            <span>
              <span class="dato__etiqueta">Identificador QR del área</span>
              <code class="dato__valor" data-codigo-qr>${codigoQrServicio(servicio.id)}</code>
            </span>
            <button type="button" class="boton boton--secundario dato__copiar" data-copiar-codigo>Copiar código</button>
          </p>

          ${servicio.nota ? alerta('construccion', html`<p>${servicio.nota}</p>`) : ''}

          <h2 class="panel__titulo">¿De qué trata?</h2>
          <p>${servicio.resumen}</p>

          <h2 class="panel__titulo">¿Qué puedes hacer aquí?</h2>
          <ul class="lista">${servicio.queHacer.map((q) => html`<li>${q}</li>`)}</ul>

          <h2 class="panel__titulo">Paso a paso</h2>
          <ol class="pasos">${servicio.pasos.map((p) => html`<li><span>${p}</span></li>`)}</ol>
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

    const textoGuia = [
      servicio.nombre,
      servicio.detalle,
      servicio.ubicacion,
      servicio.resumen,
      'Qué puedes hacer aquí',
      ...servicio.queHacer,
      'Paso a paso',
      ...servicio.pasos,
      servicio.nota,
    ].filter(Boolean).join('. ');
    contenedor.querySelector('[data-escuchar]')?.addEventListener('click', () => {
      try {
        leerEnVozAlta(textoGuia);
      } catch {
        avisar('No se pudo iniciar la lectura en voz alta. Inténtalo de nuevo.', 'error');
      }
    });
    contenedor.querySelector('[data-detener]')?.addEventListener('click', () => window.speechSynthesis.cancel());
    if (hayVoz && obtenerPreferencias().audioAutomatico) {
      try {
        leerEnVozAlta(textoGuia);
      } catch {
        avisar('No se pudo iniciar la lectura en voz alta.', 'error');
      }
    }
    window.addEventListener('pagehide', () => {
      if (hayVoz) window.speechSynthesis.cancel();
    }, { once: true });
    contenedor.querySelector('[data-copiar-codigo]').addEventListener('click', async (evento) => {
      const boton = evento.currentTarget;
      const codigo = codigoQrServicio(servicio.id);
      try {
        await navigator.clipboard.writeText(codigo);
        boton.textContent = 'Código copiado';
      } catch {
        avisar(`Código: ${codigo}`, 'info');
      }
    });
    return undefined;
  },
};
