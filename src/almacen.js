'use strict';
const { randomUUID } = require('node:crypto');
const { AppError } = require('./errors');
const { digestCorreo, digestToken } = require('./auth');

/**
 * Modelo de cuentas y sesiones en Redis (prefijo app:v1:)
 *   indice:correo:<hmac>  → id del usuario
 *   usuario:<uuid>        → hash { id, nombre, email, password_hash, creado_en }
 *   sesion:<sha256>       → hash { usuario_id, creado_en } con EXPIRE (sesión deslizante)
 *   preferencias:<uuid>   → hash con los ajustes de lectura por defecto
 */
const PREFIJO = 'app:v1:';
const clave = {
  correo: (hmac) => `${PREFIJO}indice:correo:${hmac}`,
  usuario: (id) => `${PREFIJO}usuario:${id}`,
  sesion: (digest) => `${PREFIJO}sesion:${digest}`,
  preferencias: (id) => `${PREFIJO}preferencias:${id}`,
};

const PREFERENCIAS_INICIALES = { tamanoLetra: 'normal', tema: 'claro', audioAutomatico: 'false', velocidadVoz: '1' };

// Registro atómico: si el correo ya tiene cuenta devuelve 0; si no, crea el usuario, su índice,
// sus preferencias y la primera sesión en una sola operación y devuelve 1.
const LUA_REGISTRO = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('HSET', KEYS[2], 'id', ARGV[1], 'nombre', ARGV[2], 'email', ARGV[3], 'password_hash', ARGV[4], 'creado_en', ARGV[5])
redis.call('HSET', KEYS[3], 'usuario_id', ARGV[1], 'creado_en', ARGV[5])
redis.call('EXPIRE', KEYS[3], tonumber(ARGV[6]))
redis.call('HSET', KEYS[4], 'tamanoLetra', ARGV[7], 'tema', ARGV[8], 'audioAutomatico', ARGV[9], 'velocidadVoz', ARGV[10])
return 1`;

const sinAlmacen = () => new AppError(503, 'ALMACEN_NO_DISPONIBLE',
  'El servicio de cuentas no está disponible en este momento. Inténtalo de nuevo en unos minutos.');

// Fallas de conexión con Redis (caído, cortado, sin respuesta). Cualquier otro error es un bug.
const ERRORES_DE_CONEXION = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND'];
const esFallaDeRedis = (err) =>
  err?.name === 'MaxRetriesPerRequestError'
  || ERRORES_DE_CONEXION.includes(err?.code)
  || /Connection is closed|Stream isn't writeable/i.test(err?.message || '');

const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email });

// Redis guarda todo como texto: se devuelven con su tipo (booleano y número).
const leerPreferencias = (p) => ({
  tamanoLetra: p.tamanoLetra,
  tema: p.tema,
  audioAutomatico: p.audioAutomatico === 'true',
  velocidadVoz: Number(p.velocidadVoz),
});

/**
 * @param redis  cliente ioredis (o null si no hay Redis configurado)
 * @param cfg    configuración: jwtSecret (secreto del índice de correo) y sessionTtlSeconds
 */
function crearAlmacen(redis, cfg) {
  const ttl = cfg.sessionTtlSeconds;

  // Si Redis falla (caído, sin conexión) se responde 503. Los errores propios (AppError) pasan igual,
  // y un error de programación sube como 500 para que no quede escondido detrás de un "no disponible".
  const usar = async (operacion) => {
    if (!redis) throw sinAlmacen();
    try {
      return await operacion(redis);
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (esFallaDeRedis(err)) {
        console.error('[almacen]', err.message);
        throw sinAlmacen();
      }
      throw err;
    }
  };

  return {
    /** Crea la cuenta y su primera sesión. Devuelve el usuario público, o null si el correo ya existe. */
    registrarUsuario: ({ nombre, email, passwordHash }, token) => usar(async (r) => {
      const id = randomUUID();
      const creadoEn = new Date().toISOString();
      const p = PREFERENCIAS_INICIALES;
      const creado = await r.eval(LUA_REGISTRO, 4,
        clave.correo(digestCorreo(email, cfg.jwtSecret)), clave.usuario(id), clave.sesion(digestToken(token)), clave.preferencias(id),
        id, nombre, email, passwordHash, creadoEn, ttl, p.tamanoLetra, p.tema, p.audioAutomatico, p.velocidadVoz);
      return Number(creado) === 1 ? { id, nombre, email } : null;
    }),

    /** Usuario completo (con su hash) para verificar la contraseña, o null si no existe. */
    buscarUsuarioPorCorreo: (email) => usar(async (r) => {
      const id = await r.get(clave.correo(digestCorreo(email, cfg.jwtSecret)));
      if (!id) return null;
      const usuario = await r.hgetall(clave.usuario(id));
      return usuario?.id ? usuario : null;
    }),

    /** Cambia el hash de la contraseña de la cuenta (el hash ya viene calculado). */
    actualizarPassword: (usuarioId, passwordHash) =>
      usar((r) => r.hset(clave.usuario(usuarioId), 'password_hash', passwordHash)),

    crearSesion: (usuarioId, token) => usar(async (r) => {
      const k = clave.sesion(digestToken(token));
      await r.multi().hset(k, 'usuario_id', usuarioId, 'creado_en', new Date().toISOString()).expire(k, ttl).exec();
    }),

    /** Usuario público de la sesión, renovando su vigencia; null si la sesión o el usuario ya no existen. */
    obtenerUsuarioDeSesion: (token) => usar(async (r) => {
      const k = clave.sesion(digestToken(token));
      const usuarioId = await r.hget(k, 'usuario_id');
      if (!usuarioId) return null;
      const usuario = await r.hgetall(clave.usuario(usuarioId));
      if (!usuario?.id) {
        await r.del(k);
        return null;
      }
      await r.expire(k, ttl);
      return publico(usuario);
    }),

    cerrarSesion: (token) => usar((r) => r.del(clave.sesion(digestToken(token)))),

    /** Ajustes de lectura de la cuenta (los iniciales si todavía no tiene). */
    obtenerPreferencias: (usuarioId) => usar(async (r) => {
      const guardadas = await r.hgetall(clave.preferencias(usuarioId));
      return leerPreferencias({ ...PREFERENCIAS_INICIALES, ...guardadas });
    }),

    /** Guarda los ajustes ya validados y devuelve cómo quedaron. */
    guardarPreferencias: (usuarioId, prefs) => usar(async (r) => {
      await r.hset(clave.preferencias(usuarioId), {
        tamanoLetra: prefs.tamanoLetra,
        tema: prefs.tema,
        audioAutomatico: String(prefs.audioAutomatico),
        velocidadVoz: String(prefs.velocidadVoz),
      });
      return { ...prefs };
    }),
  };
}
actualizarPassword: (usuarioId, passwordHash) =>
  usar((r) => r.hset(clave.usuario(usuarioId), 'password_hash', passwordHash)),

module.exports = { crearAlmacen, clave };


