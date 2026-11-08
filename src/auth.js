'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

// Costo de scrypt: N = 2^15 usa 32 MB por cálculo (128 · N · r), dentro del máximo de 64 MB.
const N = 32768;
const R = 8;
const P = 1;
const LARGO = 64;
const OPCIONES = { N, r: R, p: P, maxmem: 64 * 1024 * 1024 };

/** Hash de contraseña: scrypt$N$r$p$<salt base64url>$<hash base64url> */
async function crearHashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, LARGO, OPCIONES);
  return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

function leerHash(stored) {
  const partes = typeof stored === 'string' ? stored.split('$') : [];
  if (partes.length !== 6 || partes[0] !== 'scrypt') return null;
  const [, n, r, p, salt, hash] = partes.map((v, i) => (i >= 1 && i <= 3 ? Number(v) : v));
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
  const esperado = Buffer.from(hash, 'base64url');
  if (esperado.length !== LARGO) return null;
  return { opciones: { N: n, r, p, maxmem: OPCIONES.maxmem }, salt: Buffer.from(salt, 'base64url'), esperado };
}

// Hash ficticio para gastar el mismo tiempo cuando el correo no existe o el hash está dañado:
// así la duración de la respuesta no revela si hay una cuenta con ese correo.
const FICTICIO = { opciones: OPCIONES, salt: Buffer.alloc(16), esperado: Buffer.alloc(LARGO) };

/** Compara en tiempo constante. Con un hash ausente o inválido, igual calcula scrypt y devuelve false. */
async function verificarPassword(password, stored) {
  const leido = leerHash(stored);
  const { opciones, salt, esperado } = leido ?? FICTICIO;
  const calculado = await scrypt(String(password), salt, esperado.length, opciones);
  return crypto.timingSafeEqual(calculado, esperado) && leido !== null;
}

/** Token de sesión aleatorio y opaco (va solo en la cookie HttpOnly). */
const crearTokenSesion = () => crypto.randomBytes(32).toString('base64url');

/** En Redis la sesión se guarda por el SHA-256 del token, nunca por el token en claro. */
const digestToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Índice de búsqueda del correo: HMAC-SHA256, para no exponer el correo en el nombre de la clave. */
const digestCorreo = (email, secret) => crypto.createHmac('sha256', secret).update(email).digest('hex');

module.exports = { crearHashPassword, verificarPassword, crearTokenSesion, digestToken, digestCorreo };
