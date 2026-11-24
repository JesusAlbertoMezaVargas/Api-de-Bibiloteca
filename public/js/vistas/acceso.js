import { html, pintar } from '../html.js';
import { icono } from '../iconos.js';
import { alerta, encabezadoPagina, limpiarErrores, marcarError } from '../ui.js';
import { crearEscanerQr, problemaDeSoporte } from '../qr/escaner.js';
import { resolverCodigoArea } from '../qr/onQrLeido.js';

const MENSAJE_QR_INVALIDO = 'No encontramos un área con ese código QR. Revisa que sea el código de un área de la biblioteca.';

export default {
  titulo: 'Buscar por QR',
  render(contenedor, { consulta }) {
    document.title = 'Buscar por QR · Biblioteca de la Alameda';
    pintar(contenedor, html`
      ${encabezadoPagina({
        titulo: 'Busca información por QR',
        entrada: 'Escanea el código QR de un área de la biblioteca para consultar su información y guía de uso.',
      })}

      <div class="dividido">
        <form class="formulario" novalidate>
          <div class="escaner">
            <button type="button" class="boton boton--secundario boton--bloque" data-escanear>${icono('qr')}Escanear QR del área</button>
            <div class="escaner__visor" data-visor hidden>
              <div class="escaner__marco">
                <video class="escaner__video" playsinline muted autoplay aria-label="Vista de la cámara"></video>
                <div class="escaner__guia" aria-hidden="true"></div>
              </div>
              <p class="escaner__estado" data-estado role="status"></p>
              <button type="button" class="boton boton--secundario boton--bloque" data-cancelar>Cerrar cámara</button>
            </div>
            <div data-mensaje-escaner></div>
            <p class="escaner__o" aria-hidden="true"><span>o busca con el código</span></p>
          </div>

          <div class="campo">
            <label for="codigo">Código o contenido del QR</label>
            <input id="codigo" name="codigo" type="text" autocomplete="off" autocapitalize="characters"
                   required maxlength="200" aria-describedby="codigo-ayuda codigo-error">
            <span id="codigo-ayuda" class="campo__ayuda">Puedes escribir el identificador impreso, por ejemplo: <code>BIBL0001</code>.</span>
            <p id="codigo-error" class="campo__error" data-error-de="codigo"></p>
          </div>
          <button type="submit" class="boton boton--primario boton--bloque">Buscar área</button>
        </form>

        <aside class="panel lectura" aria-labelledby="titulo-ayuda-qr">
          <h2 id="titulo-ayuda-qr" class="panel__titulo">¿Cómo buscar un área?</h2>
          <ol class="pasos">
            <li><span>Busca el código QR colocado en el área que quieres conocer.</span></li>
            <li><span>Toca «Escanear QR del área» y permite el acceso a la cámara.</span></li>
            <li><span>Apunta al código; al leerlo, se abrirá la información del área.</span></li>
          </ol>
          <p>También puedes escribir el identificador que aparece junto al código QR.</p>
        </aside>
      </div>`);

    const formulario = contenedor.querySelector('form');
    const botonEscanear = formulario.querySelector('[data-escanear]');
    const visor = formulario.querySelector('[data-visor]');
    const estado = formulario.querySelector('[data-estado]');
    const mensaje = formulario.querySelector('[data-mensaje-escaner]');
    const campoCodigo = formulario.elements.codigo;

    const buscar = (texto) => {
      limpiarErrores(formulario);
      if (!texto) {
        marcarError(formulario, 'codigo', 'Escribe o escanea el código QR de un área.');
        campoCodigo.focus();
        return false;
      }

      const destino = resolverCodigoArea(texto);
      if (!destino) {
        marcarError(formulario, 'codigo', MENSAJE_QR_INVALIDO);
        campoCodigo.focus();
        return false;
      }

      location.assign(destino);
      return true;
    };

    const cerrarVisor = () => {
      escaner.detener();
      visor.hidden = true;
      botonEscanear.hidden = false;
    };

    const escaner = crearEscanerQr(visor.querySelector('video'), {
      alLeer(texto) {
        cerrarVisor();
        campoCodigo.value = texto;
        if (!buscar(texto)) campoCodigo.focus();
      },
    });

    const mostrarErrorCamara = (error) => {
      cerrarVisor();
      pintar(mensaje, alerta('error', html`<p>${error.message}</p>`, { rol: 'alert' }));
    };

    botonEscanear.addEventListener('click', async () => {
      limpiarErrores(formulario);
      pintar(mensaje, '');
      const problema = problemaDeSoporte();
      if (problema) {
        mostrarErrorCamara(problema);
        return;
      }
      botonEscanear.hidden = true;
      visor.hidden = false;
      estado.textContent = 'Abriendo la cámara… Si el navegador lo pide, permite el acceso.';
      formulario.querySelector('[data-cancelar]').focus();
      try {
        await escaner.iniciar();
        if (escaner.activo) estado.textContent = 'Pon el QR del área dentro del recuadro. Se lee solo.';
      } catch (error) {
        mostrarErrorCamara(error.name === 'ErrorCamara' ? error : { message: 'No se pudo abrir la cámara. Puedes escribir el código del área.' });
      }
    });

    formulario.querySelector('[data-cancelar]').addEventListener('click', () => {
      cerrarVisor();
      botonEscanear.focus();
    });

    const alOcultar = () => { if (!visor.hidden) cerrarVisor(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) alOcultar(); });
    window.addEventListener('pagehide', alOcultar);

    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      buscar(campoCodigo.value.trim());
    });

    const codigoEnEnlace = consulta.get('codigo');
    if (codigoEnEnlace) {
      campoCodigo.value = codigoEnEnlace;
      buscar(codigoEnEnlace.trim());
    }
  },
};
