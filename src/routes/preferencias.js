'use strict';
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const s = require('../schemas');

/** Ajustes de lectura guardados en la cuenta: solo con sesión iniciada. */
module.exports = function preferenciasRouter({ almacen, requerirSesion }) {
  const r = Router();

  r.get('/', requerirSesion, asyncHandler(async (req, res) => {
    res.json({ preferencias: await almacen.obtenerPreferencias(req.usuario.id) });
  }));

  r.put('/', requerirSesion, validate(s.preferencias), asyncHandler(async (req, res) => {
    res.json({ preferencias: await almacen.guardarPreferencias(req.usuario.id, req.valid.body) });
  }));

  return r;
};
