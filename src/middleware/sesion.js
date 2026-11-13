'use strict';
const { AppError } = require('../errors');
const asyncHandler = require('./asyncHandler');

const COOKIE_SESION = 'app.sid';

/** Opciones de la cookie de sesión. Para borrarla se usan las mismas, sin maxAge. */
function opcionesCookie(cfg, { conVigencia = true } = {}) {
  const opciones = { httpOnly: true, secure: cfg.isProduction, sameSite: 'strict', path: '/' };
  if (conVigencia) opciones.maxAge = cfg.sessionTtlSeconds * 1000;
  return opciones;
}

const ponerCookieSesion = (res, cfg, token) => res.cookie(COOKIE_SESION, token, opcionesCookie(cfg));
const borrarCookieSesion = (res, cfg) => res.clearCookie(COOKIE_SESION, opcionesCookie(cfg, { conVigencia: false }));

/** Protege una ruta privada: deja el usuario en req.usuario o responde 401. */
function crearRequerirSesion(almacen, cfg) {
  return asyncHandler(async (req, res, next) => {
    const token = req.cookies?.[COOKIE_SESION];
    if (!token) throw new AppError(401, 'SESION_REQUERIDA', 'Inicia sesión para continuar.');
    const usuario = await almacen.obtenerUsuarioDeSesion(token);
    if (!usuario) {
      borrarCookieSesion(res, cfg);
      throw new AppError(401, 'SESION_EXPIRADA', 'Tu sesión terminó. Inicia sesión de nuevo.');
    }
    req.usuario = usuario;
    req.tokenSesion = token;
    next();
  });
}

module.exports = { COOKIE_SESION, ponerCookieSesion, borrarCookieSesion, crearRequerirSesion };
