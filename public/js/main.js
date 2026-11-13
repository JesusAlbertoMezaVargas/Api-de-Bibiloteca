// Punto de entrada de cada página: aplica preferencias, recupera la sesión y pinta
// la vista indicada en <main data-vista="...">. Cada pantalla es su propio .html.
import { api } from './api.js';
import { cargarPreferencias, establecerUsuario, guardarPreferencias } from './estado.js';
import { avisar } from './ui.js';

import inicio from './vistas/inicio.js';
import areas from './vistas/areas.js';
import servicio from './vistas/servicio.js';
import acceso from './vistas/acceso.js';
import preferencias from './vistas/preferencias.js';
import cuenta from './vistas/cuenta.js';
import registro from './vistas/registro.js';
import noEncontrada from './vistas/noEncontrada.js';

const vistas = { inicio, areas, servicio, acceso, preferencias, cuenta, registro };

// Primero las preferencias, para que la página no "parpadee" con el tamaño o los colores equivocados.
cargarPreferencias();

const contenedor = document.getElementById('contenido');
// Los datos llegan en la URL: servicio.html?id=recepcion, acceso.html?codigo=XXXX
const consulta = new URLSearchParams(location.search);
const params = Object.fromEntries(consulta);
const AVISO_PENDIENTE = 'aviso-pendiente';

// Al cambiar de página se recarga todo, así que el aviso se guarda para mostrarlo en la siguiente.
function navegar(pagina, aviso) {
  try { if (aviso) sessionStorage.setItem(AVISO_PENDIENTE, aviso); } catch { /* sin storage: se pierde el aviso */ }
  location.assign(pagina);
}

try {
  const aviso = sessionStorage.getItem(AVISO_PENDIENTE);
  sessionStorage.removeItem(AVISO_PENDIENTE);
  if (aviso) avisar(aviso);
} catch { /* sin storage */ }

let vista = vistas[contenedor.dataset.vista] ?? noEncontrada;
if (vista === servicio && !params.id) vista = noEncontrada;
if (vista === noEncontrada) document.title = `${noEncontrada.titulo} · Biblioteca de la Alameda`;

// Si ya hay sesión (cookie), se recupera el usuario y sus ajustes guardados en la cuenta, que
// mandan sobre los de este dispositivo; si no, se sigue como invitado con los ajustes locales.
async function recuperarSesion() {
  try {
    const datos = await api.yo();
    establecerUsuario(datos?.usuario ?? datos);
  } catch {
    establecerUsuario(null);
    return;
  }
  try {
    const { preferencias } = await api.preferencias();
    guardarPreferencias(preferencias);
  } catch { /* sin ajustes de la cuenta: se quedan los de este dispositivo */ }
}

recuperarSesion().finally(() => vista.render(contenedor, { params, consulta, navegar }));
