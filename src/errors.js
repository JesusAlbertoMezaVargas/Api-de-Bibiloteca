'use strict';

/** Error controlado: lleva el código HTTP y un código estable para el frontend. */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const noImplementado = (nombre) =>
  new AppError(501, 'NO_IMPLEMENTADO', `El endpoint "${nombre}" ya está definido en el contrato, pero todavía no se implementa.`);

module.exports = { AppError, noImplementado };
