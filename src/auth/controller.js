'use strict';
const bcrypt = require('bcryptjs');
const { AppError } = require('../errors');
const { createUserStore } = require('./store');
const { createSesion } = require('./sesion');

const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email });
const normalizar = (email) => String(email).trim().toLowerCase();

const correoRepetido = () => new AppError(409, 'CORREO_REGISTRADO', 'Ese correo ya está registrado.', [
  { campo: 'body.email', mensaje: 'Ese correo ya está registrado. Inicia sesión.' },
]);
const noAutenticado = () => new AppError(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');

function createAuthController({ cfg, redis }) {
  const store = createUserStore(cfg);
  const sesion = createSesion(cfg, redis);
  let hashFalso; // para que el login tarde igual exista o no el correo

  async function registro(req, res) {
    const email = normalizar(req.body.email);
    if (store.buscarPorEmail(email)) throw correoRepetido();
    const passwordHash = await bcrypt.hash(req.body.password, cfg.bcryptRounds);
    const usuario = store.crear({ nombre: req.body.nombre.trim(), email, passwordHash });
    if (!usuario) throw correoRepetido(); // otro registro igual llegó primero
    sesion.emitir(res, usuario);
    res.status(201).json({ usuario: publico(usuario) });
  }

  async function login(req, res) {
    const usuario = store.buscarPorEmail(normalizar(req.body.email));
    if (!hashFalso) hashFalso = await bcrypt.hash('contraseña-falsa-1', cfg.bcryptRounds);
    const coincide = await bcrypt.compare(req.body.password, usuario ? usuario.passwordHash : hashFalso);
    if (!usuario || !coincide) {
      // Mismo mensaje en ambos casos: no se revela si el correo existe.
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.');
    }
    sesion.emitir(res, usuario);
    res.json({ usuario: publico(usuario) });
  }

  async function logout(req, res) {
    const payload = sesion.leer(req);
    if (payload) await sesion.revocar(payload);
    sesion.cerrar(res);
    res.status(204).end();
  }

  /** Middleware: exige sesión válida y deja el usuario en req.usuario. */
  async function requireAuth(req, res, next) {
    try {
      const payload = sesion.leer(req);
      if (!payload || await sesion.estaRevocada(payload.jti)) throw noAutenticado();
      const usuario = store.buscarPorId(payload.sub);
      if (!usuario) throw noAutenticado();
      req.usuario = usuario;
      next();
    } catch (error) {
      next(error);
    }
  }

  const yo = (req, res) => res.json({ usuario: publico(req.usuario) });

  return { registro, login, logout, requireAuth, yo };
}

module.exports = { createAuthController };