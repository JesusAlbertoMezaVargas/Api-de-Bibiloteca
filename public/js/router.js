// Enrutador por hash (#/ruta). No necesita configuración en el servidor y
// funciona aunque la página se abra desde un enlace o un código QR.

const TITULO_BASE = 'Biblioteca de la Alameda';

/** Convierte '/areas/:id' en una expresión regular con nombres de parámetros. */
function compilar(patron) {
  const nombres = [];
  const fuente = patron.replace(/:([a-zA-Z]+)/g, (_, nombre) => {
    nombres.push(nombre);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${fuente}/?$`), nombres };
}

function leerHash() {
  let sinGato = location.hash.slice(1);
  try { sinGato = decodeURI(sinGato); } catch { /* hash mal codificado: se usa tal cual */ }
  sinGato = sinGato || '/';
  const [ruta, consulta = ''] = sinGato.split('?');
  return { ruta: ruta || '/', consulta: new URLSearchParams(consulta) };
}

/**
 * @param {Array<{ patron: string, vista: { titulo: string|Function, render: Function } }>} rutas
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedor  dónde se pinta la vista
 * @param {object} opciones.noEncontrada      vista para rutas desconocidas
 */
export function crearRouter(rutas, { contenedor, noEncontrada }) {
  const tabla = rutas.map((r) => ({ ...r, ...compilar(r.patron) }));
  let limpiarAnterior = null;
  let navegacionActual = 0;

  function marcarNavegacion(ruta) {
    const seccion = `/${ruta.split('/')[1] || ''}`;
    document.querySelectorAll('[data-ruta]').forEach((enlace) => {
      const activo = enlace.dataset.ruta === seccion
        || (seccion === '/registro' && enlace.dataset.ruta === '/cuenta');
      if (activo) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    });
  }

  async function resolver() {
    const id = ++navegacionActual;
    const { ruta, consulta } = leerHash();

    let vista = noEncontrada;
    let params = {};
    for (const r of tabla) {
      const m = ruta.match(r.regex);
      if (m) {
        vista = r.vista;
        params = Object.fromEntries(r.nombres.map((n, i) => [n, m[i + 1]]));
        break;
      }
    }

    if (typeof limpiarAnterior === 'function') limpiarAnterior();
    limpiarAnterior = null;

    marcarNavegacion(ruta);
    const titulo = typeof vista.titulo === 'function' ? vista.titulo(params) : vista.titulo;
    document.title = titulo ? `${titulo} · ${TITULO_BASE}` : TITULO_BASE;

    const limpiar = await vista.render(contenedor, { params, consulta, navegar });
    // Si la persona cambió de ruta mientras cargaba, se descarta esta vista.
    if (id !== navegacionActual) {
      if (typeof limpiar === 'function') limpiar();
      return;
    }
    limpiarAnterior = limpiar;
  }

  function alCambiar() {
    resolver();
    // Lleva el foco al contenido para que lectores de pantalla y teclado empiecen ahí.
    contenedor.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function navegar(ruta) {
    if (location.hash === `#${ruta}`) resolver();
    else location.hash = ruta;
  }

  return {
    iniciar() {
      window.addEventListener('hashchange', alCambiar);
      resolver();
    },
    navegar,
  };
}
