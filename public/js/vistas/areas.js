import { html, pintar } from '../html.js';
import { api } from '../api.js';
import { alerta, encabezadoPagina, mostrarCargando, mostrarError, tarjetaEnlace } from '../ui.js';

export default {
  titulo: 'Áreas',
  async render(contenedor) {
    pintar(contenedor, html`
      ${encabezadoPagina({
        titulo: 'Áreas de la biblioteca',
        entrada: 'Elige un área para ver dónde está y cómo usar sus servicios.',
      })}
      <div data-lista></div>`);
    const lista = contenedor.querySelector('[data-lista]');

    const cargar = async () => {
      mostrarCargando(lista, 'Cargando áreas…');
      try {
        const datos = await api.areas();
        const areas = datos?.areas ?? datos ?? [];
        if (!areas.length) {
          pintar(lista, alerta('info', html`<p>Aún no hay áreas registradas.</p>`));
          return;
        }
        pintar(lista, html`
          <ul class="tarjetas">
            ${areas.map((a) => html`<li>${tarjetaEnlace({
              href: `#/areas/${encodeURIComponent(a.id)}`,
              icono: 'ubicacion',
              titulo: a.nombre,
              texto: a.descripcion,
              accion: 'Ver guía',
              nivel: 2,
            })}</li>`)}
          </ul>`);
      } catch (error) {
        mostrarError(lista, error, { reintentar: cargar });
      }
    };
    await cargar();
  },
};
