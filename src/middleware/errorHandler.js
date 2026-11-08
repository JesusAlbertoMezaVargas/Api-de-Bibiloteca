'use strict';
const { AppError } = require('../errors');

// 02: manejo uniforme de errores (404, 400 JSON_INVALIDO, 413, 429, 500 sin exponer detalles)
/** Formato único de error: { error: { code, message, details?, requestId } } */
function cuerpoError(req, code, message, details) {
  const error = { code, message, requestId: req.id };
  if (details !== undefined) error.details = details;
  return { error };
}

function notFoundHandler(req, res, next) {
  next(new AppError(404, 'RUTA_NO_ENCONTRADA', `No existe la ruta ${req.method} ${req.path}.`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let code = 'ERROR_INTERNO';
  let message = 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400; code = 'JSON_INVALIDO'; message = 'El cuerpo de la solicitud no es un JSON válido.';
  } else if (err && err.type === 'entity.too.large') {
    status = 413; code = 'CUERPO_MUY_GRANDE'; message = 'La solicitud es demasiado grande.';
  } else {
    // Error no previsto: se registra completo, pero al cliente no se le expone el detalle.
    console.error(`[${req.id}]`, err);
  }

  res.status(status).json(cuerpoError(req, code, message, details));
}

module.exports = { notFoundHandler, errorHandler };
