import { html, pintar } from '../html.js';
import { api } from '../api.js';
import { guardarPreferencias, obtenerPreferencias, obtenerUsuario } from '../estado.js';
import { avisar, conEnvio, encabezadoPagina, mensajeDeError } from '../ui.js';

const TAMANOS = [['normal', 'Normal'], ['grande', 'Grande'], ['muy_grande', 'Muy grande']];
const VELOCIDADES = [[0.8, 'Lenta'], [1, 'Normal'], [1.25, 'Rápida']];

function leerFormulario(f) {
  return {
    tamanoLetra: f.elements.tamanoLetra.value,
    altoContraste: f.elements.altoContraste.checked,
    audioAutomatico: f.elements.audioAutomatico.checked,
    velocidadVoz: Number(f.elements.velocidadVoz.value),
  };
}

const segmento = (nombre, opciones, actual) => html`
  <div class="segmento">
    ${opciones.map(([valor, texto]) => html`
      <label class="segmento__opcion">
        <input type="radio" name="${nombre}" value="${valor}" ${actual === valor ? html`checked` : ''}>
        <span>${texto}</span>
      </label>`)}
  </div>`;

export default {
  titulo: 'Ajustes',
  render(contenedor) {
    const prefs = obtenerPreferencias();
    const usuario = obtenerUsuario();

    pintar(contenedor, html`
      ${encabezadoPagina({
        titulo: 'Ajustes de lectura',
        entrada: usuario
          ? 'Los cambios se ven al momento y se guardan en tu cuenta.'
          : 'Los cambios se ven al momento y se guardan en este dispositivo.',
      })}

      <form class="formulario">
        <fieldset class="campo">
          <legend>Tamaño de letra</legend>
          ${segmento('tamanoLetra', TAMANOS, prefs.tamanoLetra)}
        </fieldset>

        <fieldset class="campo">
          <legend>Pantalla y sonido</legend>
          <label class="interruptor">
            <span class="interruptor__texto">Alto contraste<small>Colores más marcados para leer con poca luz.</small></span>
            <input type="checkbox" name="altoContraste" role="switch" ${prefs.altoContraste ? html`checked` : ''}>
          </label>
          <label class="interruptor">
            <span class="interruptor__texto">Leer guías en voz alta<small>La guía se escucha al abrir un área.</small></span>
            <input type="checkbox" name="audioAutomatico" role="switch" ${prefs.audioAutomatico ? html`checked` : ''}>
          </label>
        </fieldset>

        <fieldset class="campo">
          <legend>Velocidad de la voz</legend>
          ${segmento('velocidadVoz', VELOCIDADES, prefs.velocidadVoz)}
        </fieldset>

        <button type="submit" class="boton boton--primario boton--bloque">Guardar ajustes</button>
        ${usuario ? '' : html`<p class="formulario__pie"><a href="#/cuenta">Inicia sesión</a> para usarlos en cualquier teléfono.</p>`}
      </form>`);

    const formulario = contenedor.querySelector('form');

    // Vista previa inmediata al cambiar cualquier opción.
    formulario.addEventListener('change', () => guardarPreferencias(leerFormulario(formulario)));

    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nuevas = guardarPreferencias(leerFormulario(formulario));
      if (!obtenerUsuario()) {
        avisar('Ajustes guardados en este dispositivo.');
        return;
      }
      try {
        await conEnvio(formulario, () => api.guardarPreferencias(nuevas));
        avisar('Ajustes guardados en tu cuenta.');
      } catch (error) {
        avisar(`Se guardaron en este dispositivo, pero no en tu cuenta: ${mensajeDeError(error)}`, 'error');
      }
    });
  },
};
