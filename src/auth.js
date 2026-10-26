'use strict';

const {
  createHmac, createHash, randomBytes, scrypt: scryptCallback, timingSafeEqual,
} = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(scryptCallback);
const HASH_BYTES = 64;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY_SALT = Buffer.from('biblioteca-login-dummy-salt');
const DUMMY_HASH = randomBytes(HASH_BYTES);

function digestCorreo(email, secret) {
  return createHmac('sha256', secret).update(email).digest('hex');
}

function digestToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function crearHashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, HASH_BYTES, SCRYPT_OPTIONS);
  return `scrypt$32768$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

async function verificarPassword(password, stored) {
  const partes = (stored || '').split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt'
    || partes[1] !== '32768' || partes[2] !== '8' || partes[3] !== '1') {
    const prueba = await scrypt(password, DUMMY_SALT, HASH_BYTES, SCRYPT_OPTIONS);
    timingSafeEqual(prueba, DUMMY_HASH);
    return false;
  }

  try {
    const salt = Buffer.from(partes[4], 'base64url');
    const esperado = Buffer.from(partes[5], 'base64url');
    if (salt.length !== 16 || esperado.length !== HASH_BYTES) return false;
    const actual = await scrypt(password, salt, HASH_BYTES, SCRYPT_OPTIONS);
    return timingSafeEqual(actual, esperado);
  } catch (error) {
    if (error.code === 'ERR_CRYPTO_INVALID_SCRYPT_PARAMS') return false;
    throw error;
  }
}

function crearTokenSesion() {
  return randomBytes(32).toString('base64url');
}

function compararSecreto(actual, esperado) {
  const a = Buffer.from(actual);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

module.exports = {
  compararSecreto,
  crearHashPassword,
  crearTokenSesion,
  digestCorreo,
  digestToken,
  verificarPassword,
};
