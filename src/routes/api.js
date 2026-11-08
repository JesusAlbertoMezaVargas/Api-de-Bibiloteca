'use strict';
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { noImplementado } = require('../errors');
const s = require('../schemas');
const authRouter = require('./auth');
const preferenciasRouter = require('./preferencias');

// 03 (parcial): contrato inicial de endpoints definido y validado; faltan los ejemplos de solicitud/respuesta documentados
/**
 * Contrato inicial de endpoints (ver Contrato_API_y_Autenticacion.docx).
 * Cada ruta ya valida sus datos y está protegida contra abuso. Responde 501 hasta que se
 * implemente su controlador; al hacerlo basta con reemplazar `pendiente(...)` por el controlador.
 */
module.exports = function apiRouter({ limiters, almacen, requerirSesion, cfg }) {
  const r = Router();
  const pendiente = (nombre) => (req, res, next) => next(noImplementado(nombre));

  // Acceso (QR y cuenta): límite estricto de intentos
  r.post('/qr/validar', limiters.auth, validate(s.qrValidar), pendiente('POST /api/qr/validar'));
  r.use('/auth', authRouter({ limiters, almacen, requerirSesion, cfg }));

  // Mapa y guías
  r.get('/areas', pendiente('GET /api/areas'));
  r.get('/areas/:id', validate(s.areaId), pendiente('GET /api/areas/:id'));

  // Preferencias de accesibilidad y registro de uso
  r.use('/preferencias', preferenciasRouter({ almacen, requerirSesion }));
  r.post('/uso/guias', validate(s.usoGuia), pendiente('POST /api/uso/guias'));

  return r;
};
