// Validación en el navegador con las mismas reglas y mensajes que src/schemas/index.js.
// Solo mejora la experiencia: la API vuelve a validar todo.

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarCorreo(email) {
  if (!email) return 'El correo es obligatorio.';
  if (email.length > 254) return 'El correo es demasiado largo.';
  if (!CORREO.test(email)) return 'Escribe un correo completo, por ejemplo nombre@correo.com.';
  return '';
}

export function validarNombre(nombre) {
  if (nombre.length < 2) return 'Escribe tu nombre.';
  if (nombre.length > 80) return 'El nombre es demasiado largo.';
  return '';
}

export function validarPasswordNueva(password) {
  if (!password) return 'La contraseña es obligatoria.';
  if (password.length < 6) return 'Usa al menos 6 caracteres.';
  if (password.length > 72) return 'Usa máximo 72 caracteres.';
  return '';
}
