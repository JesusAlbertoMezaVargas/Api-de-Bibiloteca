'use strict';

const { randomUUID } = require('node:crypto');
const { Router } = require('express');
const { AppError } = require('../errors');
const asyncHandler = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');
const {
  compararSecreto, crearHashPassword, crearTokenSesion, digestCorreo, verificarPassword,
} = require('../auth');
const { crearRepositorio, SESION_COOKIE } = require('../repository');
const s = require('../schemas');

module.exports = function apiRouter({ limiters, redis, config }) {
  const r = Router();
  const repository = crearRepositorio(redis, config);
  const cookieOptions = {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: config.sessionTtlSeconds * 1000,
  };
  const clearCookieOptions = { ...cookieOptions };
  delete clearCookieOptions.maxAge;

  const requerirSesion = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.[SESION_COOKIE];
    if (!token) throw new AppError(401, 'SESION_REQUERIDA', 'Inicia sesión para continuar.');
    const usuario = await repository.obtenerUsuarioDeSesion(token);
    if (!usuario) {
      res.clearCookie(SESION_COOKIE, clearCookieOptions);
      throw new AppError(401, 'SESION_EXPIRADA', 'Tu sesión terminó. Inicia sesión de nuevo.');
    }
    req.usuario = usuario;
    next();
  });

  r.post('/qr/validar', limiters.auth, validate(s.qrValidar), asyncHandler(async (req, res) => {
    if (!config.qrAccessCode) {
      throw new AppError(503, 'QR_NO_CONFIGURADO', 'El acceso por QR no está configurado.');
    }
    if (!compararSecreto(req.valid.body.codigo, config.qrAccessCode)) {
      throw new AppError(401, 'QR_INVALIDO', 'El código de acceso no es válido.');
    }
    await repository.registrarEvento('qr', 'qr');
    res.json({ acceso: true });
  }));

  r.post('/auth/registro', limiters.auth, validate(s.registro), asyncHandler(async (req, res) => {
    const { nombre, email, password } = req.valid.body;
    const passwordHash = await crearHashPassword(password);
    const token = crearTokenSesion();
    const creado = await repository.registrarUsuario({
      id: randomUUID(),
      nombre,
      email,
      passwordHash,
      token,
      correoDigest: digestCorreo(email, config.jwtSecret),
    });
    if (!creado) {
      throw new AppError(409, 'CUENTA_EXISTENTE', 'Ya existe una cuenta con ese correo.');
    }
    res.cookie(SESION_COOKIE, token, cookieOptions);
    res.status(201).json({ usuario: { nombre, email } });
  }));

  r.post('/auth/login', limiters.auth, validate(s.login), asyncHandler(async (req, res) => {
    const { email, password } = req.valid.body;
    const user = await repository.buscarUsuarioPorCorreo(email);
    if (!await verificarPassword(password, user?.password_hash)) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'El correo o la contraseña no son correctos.');
    }
    const token = crearTokenSesion();
    await repository.crearSesion(user.id, token);
    res.cookie(SESION_COOKIE, token, cookieOptions);
    res.json({ usuario: { id: user.id, nombre: user.nombre, email: user.email } });
  }));

  r.post('/auth/logout', asyncHandler(async (req, res) => {
    const token = req.cookies?.[SESION_COOKIE];
    res.clearCookie(SESION_COOKIE, clearCookieOptions);
    await repository.cerrarSesion(token);
    res.status(204).end();
  }));

  r.get('/auth/yo', requerirSesion, (req, res) => {
    res.json({ usuario: req.usuario });
  });

  r.get('/areas', asyncHandler(async (req, res) => {
    res.json({ areas: await repository.listarAreas() });
  }));

  r.get('/areas/:id', validate(s.areaId), asyncHandler(async (req, res) => {
    const area = await repository.obtenerArea(req.valid.params.id);
    if (!area) throw new AppError(404, 'AREA_NO_ENCONTRADA', 'No se encontró el área solicitada.');
    res.json({ area });
  }));

  r.get('/preferencias', requerirSesion, asyncHandler(async (req, res) => {
    res.json({ preferencias: await repository.obtenerPreferencias(req.usuario.id) });
  }));

  r.put('/preferencias', requerirSesion, validate(s.preferencias), asyncHandler(async (req, res) => {
    const preferencias = await repository.guardarPreferencias(req.usuario.id, req.valid.body);
    res.json({ preferencias });
  }));

  r.post('/uso/guias', validate(s.usoGuia), asyncHandler(async (req, res) => {
    const servicioId = req.valid.body.areaId;
    if (!await repository.validarServicio(servicioId)) {
      throw new AppError(404, 'SERVICIO_NO_ENCONTRADO', 'No se encontró el servicio solicitado.');
    }
    await repository.registrarEvento('guia', 'guias', servicioId);
    res.status(202).json({ registrado: true });
  }));

  r.post('/uso/audio', validate(s.usoServicioOpcional), asyncHandler(async (req, res) => {
    const servicioId = req.valid.body.servicioId || '';
    if (servicioId && !await repository.validarServicio(servicioId)) {
      throw new AppError(404, 'SERVICIO_NO_ENCONTRADO', 'No se encontró el servicio solicitado.');
    }
    await repository.registrarEvento('audio', 'audio', servicioId);
    res.status(202).json({ registrado: true });
  }));

  r.post('/uso/finalizaciones', validate(s.usoServicioOpcional), asyncHandler(async (req, res) => {
    const servicioId = req.valid.body.servicioId || '';
    if (servicioId && !await repository.validarServicio(servicioId)) {
      throw new AppError(404, 'SERVICIO_NO_ENCONTRADO', 'No se encontró el servicio solicitado.');
    }
    await repository.registrarEvento('finalizacion', 'finalizaciones', servicioId);
    res.status(202).json({ registrado: true });
  }));

  return r;
};
