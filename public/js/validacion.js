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
  if (password.length < 8) return 'Usa al menos 8 caracteres.';
  if (password.length > 15) return 'Usa máximo 15 caracteres.';
  if (!/[a-z]/.test(password)) return 'Incluye al menos una letra minúscula.';
  if (!/[A-Z]/.test(password)) return 'Incluye al menos una letra mayúscula.';
  if (!/[0-9]/.test(password)) return 'Incluye al menos un número.';
  if (!/[^A-Za-z0-9\s]/.test(password)) return 'Incluye un carácter especial, como *, # o @.';
  return '';
}
