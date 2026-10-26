'use strict';
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { noImplementado } = require('../errors');
const { createAuthController } = require('../auth/controller');
const s = require('../schemas');

/**
 * Contrato de endpoints. Autenticación implementada; el resto responde 501
 * hasta que se reemplace `pendiente(...)` por su controlador.
 */
module.exports = function apiRouter({ limiters, cfg, redis }) {
  const r = Router();
  const auth = createAuthController({ cfg, redis });
  const pendiente = (nombre) => (req, res, next) => next(noImplementado(nombre));

  // Acceso (QR y cuenta): límite estricto de intentos
  r.post('/qr/validar', limiters.auth, validate(s.qrValidar), pendiente('POST /api/qr/validar'));
  r.post('/auth/registro', limiters.auth, validate(s.registro), asyncHandler(auth.registro));
  r.post('/auth/login', limiters.auth, validate(s.login), asyncHandler(auth.login));
  r.post('/auth/logout', asyncHandler(auth.logout));
  r.get('/auth/yo', auth.requireAuth, auth.yo);

  // Mapa y guías
  r.get('/areas', pendiente('GET /api/areas'));
  r.get('/areas/:id', validate(s.areaId), pendiente('GET /api/areas/:id'));

  // Preferencias de accesibilidad y registro de uso
  r.get('/preferencias', pendiente('GET /api/preferencias'));
  r.put('/preferencias', validate(s.preferencias), pendiente('PUT /api/preferencias'));
  r.post('/uso/guias', validate(s.usoGuia), pendiente('POST /api/uso/guias'));

  return r;
};