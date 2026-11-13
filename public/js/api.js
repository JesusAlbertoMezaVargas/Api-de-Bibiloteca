// Cliente de la API. Todas las peticiones van al mismo origen (/api) y la sesión
// viaja en una cookie HttpOnly, por eso no se maneja ningún token aquí.

/** Error de la API con el formato uniforme { code, message, details, requestId }. */
export class ApiError extends Error {
  constructor(status, { code, message, details, requestId } = {}) {
    super(message || 'Ocurrió un error inesperado.');
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'ERROR_DESCONOCIDO';
    this.details = details;
    this.requestId = requestId;
  }
}

async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  let res;
  try {
    res = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo === undefined ? {} : { 'content-type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ApiError(0, { code: 'SIN_CONEXION', message: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.' });
  }

  if (res.status === 204) return null;
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, datos?.error ?? { message: `El servidor respondió con el código ${res.status}.` });
  }
  return datos;
}

// Contrato de endpoints (ver src/routes/api.js)
export const api = {
  salud: () => pedir('/health'),

  validarQr: (codigo) => pedir('/qr/validar', { metodo: 'POST', cuerpo: { codigo } }),
  registro: (datos) => pedir('/auth/registro', { metodo: 'POST', cuerpo: datos }),
  login: (datos) => pedir('/auth/login', { metodo: 'POST', cuerpo: datos }),
  logout: () => pedir('/auth/logout', { metodo: 'POST' }),
  yo: () => pedir('/auth/yo'),

  areas: () => pedir('/areas'),
  area: (id) => pedir(`/areas/${encodeURIComponent(id)}`),

  preferencias: () => pedir('/preferencias'),
  guardarPreferencias: (prefs) => pedir('/preferencias', { metodo: 'PUT', cuerpo: prefs }),
  registrarUsoGuia: (areaId) => pedir('/uso/guias', { metodo: 'POST', cuerpo: { areaId } }),
};
