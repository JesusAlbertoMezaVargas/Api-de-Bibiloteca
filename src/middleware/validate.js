'use strict';
const { AppError } = require('../errors');

//  02: validación de parámetros (params, query y body) con zod → 400 VALIDACION

function validate(schemas) {
  return (req, res, next) => {
    const valid = {};
    const details = [];
    for (const parte of ['params', 'query', 'body']) {
      if (!schemas[parte]) continue;
      const result = schemas[parte].safeParse(req[parte] ?? {});
      if (result.success) {
        valid[parte] = result.data;
      } else {
        for (const issue of result.error.issues) {
          const campo = [parte, ...issue.path].join('.');
          details.push({ campo, mensaje: issue.message });
        }
      }
    }
    if (details.length) {
      return next(new AppError(400, 'VALIDACION', 'Los datos enviados no son válidos.', details));
    }
    req.valid = valid;
    next();
  };
}

module.exports = { validate };
