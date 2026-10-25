'use strict';
const rateLimit = require('express-rate-limit');
const { AppError } = require('../errors');

function handler(req, res, next) {
  const retry = Number(res.getHeader('Retry-After')) || undefined;
  next(new AppError(429, 'DEMASIADOS_INTENTOS', 'Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    retry ? { reintentarEnSegundos: retry } : undefined));
}

/** Almacén de contadores: Redis si está configurado; si no, la memoria local del servidor. */
function crearStore(redis, prefijo) {
  if (!redis) return undefined;
  const { RedisStore } = require('rate-limit-redis');
  return new RedisStore({ sendCommand: (...args) => redis.call(...args), prefix: prefijo });
}

// 02: límite de intentos (global + estricto para QR/registro/login)
/**
 * global: protege toda la API.
 * auth:   más estricto para QR, registro e inicio de sesión (frena la adivinanza de contraseñas).
 *         Solo cuenta los intentos fallidos (respuestas 4xx/5xx).
 * Con Redis los contadores sobreviven a un reinicio de la API; si Redis falla, la petición pasa
 * (passOnStoreError) en lugar de bloquear a todos.
 */
function createLimiters(cfg, redis) {
  const base = { standardHeaders: 'draft-7', legacyHeaders: false, handler, passOnStoreError: true };
  return {
    global: rateLimit({ ...base, windowMs: cfg.rateGlobalWindowMs, limit: cfg.rateGlobalMax, store: crearStore(redis, 'rl:global:') }),
    auth: rateLimit({ ...base, windowMs: cfg.rateAuthWindowMs, limit: cfg.rateAuthMax, skipSuccessfulRequests: true, store: crearStore(redis, 'rl:auth:') }),
  };
}

module.exports = { createLimiters };
