import { html, pintar } from '../html.js';
import { api } from '../api.js';
import { establecerUsuario } from '../estado.js';
import {
  conEnvio, encabezadoPagina, enfocarPrimerError, limpiarErrores, marcarError, mostrarErroresDeApi,
} from '../ui.js';
import { validarCorreo, validarNombre, validarPasswordNueva } from '../validacion.js';

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
                 aria-describedby="password-ayuda password-requisitos password-error">
          <span id="password-ayuda" class="campo__ayuda">Entre 8 y 15 caracteres, con una combinación segura.</span>
          <ul id="password-requisitos" class="requisitos-password" aria-label="Requisitos de la contraseña">
            <li data-regla="longitud">8–15 caracteres</li>
            <li data-regla="minuscula">Una letra minúscula</li>
            <li data-regla="mayuscula">Una letra mayúscula</li>
            <li data-regla="numero">Un número</li>
            <li data-regla="especial">Un carácter especial (*, # o @)</li>
          </ul>
          <p id="password-error" class="campo__error" data-error-de="password"></p>
        </div>
        <p class="campo__error" data-error-general role="alert"></p>
        <button type="submit" class="boton boton--primario boton--bloque">Crear cuenta</button>
      </form>`);

    const formulario = contenedor.querySelector('form');
    const password = formulario.elements.password;
    const requisitos = {
      longitud: (valor) => valor.length >= 8 && valor.length <= 15,
      minuscula: (valor) => /[a-z]/.test(valor),
      mayuscula: (valor) => /[A-Z]/.test(valor),
      numero: (valor) => /[0-9]/.test(valor),
      especial: (valor) => /[^A-Za-z0-9\s]/.test(valor),
    };
    password.addEventListener('input', () => {
      for (const [regla, cumple] of Object.entries(requisitos)) {
        const elemento = formulario.querySelector(`[data-regla="${regla}"]`);
        elemento.classList.toggle('requisitos-password__cumplido', cumple(password.value));
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
        navegar('index.html', 'Cuenta creada. ¡Te damos la bienvenida!');
      } catch (error) {
        mostrarErroresDeApi(formulario, error);
      }
    });
  },
};
