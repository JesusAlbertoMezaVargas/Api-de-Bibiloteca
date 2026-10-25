import { html, pintar } from '../html.js';
import { icono } from '../iconos.js';
import { encabezadoPagina } from '../ui.js';

export default {
  titulo: 'Página no encontrada',
  render(contenedor) {
    pintar(contenedor, html`
      ${encabezadoPagina({
        titulo: 'No encontramos esta página',
        entrada: 'Puede que el enlace esté incompleto o que la sección haya cambiado de lugar.',
      })}
      <a class="boton boton--primario" href="index.html">${icono('inicio')}Volver al inicio</a>`);
  },
};
