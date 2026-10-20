import { html, pintar } from '../html.js';
import { api } from '../api.js';
import { icono } from '../iconos.js';
import { obtenerPreferencias } from '../estado.js';
import { encabezadoPagina, mostrarCargando, mostrarError } from '../ui.js';

const hayVoz = 'speechSynthesis' in window;
const VOLVER = { href: '#/areas', texto: 'Áreas' };

function leerEnVozAlta(texto) {
  if (!hayVoz) return;
  speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = 'es-MX';
  frase.rate = obtenerPreferencias().velocidadVoz;
  speechSynthesis.speak(frase);
}

export default {
  titulo: 'Guía del área',
  async render(contenedor, { params }) {
    mostrarCargando(contenedor, 'Cargando guía…', { forma: 'texto' });

    let area;
    try {
      const datos = await api.area(params.id);
      area = datos?.area ?? datos;
      if (!area?.nombre) throw new Error('La guía de esta área no está disponible.');
    } catch (error) {
      pintar(contenedor, html`${encabezadoPagina({ titulo: 'Guía del área', volver: VOLVER })}<div data-error></div>`);
      mostrarError(contenedor.querySelector('[data-error]'), error);
      return undefined;
    }

    const pasos = Array.isArray(area.pasos) ? area.pasos : [];
    document.title = `${area.nombre} · Biblioteca de la Alameda`;
    pintar(contenedor, html`
      ${encabezadoPagina({ titulo: area.nombre, entrada: area.descripcion, volver: VOLVER })}

      <article class="panel lectura">
        ${area.ubicacion ? html`
          <p class="dato">
            ${icono('ubicacion')}
            <span><span class="dato__etiqueta">Ubicación</span><span class="dato__valor">${area.ubicacion}</span></span>
          </p>` : ''}

        ${pasos.length ? html`
          <h2 class="panel__titulo">Cómo usar esta área</h2>
          <ol class="pasos">${pasos.map((p) => html`<li><span>${p}</span></li>`)}</ol>` : ''}

        ${hayVoz ? html`
          <div class="acciones">
            <button type="button" class="boton boton--primario" data-escuchar>${icono('altavoz')}Escuchar guía</button>
            <button type="button" class="boton boton--secundario" data-detener>${icono('detener')}Detener</button>
          </div>` : ''}
      </article>`);

    const textoGuia = [area.nombre, area.ubicacion, area.descripcion, ...pasos].filter(Boolean).join('. ');
    contenedor.querySelector('[data-escuchar]')?.addEventListener('click', () => leerEnVozAlta(textoGuia));
    contenedor.querySelector('[data-detener]')?.addEventListener('click', () => speechSynthesis.cancel());
    if (obtenerPreferencias().audioAutomatico) leerEnVozAlta(textoGuia);

    // Registro de uso: si falla no debe interrumpir la lectura de la guía.
    api.registrarUsoGuia(params.id).catch(() => {});

    // Al salir de la vista se detiene la lectura.
    return () => { if (hayVoz) speechSynthesis.cancel(); };
  },
};
