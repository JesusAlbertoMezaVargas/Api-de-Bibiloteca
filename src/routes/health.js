'use strict';
const { Router } = require('express');
const { version } = require('../../package.json');
const { estadoRedis } = require('../redis');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = function healthRouter({ redis }) {
  const router = Router();

  // Ruta de salud: sirve para comprobar que el servidor responde (y para el monitoreo del hosting).
  // "redis" informa si la caché está disponible; la API sigue "ok" aunque Redis esté caído.
  // si cumple 02: ruta de salud
  router.get('/health', asyncHandler(async (req, res) => {
    res.json({
      estado: 'ok',
      servicio: 'biblioteca-api',
      version,
      hora: new Date().toISOString(),
      uptimeSegundos: Math.round(process.uptime()),
      redis: await estadoRedis(redis),
    });
  }));

  return router;
};
