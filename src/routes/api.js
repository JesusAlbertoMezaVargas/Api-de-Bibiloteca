'use strict';
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { noImplementado } = require('../errors');
const s = require('../schemas');

// 03 (parcial): contrato inicial de endpoints definido y validado; faltan los ejemplos de solicitud/respuesta documentados
/**
 * Contrato inicial de endpoints (ver Contrato_API_y_Autenticacion.docx).
 * Cada ruta ya valida sus datos y está protegida contra abuso. Responde 501 hasta que se
 * implemente su controlador; al hacerlo basta con reemplazar `pendiente(...)` por el controlador.
 */
module.exports = function apiRouter({ limiters }) {
  const r = Router();
  const pendiente = (nombre) => (req, res, next) => next(noImplementado(nombre));

  // Acceso (QR y cuenta): límite estricto de intentos
  r.post('/qr/validar', limiters.auth, validate(s.qrValidar), pendiente('POST /api/qr/validar'));
  r.post('/auth/registro', limiters.auth, validate(s.registro), pendiente('POST /api/auth/registro'));
  r.post('/auth/login', limiters.auth, validate(s.login), pendiente('POST /api/auth/login'));
  r.post('/auth/logout', pendiente('POST /api/auth/logout'));
  r.get('/auth/yo', pendiente('GET /api/auth/yo'));

  // Mapa y guías
  r.get('/areas', pendiente('GET /api/areas'));
  r.get('/areas/:id', validate(s.areaId), pendiente('GET /api/areas/:id'));

  // Preferencias de accesibilidad y registro de uso
  r.get('/preferencias', pendiente('GET /api/preferencias'));
  r.put('/preferencias', validate(s.preferencias), pendiente('PUT /api/preferencias'));
  r.post('/uso/guias', validate(s.usoGuia), pendiente('POST /api/uso/guias'));

  return r;
};
