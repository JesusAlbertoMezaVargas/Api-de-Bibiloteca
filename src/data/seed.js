'use strict';

const Redis = require('ioredis');
const { areas, servicios } = require('./datosPrueba');
const { PREFIJO } = require('../repository');

const CLAVE_REGISTROS_SEMILLA = `${PREFIJO}datos:prueba:claves`;
const mapa = { imagen_url: '', ancho: 1280, alto: 900 };

async function sembrar() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy: () => null,
  });

  try {
    await redis.ping();
    const anteriores = await redis.smembers(CLAVE_REGISTROS_SEMILLA);
    const claves = new Set([
      `${PREFIJO}mapa:principal`,
      `${PREFIJO}areas`,
      `${PREFIJO}servicios`,
      ...areas.flatMap((area) => [
        `${PREFIJO}area:${area.id}`,
        `${PREFIJO}area:${area.id}:servicios`,
      ]),
      ...servicios.flatMap((servicio) => [
        `${PREFIJO}servicio:${servicio.id}`,
        `${PREFIJO}servicio:${servicio.id}:pasos`,
        ...servicio.pasos.map((_, indice) => `${PREFIJO}paso:${servicio.id}-${indice + 1}`),
      ]),
    ]);

    const multi = redis.multi();
    if (anteriores.length) multi.del(...anteriores);

    multi.hset(`${PREFIJO}mapa:principal`, mapa);
    areas.forEach((area, indice) => {
      multi.hset(`${PREFIJO}area:${area.id}`, {
        id: area.id,
        nombre: area.nombre,
        posicion_x_pct: String(area.x),
        posicion_y_pct: String(area.y),
      });
      multi.zadd(`${PREFIJO}areas`, indice + 1, area.id);
    });

    servicios.forEach((servicio, indice) => {
      multi.hset(`${PREFIJO}servicio:${servicio.id}`, {
        id: servicio.id,
        area_id: servicio.areaId,
        nombre: servicio.nombre,
        descripcion: servicio.descripcion,
      });
      multi.zadd(`${PREFIJO}servicios`, indice + 1, servicio.id);
      multi.zadd(`${PREFIJO}area:${servicio.areaId}:servicios`, indice + 1, servicio.id);
      servicio.pasos.forEach((texto, pasoIndice) => {
        const pasoId = `${servicio.id}-${pasoIndice + 1}`;
        multi.hset(`${PREFIJO}paso:${pasoId}`, {
          id: pasoId,
          servicio_id: servicio.id,
          texto,
          ilustracion_url: '',
          texto_alternativo: '',
        });
        multi.zadd(`${PREFIJO}servicio:${servicio.id}:pasos`, pasoIndice + 1, pasoId);
      });
    });
    multi.sadd(CLAVE_REGISTROS_SEMILLA, ...claves);
    const results = await multi.exec();
    const error = results.find(([err]) => err);
    if (error) throw error[0];

    const totalHashes = areas.length + servicios.length
      + servicios.reduce((total, servicio) => total + servicio.pasos.length, 0) + 1;
    console.log(`Datos de prueba cargados: ${areas.length} áreas, ${servicios.length} servicios, `
      + `${totalHashes - areas.length - servicios.length - 1} pasos (${totalHashes} registros hash).`);
  } finally {
    if (redis.status === 'ready') await redis.quit();
    else redis.disconnect();
  }
}

sembrar().catch((error) => {
  console.error('No se pudieron cargar los datos de prueba en Redis:', error.message);
  process.exitCode = 1;
});
