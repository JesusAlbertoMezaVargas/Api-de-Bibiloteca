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

/** Requisitos de la contraseña nueva; la pantalla de registro los marca conforme se escribe. */
export const REQUISITOS_PASSWORD = [
  { clave: 'largo', texto: 'Entre 8 y 15 caracteres', cumple: (v) => v.length >= 8 && v.length <= 15 },
  { clave: 'minuscula', texto: 'Una letra minúscula', cumple: (v) => /\p{Ll}/u.test(v) },
  { clave: 'mayuscula', texto: 'Una letra mayúscula', cumple: (v) => /\p{Lu}/u.test(v) },
  { clave: 'numero', texto: 'Un número', cumple: (v) => /\d/.test(v) },
  { clave: 'especial', texto: 'Un carácter especial (*, # o @)', cumple: (v) => /[^\p{L}\p{N}\s]/u.test(v) },
];

export function validarPasswordNueva(password) {
  if (!password) return 'La contraseña es obligatoria.';
  if (password.length < 8) return 'Usa al menos 8 caracteres.';
  if (password.length > 15) return 'Usa máximo 15 caracteres.';
  if (!REQUISITOS_PASSWORD.every((r) => r.cumple(password))) {
    return 'Incluye mayúscula, minúscula, número y un carácter especial (*, # o @).';
  }
  return '';
}
