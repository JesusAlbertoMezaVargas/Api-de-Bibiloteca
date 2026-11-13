import { html, pintar } from '../html.js';
import { api } from '../api.js';
import { establecerUsuario, obtenerPreferencias } from '../estado.js';
import {
  conEnvio, encabezadoPagina, enfocarPrimerError, limpiarErrores, marcarError, mostrarErroresDeApi,
} from '../ui.js';
import { REQUISITOS_PASSWORD, validarCorreo, validarNombre, validarPasswordNueva } from '../validacion.js';

export default {
  titulo: 'Crear cuenta',
  render(contenedor, { navegar }) {
    pintar(contenedor, html`
      ${encabezadoPagina({
        titulo: 'Crear cuenta',
        entrada: 'Solo necesitas tu nombre, un correo y una contraseña.',
        volver: { href: 'cuenta.html', texto: 'Iniciar sesión' },
      })}

      <form class="formulario" novalidate>
        <div class="campo">
          <label for="nombre">Nombre</label>
          <input id="nombre" name="nombre" type="text" autocomplete="name" required maxlength="80" aria-describedby="nombre-error">
          <p id="nombre-error" class="campo__error" data-error-de="nombre"></p>
        </div>
        <div class="campo">
          <label for="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="email-error">
          <p id="email-error" class="campo__error" data-error-de="email"></p>
        </div>
        <div class="campo">
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="15"
                 aria-describedby="password-ayuda password-error">
          <div id="password-ayuda" class="campo__ayuda">
            <span>Tu contraseña necesita:</span>
            <ul class="requisitos">
              ${REQUISITOS_PASSWORD.map((r) => html`<li data-requisito="${r.clave}">${r.texto}<span class="visualmente-oculto" data-estado></span></li>`)}
            </ul>
          </div>
          <p id="password-error" class="campo__error" data-error-de="password"></p>
        </div>
        <p class="campo__error" data-error-general role="alert"></p>
        <button type="submit" class="boton boton--primario boton--bloque">Crear cuenta</button>
      </form>`);

    const formulario = contenedor.querySelector('form');

    // Cada requisito se marca como cumplido conforme se escribe (con texto para lectores de pantalla).
    formulario.elements.password.addEventListener('input', (e) => {
      for (const r of REQUISITOS_PASSWORD) {
        const item = formulario.querySelector(`[data-requisito="${r.clave}"]`);
        const cumple = r.cumple(e.target.value);
        item.classList.toggle('requisitos__item--cumple', cumple);
        item.querySelector('[data-estado]').textContent = cumple ? ': cumplido' : ': pendiente';
      }
    });

    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();
      limpiarErrores(formulario);
      const datos = {
        nombre: formulario.elements.nombre.value.trim(),
        email: formulario.elements.email.value.trim(),
        password: formulario.elements.password.value,
      };

      const errores = {
        nombre: validarNombre(datos.nombre),
        email: validarCorreo(datos.email),
        password: validarPasswordNueva(datos.password),
      };
      let hayErrores = false;
      for (const [campo, mensaje] of Object.entries(errores)) {
        if (mensaje) { marcarError(formulario, campo, mensaje); hayErrores = true; }
      }
      if (hayErrores) return enfocarPrimerError(formulario);

      try {
        const respuesta = await conEnvio(formulario, () => api.registro(datos));
        establecerUsuario(respuesta?.usuario ?? respuesta);
        // La cuenta nace con ajustes por defecto: se le suben los que ya se eligieron en este dispositivo.
        await api.guardarPreferencias(obtenerPreferencias()).catch(() => {});
        navegar('index.html', 'Cuenta creada. ¡Te damos la bienvenida!');
      } catch (error) {
        mostrarErroresDeApi(formulario, error);
      }
    });
  },
};
