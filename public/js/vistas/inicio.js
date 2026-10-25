import { html, pintar } from '../html.js';
import { icono } from '../iconos.js';
import { obtenerUsuario } from '../estado.js';
import { tarjetaEnlace } from '../ui.js';

const ACCESOS = [
  { href: 'areas.html', icono: 'mapa', titulo: 'Áreas y guías', texto: 'Conoce las salas y los servicios, y sigue la guía paso a paso.', accion: 'Ver áreas' },
  { href: 'acceso.html', icono: 'qr', titulo: 'Acceso con QR', texto: 'Escanea o escribe el código de la entrada para activar tu pase.', accion: 'Validar acceso' },
  { href: 'preferencias.html', icono: 'ajustes', titulo: 'Ajustes de lectura', texto: 'Letra más grande, alto contraste y lectura en voz alta.', accion: 'Ajustar' },
];

export default {
  titulo: '',
  render(contenedor) {
    const usuario = obtenerUsuario();
    pintar(contenedor, html`
      <section class="hero" aria-labelledby="titulo-inicio">
        <p class="hero__antetitulo">Guía de servicios</p>
        <h1 id="titulo-inicio" class="hero__titulo">${usuario?.nombre ? `Hola, ${usuario.nombre}` : 'Te damos la bienvenida a la biblioteca'}</h1>
        <p class="hero__texto">Encuentra las áreas de la Biblioteca de la Alameda y aprende a usar sus servicios desde tu teléfono.</p>
        <div class="acciones">
          <a class="boton boton--primario boton--grande" href="areas.html">${icono('mapa')}Explorar áreas</a>
          ${usuario ? '' : html`<a class="boton boton--secundario boton--grande" href="cuenta.html">Iniciar sesión</a>`}
        </div>
      </section>

      <section class="seccion" aria-labelledby="titulo-accesos">
        <h2 id="titulo-accesos" class="seccion__titulo">¿Qué quieres hacer?</h2>
        <ul class="tarjetas">
          ${ACCESOS.map((a) => html`<li>${tarjetaEnlace(a)}</li>`)}
        </ul>
      </section>`);
  },
};
