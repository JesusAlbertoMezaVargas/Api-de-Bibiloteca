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
    jwtSecret: env.JWT_SECRET || '',
    redisUrl: env.REDIS_URL || '', //                  vacío = sin Redis (se usa memoria local)
    cacheTtlSeconds: toNumber(env.CACHE_TTL_SECONDS, 600),
    // 03: vigencia de acceso — JWT 2 h (JWT_EXPIRES_MIN), pase QR 4 h (QR_PASS_MIN), costo de bcrypt (BCRYPT_ROUNDS)
    jwtExpiresMs: toNumber(env.JWT_EXPIRES_MIN, 120) * MIN, // sesión del usuario
    qrPassMs: toNumber(env.QR_PASS_MIN, 240) * MIN, //          pase de acceso por QR
    bcryptRounds: toNumber(env.BCRYPT_ROUNDS, 12),
    rateGlobalMax: toNumber(env.RATE_GLOBAL_MAX, 100),
    rateGlobalWindowMs: toNumber(env.RATE_GLOBAL_WINDOW_MIN, 15) * MIN,
    rateAuthMax: toNumber(env.RATE_AUTH_MAX, 10),
    rateAuthWindowMs: toNumber(env.RATE_AUTH_WINDOW_MIN, 15) * MIN,
    ...overrides,
  };

  if (cfg.isProduction && cfg.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres.');
  }
  if (!cfg.jwtSecret) cfg.jwtSecret = 'solo-para-desarrollo-no-usar-en-produccion';
  return cfg;
}

module.exports = { loadConfig };
