import { html, pintar } from '../html.js';
import { api } from '../api.js';
import { icono } from '../iconos.js';
import { establecerUsuario, obtenerUsuario } from '../estado.js';
import {
  conEnvio, encabezadoPagina, enfocarPrimerError, limpiarErrores, marcarError, mostrarErroresDeApi,
} from '../ui.js';
import { validarCorreo } from '../validacion.js';

function pintarSesion(contenedor, usuario, navegar) {
  pintar(contenedor, html`
    ${encabezadoPagina({ titulo: 'Mi cuenta', entrada: 'Consulta tus datos y tus ajustes de lectura.' })}
    <section class="panel lectura" aria-labelledby="titulo-datos">
      <h2 id="titulo-datos" class="panel__titulo">Tus datos</h2>
      <p class="dato">
        ${icono('cuenta')}
        <span><span class="dato__etiqueta">Nombre</span><span class="dato__valor">${usuario.nombre}</span></span>
      </p>
      <p><strong>Correo:</strong> ${usuario.email}</p>
      <div class="acciones">
        <a class="boton boton--secundario" href="preferencias.html">${icono('ajustes')}Mis ajustes</a>
        <button type="button" class="boton boton--primario" data-salir>${icono('salir')}Cerrar sesión</button>
      </div>
    </section>`);

  contenedor.querySelector('[data-salir]').addEventListener('click', async () => {
    try {
      await api.logout();
    } catch {
      /* aunque falle, se limpia la sesión local */
    }
    establecerUsuario(null);
    navegar('index.html', 'Cerraste sesión.');
  });
}

function pintarLogin(contenedor, navegar) {
  pintar(contenedor, html`
    ${encabezadoPagina({
      titulo: 'Iniciar sesión',
      entrada: 'Con una cuenta, tus ajustes de lectura te acompañan en cualquier dispositivo.',
    })}

    <div class="dividido">
      <form class="formulario" novalidate>
        <div class="campo">
          <label for="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="email-error">
          <p id="email-error" class="campo__error" data-error-de="email"></p>
        </div>
        <div class="campo">
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required maxlength="72" aria-describedby="password-error">
          <p id="password-error" class="campo__error" data-error-de="password"></p>
        </div>
        <p class="campo__error" data-error-general role="alert"></p>
        <button type="submit" class="boton boton--primario boton--bloque">Entrar</button>
        <p class="formulario__pie">¿No tienes cuenta? <a href="registro.html">Crea una</a></p>
      </form>

      <aside class="panel lectura" aria-labelledby="titulo-sin-cuenta">
        <h2 id="titulo-sin-cuenta" class="panel__titulo">¿Necesito una cuenta?</h2>
        <p>No. Puedes consultar las áreas y sus guías sin registrarte.</p>
        <p>La cuenta solo sirve para guardar tus ajustes de lectura y usarlos en cualquier teléfono.</p>
      </aside>
    </div>`);

  const formulario = contenedor.querySelector('form');
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores(formulario);
    const email = formulario.elements.email.value.trim();
    const password = formulario.elements.password.value;

    const errorCorreo = validarCorreo(email);
    if (errorCorreo) marcarError(formulario, 'email', errorCorreo);
    if (!password) marcarError(formulario, 'password', 'Escribe tu contraseña.');
    if (errorCorreo || !password) return enfocarPrimerError(formulario);

    try {
      const datos = await conEnvio(formulario, () => api.login({ email, password }));
      establecerUsuario(datos?.usuario ?? datos);
      navegar('index.html', 'Sesión iniciada.');
    } catch (error) {
      mostrarErroresDeApi(formulario, error);
    }
  });
}

export default {
  titulo: 'Cuenta',
  render(contenedor, { navegar }) {
    const usuario = obtenerUsuario();
    if (usuario) pintarSesion(contenedor, usuario, navegar);
    else pintarLogin(contenedor, navegar);
  },
};
