import { html, pintar } from '../html.js';
import { api } from '../api.js';
import { icono } from '../iconos.js';
import {
  alerta, conEnvio, encabezadoPagina, enfocarPrimerError, limpiarErrores, marcarError, mostrarErroresDeApi,
} from '../ui.js';
import { crearEscanerQr, problemaDeSoporte } from '../qr/escaner.js';
import { onQrLeido } from '../qr/onQrLeido.js';

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
          <div class="escaner">
            <button type="button" class="boton boton--secundario boton--bloque" data-escanear>${icono('qr')}Escanear QR</button>
            <div class="escaner__visor" data-visor hidden>
              <div class="escaner__marco">
                <video class="escaner__video" playsinline muted autoplay aria-label="Vista de la cámara"></video>
                <div class="escaner__guia" aria-hidden="true"></div>
              </div>
              <p class="escaner__estado" data-estado role="status"></p>
              <button type="button" class="boton boton--secundario boton--bloque" data-cancelar>Cerrar cámara</button>
            </div>
            <div data-mensaje-escaner></div>
            <p class="escaner__o" aria-hidden="true"><span>o escribe el código</span></p>
          </div>

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
        navegar('areas.html', 'Acceso validado. ¡Te damos la bienvenida!');
      } catch (error) {
        mostrarErroresDeApi(formulario, error);
      }
    };

    // --- Escáner de QR con la cámara -------------------------------------------------------
    const botonEscanear = formulario.querySelector('[data-escanear]');
    const visor = formulario.querySelector('[data-visor]');
    const estado = formulario.querySelector('[data-estado]');
    const mensaje = formulario.querySelector('[data-mensaje-escaner]');
    const campoCodigo = formulario.elements.codigo;

    const cerrarVisor = () => {
      escaner.detener();
      visor.hidden = true;
      botonEscanear.hidden = false;
    };

    const escaner = crearEscanerQr(visor.querySelector('video'), {
      alLeer(texto) {
        // La cámara ya está apagada. El texto se muestra, se pone en el campo existente (así
        // "Validar acceso" sigue funcionando igual) y se entrega a onQrLeido.
        cerrarVisor();
        pintar(mensaje, alerta('exito', html`
          <p>Código leído:</p>
          <p class="escaner__texto">${texto}</p>`, { rol: 'status' }));
        campoCodigo.value = texto;
        limpiarErrores(formulario);
        campoCodigo.focus();
        onQrLeido(texto);
      },
    });

    const mostrarErrorCamara = (error) => {
      cerrarVisor();
      pintar(mensaje, alerta('error', html`<p>${error.message}</p>`, { rol: 'alert' }));
    };

    botonEscanear.addEventListener('click', async () => {
      pintar(mensaje, '');
      const problema = problemaDeSoporte();
      if (problema) {
        mostrarErrorCamara(problema);
        campoCodigo.focus();
        return;
      }
      botonEscanear.hidden = true;
      visor.hidden = false;
      estado.textContent = 'Abriendo la cámara… Si el navegador lo pide, permite el acceso.';
      formulario.querySelector('[data-cancelar]').focus();
      try {
        await escaner.iniciar();
        if (escaner.activo) estado.textContent = 'Pon el código QR dentro del recuadro. Se lee solo.';
      } catch (error) {
        mostrarErrorCamara(error.name === 'ErrorCamara' ? error : { message: 'No se pudo abrir la cámara. Puedes escribir el código a mano.' });
        campoCodigo.focus();
      }
    });

    formulario.querySelector('[data-cancelar]').addEventListener('click', () => {
      cerrarVisor();
      botonEscanear.focus();
    });

    // Si la persona cambia de pestaña o sale de la página, la cámara no se queda encendida.
    const alOcultar = () => { if (!visor.hidden) cerrarVisor(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) alOcultar(); });
    window.addEventListener('pagehide', alOcultar);

    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      validar(formulario.elements.codigo.value.trim());
    });

    // El QR puede abrir directamente acceso.html?codigo=XXXX
    const codigoEnEnlace = consulta.get('codigo');
    if (codigoEnEnlace) {
      formulario.elements.codigo.value = codigoEnEnlace;
      validar(codigoEnEnlace.trim());
    }
  },
};
