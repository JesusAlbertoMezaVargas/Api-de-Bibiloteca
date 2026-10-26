'use strict';

/** 
 * Conexión opcional a Redis.
 * - Si REDIS_URL está vacío, devuelve null y la API trabaja sin Redis (límites en memoria local).
 * - Los comandos iniciales esperan la conexión; maxRetriesPerRequest evita dejarlos en cola indefinidamente.
 */
function createRedis(cfg) {
  if (!cfg.redisUrl) return null;
  const Redis = require('ioredis'); // se carga solo si hace falta
  const client = new Redis(cfg.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: true,
    retryStrategy: (veces) => Math.min(veces * 500, 5000),
    lazyConnect: false,
  });
  let avisado = false;
  client.on('error', (err) => {
    if (!avisado) { console.error('[redis] sin conexión:', err.message); avisado = true; }
  });
  client.on('ready', () => { avisado = false; console.log('[redis] conectado'); });
  return client;
}

/** Estado para la ruta de salud: "no configurado", "conectado" o "sin conexión". */
async function estadoRedis(client) {
  if (!client) return 'no configurado';
  let timer;
  try {
    const pong = await Promise.race([
      client.ping(),
      new Promise((_, rechazar) => {
        timer = setTimeout(() => rechazar(new Error('timeout')), 500);
      }),
    ]);
    return pong === 'PONG' ? 'conectado' : 'sin conexión';
  } catch (e) {
    return 'sin conexión';
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { createRedis, estadoRedis };
