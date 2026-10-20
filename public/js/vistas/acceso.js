import { html, pintar } from '../html.js';
import { api } from '../api.js';
import {
  avisar, conEnvio, encabezadoPagina, enfocarPrimerError, limpiarErrores, marcarError, mostrarErroresDeApi,
} from '../ui.js';

export default {
  titulo: 'Acceso con QR',
  render(contenedor, { consulta, navegar }) {
    pintar(contenedor, html`
      ${encabezadoPagina({
        titulo: 'Acceso con código QR',
        entrada: 'Escanea con la cámara de tu teléfono el código QR de la entrada. Si no puedes, escribe el código que aparece debajo de él.',
      })}

      <div class="dividido">
        <form class="formulario" novalidate>
          <div class="campo">
            <label for="codigo">Código de acceso</label>
            <input id="codigo" name="codigo" type="text" autocomplete="off" autocapitalize="characters"
                   required minlength="8" maxlength="200" aria-describedby="codigo-ayuda codigo-error">
            <span id="codigo-ayuda" class="campo__ayuda">Tiene al menos 8 caracteres.</span>
            <p id="codigo-error" class="campo__error" data-error-de="codigo"></p>
          </div>
          <p class="campo__error" data-error-general role="alert"></p>
          <button type="submit" class="boton boton--primario boton--bloque">Validar acceso</button>
        </form>

        <aside class="panel lectura" aria-labelledby="titulo-ayuda-qr">
          <h2 id="titulo-ayuda-qr" class="panel__titulo">¿Dónde está el código?</h2>
          <ol class="pasos">
            <li><span>Busca el cartel con el código QR en la entrada de la biblioteca.</span></li>
            <li><span>Abre la cámara de tu teléfono y apúntala al código.</span></li>
            <li><span>Toca el enlace que aparece. Si no aparece, escribe aquí el código impreso.</span></li>
          </ol>
        </aside>
      </div>`);

    const formulario = contenedor.querySelector('form');

    const validar = async (codigo) => {
      limpiarErrores(formulario);
      if (codigo.length < 8) {
        marcarError(formulario, 'codigo', 'El código del QR no es válido.');
        enfocarPrimerError(formulario);
        return;
      }
      try {
        await conEnvio(formulario, () => api.validarQr(codigo));
        avisar('Acceso validado. ¡Te damos la bienvenida!');
        navegar('/areas');
      } catch (error) {
        mostrarErroresDeApi(formulario, error);
      }
    };

    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      validar(formulario.elements.codigo.value.trim());
    });

    // El QR puede abrir directamente #/acceso?codigo=XXXX
    const codigoEnEnlace = consulta.get('codigo');
    if (codigoEnEnlace) {
      formulario.elements.codigo.value = codigoEnEnlace;
      validar(codigoEnEnlace.trim());
    }
  },
};
