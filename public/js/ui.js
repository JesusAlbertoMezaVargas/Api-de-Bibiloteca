// Piezas de interfaz compartidas por las vistas: encabezados, tarjetas, estados de carga
// y error, avisos y errores de formulario.
import { html, pintar } from './html.js';
import { icono } from './iconos.js';

/** Encabezado de página: enlace para volver (opcional), título y texto de entrada. */
export const encabezadoPagina = ({ titulo, entrada, volver }) => html`
  <header class="encabezado-pagina">
    ${volver ? html`<a class="volver" href="${volver.href}">${icono('flecha-izq')}${volver.texto}</a>` : ''}
    <h1>${titulo}</h1>
    ${entrada ? html`<p class="entrada">${entrada}</p>` : ''}
  </header>`;

/** Tarjeta que lleva a otra sección. `nivel` es el nivel de encabezado del título (2 o 3). */
export const tarjetaEnlace = ({ href, icono: nombreIcono, titulo, texto, accion = 'Abrir', nivel = 3 }) => html`
  <a class="tarjeta" href="${href}">
    ${nombreIcono ? html`<span class="tarjeta__icono">${icono(nombreIcono)}</span>` : ''}
    ${nivel === 2 ? html`<h2 class="tarjeta__titulo">${titulo}</h2>` : html`<h3 class="tarjeta__titulo">${titulo}</h3>`}
    ${texto ? html`<p class="tarjeta__texto">${texto}</p>` : ''}
    <span class="tarjeta__ir" aria-hidden="true">${accion}${icono('flecha-der')}</span>
  </a>`;

/** Alerta con icono y texto (el estado no depende solo del color). */
export const alerta = (tipo, contenido, { rol } = {}) => {
  const iconoDe = { info: 'info', exito: 'exito', error: 'alerta', construccion: 'info' };
  return html`
    <div class="alerta alerta--${tipo}" ${rol ? html`role="${rol}"` : ''}>
      ${icono(iconoDe[tipo])}
      <div class="alerta__cuerpo">${contenido}</div>
    </div>`;
};

/** Esqueleto de carga con la forma aproximada del contenido que viene. */
export function mostrarCargando(contenedor, texto = 'Cargando…', { forma = 'tarjetas' } = {}) {
  const bloques = forma === 'texto'
    ? html`<div class="esqueleto esqueleto--titulo"></div>
           <div class="esqueleto esqueleto--linea"></div>
           <div class="esqueleto esqueleto--linea"></div>
           <div class="esqueleto esqueleto--linea esqueleto--corta"></div>`
    : html`<div class="tarjetas">
             <div class="esqueleto esqueleto--tarjeta"></div>
             <div class="esqueleto esqueleto--tarjeta"></div>
             <div class="esqueleto esqueleto--tarjeta"></div>
           </div>`;
  pintar(contenedor, html`
    <div aria-busy="true">
      <p class="visualmente-oculto" role="status">${texto}</p>
      ${bloques}
    </div>`);
}

/** El endpoint todavía no se implementa (501). */
const enConstruccion = (error) => error?.status === 501;

/** Mensaje que dice qué pasó y qué hacer. */
export function mensajeDeError(error) {
  if (enConstruccion(error)) return 'Esta sección todavía está en construcción. Pronto estará disponible.';
  if (error?.status === 429) return 'Hiciste demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  return error?.message || 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

export function mostrarError(contenedor, error, { reintentar } = {}) {
  const construccion = enConstruccion(error);
  pintar(contenedor, alerta(construccion ? 'construccion' : 'error', html`
    <p>${mensajeDeError(error)}</p>
    ${reintentar && !construccion ? html`<button type="button" class="boton boton--secundario" data-reintentar>Intentar de nuevo</button>` : ''}`,
  { rol: construccion ? 'status' : 'alert' }));
  contenedor.querySelector('[data-reintentar]')?.addEventListener('click', reintentar);
}

/** Aviso breve (toast) que los lectores de pantalla anuncian por la región aria-live. */
export function avisar(mensaje, tipo = 'exito') {
  const zona = document.getElementById('avisos');
  const plantilla = document.createElement('template');
  plantilla.innerHTML = String(alerta(tipo, html`<p>${mensaje}</p>`));
  const aviso = plantilla.content.firstElementChild;
  zona.append(aviso);
  setTimeout(() => aviso.remove(), 5000);
}

/** Limpia los errores visibles de un formulario. */
export function limpiarErrores(formulario) {
  formulario.querySelectorAll('[aria-invalid]').forEach((c) => c.removeAttribute('aria-invalid'));
  formulario.querySelectorAll('.campo__error').forEach((e) => { e.textContent = ''; });
}

/** Marca un campo con error. El mensaje se asocia con aria-describedby en la plantilla. */
export function marcarError(formulario, nombre, mensaje) {
  const campo = formulario.elements.namedItem(nombre);
  const salida = formulario.querySelector(`[data-error-de="${nombre}"]`);
  if (campo && salida) {
    campo.setAttribute('aria-invalid', 'true');
    salida.textContent = mensaje;
    return true;
  }
  return false;
}

/**
 * Lleva los errores de validación de la API ({ campo: 'body.email', mensaje }) a cada campo;
 * lo que no corresponde a un campo se muestra como error general.
 */
export function mostrarErroresDeApi(formulario, error) {
  limpiarErrores(formulario);
  let ubicados = 0;
  for (const d of error?.details ?? []) {
    const nombre = String(d.campo || '').split('.').pop();
    if (marcarError(formulario, nombre, d.mensaje)) ubicados += 1;
  }
  const general = formulario.querySelector('[data-error-general]');
  if (general && ubicados === 0) general.textContent = mensajeDeError(error);
  enfocarPrimerError(formulario);
}

export function enfocarPrimerError(formulario) {
  formulario.querySelector('[aria-invalid="true"]')?.focus();
}

/** Desactiva el botón de envío mientras se espera a la API. */
export async function conEnvio(formulario, accion) {
  const boton = formulario.querySelector('[type="submit"]');
  const texto = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Enviando…';
  try {
    return await accion();
  } finally {
    boton.disabled = false;
    boton.textContent = texto;
  }
}
