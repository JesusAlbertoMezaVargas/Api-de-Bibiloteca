'use strict';
const { randomUUID } = require('node:crypto');

/** Asigna un identificador a cada petición para poder rastrear errores. */
module.exports = function requestId(req, res, next) {
  const entrante = req.get('x-request-id');
  req.id = entrante && /^[\w-]{8,64}$/.test(entrante) ? entrante : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
