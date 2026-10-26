'use strict';
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const COOKIE = 'sesion';

/** Sesión con JWT en cookie HttpOnly. Las sesiones cerradas se recuerdan en Redis o, sin Redis, en memoria. */
function createSesion(cfg, redis) {
  const revocadas = new Map(); // jti -> expira (ms)

  const opciones = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: cfg.isProduction,
    path: '/',
  });

  function emitir(res, usuario) {
    const token = jwt.sign({}, cfg.jwtSecret, {
      algorithm: 'HS256',
      subject: usuario.id,
      jwtid: crypto.randomUUID(),
      expiresIn: Math.floor(cfg.jwtExpiresMs / 1000),
    });
    res.cookie(COOKIE, token, { ...opciones(), maxAge: cfg.jwtExpiresMs });
  }

  /** Devuelve el contenido del token o null si falta o no es válido. */
  function leer(req) {
    const token = req.cookies?.[COOKIE];
    if (!token) return null;
    try {
      return jwt.verify(token, cfg.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      return null;
    }
  }

  async function estaRevocada(jti) {
    if (revocadas.has(jti)) return true;
    if (redis) {
      try { return (await redis.get(`revocada:${jti}`)) !== null; } catch { /* Redis caído: se sigue */ }
    }
    return false;
  }

  async function revocar(payload) {
    revocadas.set(payload.jti, payload.exp * 1000);
    const ahora = Date.now();
    for (const [jti, exp] of revocadas) if (exp <= ahora) revocadas.delete(jti);
    if (redis) {
      const segundos = Math.max(1, payload.exp - Math.floor(ahora / 1000));
      try { await redis.set(`revocada:${payload.jti}`, '1', 'EX', segundos); } catch { /* idem */ }
    }
  }

  const cerrar = (res) => res.clearCookie(COOKIE, opciones());

  return { emitir, leer, estaRevocada, revocar, cerrar };
}

module.exports = { createSesion };