// Validación en el navegador con las mismas reglas y mensajes que src/schemas/index.js.
// Solo mejora la experiencia: la API vuelve a validar todo.

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NOMBRE = /^\p{L}[\p{L}\s'’-]*$/u;

const COMUNES = ['12345678', '123456789', 'password', 'contraseña', 'qwertyui', '11111111', 'abcd1234', 'biblioteca'];

export function validarCorreo(email) {
  if (!email) return 'El correo es obligatorio.';
  if (email.length > 254) return 'El correo es demasiado largo.';
  if (!CORREO.test(email)) return 'Escribe un correo completo, por ejemplo nombre@correo.com.';
  return '';
}

export function validarNombre(nombre) {
  if (nombre.length < 2) return 'Escribe tu nombre.';
  if (nombre.length > 80) return 'El nombre es demasiado largo.';
  if (!NOMBRE.test(nombre)) return 'Usa solo letras, espacios, guion o apóstrofe.';
  return '';
}

export function validarPasswordNueva(password, { email = '', nombre = '' } = {}) {
  if (!password) return 'La contraseña es obligatoria.';
  if (password.length < 8) return 'Usa al menos 8 caracteres.';
  if (password.length > 72) return 'Usa máximo 72 caracteres.';
  if (password !== password.trim()) return 'No puede empezar ni terminar con espacios.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) {
    return 'Incluye al menos una letra y un número.';
  }
  const bajas = password.toLowerCase();
  if (COMUNES.some((c) => bajas.includes(c))) return 'Es una contraseña muy común. Elige otra.';
  const usuarioCorreo = email.split('@')[0].toLowerCase();
  if (usuarioCorreo.length >= 3 && bajas.includes(usuarioCorreo)) return 'No uses tu correo dentro de la contraseña.';
  if (nombre.length >= 3 && bajas.includes(nombre.toLowerCase())) return 'No uses tu nombre dentro de la contraseña.';
  return '';
}

export function validarConfirmacion(password, confirmar) {
  if (!confirmar) return 'Escribe de nuevo la contraseña.';
  if (password !== confirmar) return 'Las contraseñas no coinciden.';
  return '';
}