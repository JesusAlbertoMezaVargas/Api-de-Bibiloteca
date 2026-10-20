// Estado del cliente: preferencias de accesibilidad y usuario en sesión.
// Las preferencias se guardan también en el navegador para aplicarse antes de
// hablar con la API (y funcionar aunque la persona no tenga cuenta).

const CLAVE_PREFS = 'biblioteca:preferencias';

export const PREFERENCIAS_INICIALES = Object.freeze({
  tamanoLetra: 'normal', //   normal | grande | muy_grande
  altoContraste: false,
  audioAutomatico: false,
  velocidadVoz: 1, //         0.8 | 1 | 1.25
});

const estado = {
  preferencias: { ...PREFERENCIAS_INICIALES },
  usuario: null,
};

function leerGuardadas() {
  try {
    const crudo = localStorage.getItem(CLAVE_PREFS);
    return crudo ? JSON.parse(crudo) : {};
  } catch {
    return {}; // navegación privada o almacenamiento bloqueado
  }
}

export function obtenerPreferencias() {
  return { ...estado.preferencias };
}

/** Refleja las preferencias en <html> para que el CSS las aplique. */
export function aplicarPreferencias(prefs = estado.preferencias) {
  const raiz = document.documentElement;
  raiz.dataset.letra = prefs.tamanoLetra;
  raiz.dataset.contraste = prefs.altoContraste ? 'alto' : 'normal';
}

export function guardarPreferencias(cambios) {
  estado.preferencias = { ...estado.preferencias, ...cambios };
  try {
    localStorage.setItem(CLAVE_PREFS, JSON.stringify(estado.preferencias));
  } catch {
    /* sin almacenamiento: se conservan solo durante esta visita */
  }
  aplicarPreferencias();
  return obtenerPreferencias();
}

export function cargarPreferencias() {
  estado.preferencias = { ...PREFERENCIAS_INICIALES, ...leerGuardadas() };
  aplicarPreferencias();
}

export const obtenerUsuario = () => estado.usuario;
export function establecerUsuario(usuario) {
  estado.usuario = usuario || null;
}
