'use strict';
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { COOKIE_SESION, ponerCookieSesion, borrarCookieSesion } = require('../middleware/sesion');
const { AppError } = require('../errors');
const { crearHashPassword, verificarPassword, crearTokenSesion } = require('../auth');
const s = require('../schemas');

/** Crear cuenta, iniciar y cerrar sesión, y "quién soy". La sesión viaja en una cookie HttpOnly. */
module.exports = function authRouter({ limiters, almacen, requerirSesion, cfg }) {
  const r = Router();

  r.post('/registro', limiters.auth, validate(s.registro), asyncHandler(async (req, res) => {
    const { nombre, email, password } = req.valid.body;
    const passwordHash = await crearHashPassword(password);
    const token = crearTokenSesion();
    const usuario = await almacen.registrarUsuario({ nombre, email, passwordHash }, token);
    if (!usuario) throw new AppError(409, 'CUENTA_EXISTENTE', 'Ya existe una cuenta con ese correo.');
    ponerCookieSesion(res, cfg, token);
    res.status(201).json({ usuario });
  }));

  r.post('/login', limiters.auth, validate(s.login), asyncHandler(async (req, res) => {
    const { email, password } = req.valid.body;
    const encontrado = await almacen.buscarUsuarioPorCorreo(email);
    // Se verifica siempre, exista o no el usuario, para que el tiempo de respuesta no lo delate.
    const correcta = await verificarPassword(password, encontrado?.password_hash);
    if (!encontrado || !correcta) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'El correo o la contraseña no son correctos.');
    }
    const token = crearTokenSesion();
    await almacen.crearSesion(encontrado.id, token);
    ponerCookieSesion(res, cfg, token);
    res.json({ usuario: { id: encontrado.id, nombre: encontrado.nombre, email: encontrado.email } });
  }));

  r.post('/logout', asyncHandler(async (req, res) => {
    const token = req.cookies?.[COOKIE_SESION];
    borrarCookieSesion(res, cfg);
    if (token) await almacen.cerrarSesion(token);
    res.status(204).end();
  }));

  r.get('/yo', requerirSesion, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  return r;
};
