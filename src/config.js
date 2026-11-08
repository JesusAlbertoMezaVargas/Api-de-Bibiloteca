'use strict';

const toNumber = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const MIN = 60 * 1000;

/**
 * Lee la configuración desde variables de entorno (archivo .env).
 * `overrides` permite sustituir valores en las pruebas.
 */
function loadConfig(env = process.env, overrides = {}) {
  const nodeEnv = env.NODE_ENV || 'development';

  const cfg = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: toNumber(env.PORT, 3000),
    trustProxy: env.TRUST_PROXY === 'true',
    // Secreto HMAC con el que se indexan los correos en Redis (no se usa JWT: la sesión es un token opaco).
    jwtSecret: env.JWT_SECRET || '',
    // Redis guarda cuentas y sesiones. En desarrollo apunta al Redis local; en producción es obligatorio.
    // Un valor vacío en las pruebas (overrides) deja la API sin almacén: las cuentas responden 503.
    redisUrl: env.REDIS_URL || (nodeEnv === 'production' ? '' : 'redis://127.0.0.1:6379'),
    cacheTtlSeconds: toNumber(env.CACHE_TTL_SECONDS, 600),
    // Vigencias: la sesión dura 30 min y se renueva con cada uso; el pase QR, 4 h.
    sessionTtlSeconds: toNumber(env.SESSION_TTL_SECONDS, 1800),
    qrPassMs: toNumber(env.QR_PASS_MIN, 240) * MIN,
    rateGlobalMax: toNumber(env.RATE_GLOBAL_MAX, 100),
    rateGlobalWindowMs: toNumber(env.RATE_GLOBAL_WINDOW_MIN, 15) * MIN,
    rateAuthMax: toNumber(env.RATE_AUTH_MAX, 10),
    rateAuthWindowMs: toNumber(env.RATE_AUTH_WINDOW_MIN, 15) * MIN,
    ...overrides,
  };

  if (cfg.isProduction && cfg.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres.');
  }
  if (cfg.isProduction && !cfg.redisUrl) {
    throw new Error('REDIS_URL es obligatorio en producción: ahí se guardan las cuentas y las sesiones.');
  }
  if (!cfg.jwtSecret) cfg.jwtSecret = 'solo-para-desarrollo-no-usar-en-produccion';
  return cfg;
}

module.exports = { loadConfig };
