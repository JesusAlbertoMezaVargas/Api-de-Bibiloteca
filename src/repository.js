'use strict';

const { AppError } = require('./errors');
const { digestCorreo, digestToken } = require('./auth');

const PREFIJO = 'alameda:v1:';
const SESION_COOKIE = 'alameda.sid';
const DIAS_METRICAS = 400 * 24 * 60 * 60;
const MAX_EVENTOS = 100000;
const PREFERENCIAS_INICIALES = {
  tamanoLetra: 'normal',
  altoContraste: false,
  audioAutomatico: false,
  velocidadVoz: 1,
};

const REGISTRAR_USUARIO = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('HSET', KEYS[2], 'id', ARGV[1], 'nombre', ARGV[2], 'email', ARGV[3],
  'password_hash', ARGV[4], 'creado_en', ARGV[5])
redis.call('HSET', KEYS[3], 'escala_texto', 'normal', 'alto_contraste', 'false',
  'audio_automatico', 'false', 'velocidad_audio', '1')
redis.call('SET', KEYS[1], ARGV[1])
redis.call('HSET', KEYS[4], 'usuario_id', ARGV[1], 'creado_en', ARGV[5])
redis.call('EXPIRE', KEYS[4], ARGV[6])
redis.call('XADD', KEYS[6], 'MAXLEN', '~', ARGV[7], '*',
  'tipo', 'registro', 'fecha', ARGV[5])
redis.call('HINCRBY', KEYS[5], 'registros', 1)
redis.call('EXPIRE', KEYS[5], ARGV[8])
return 1
`;

const REGISTRAR_EVENTO = `
local argumentos = {'MAXLEN', '~', ARGV[4], '*', 'tipo', ARGV[1], 'fecha', ARGV[2]}
if ARGV[3] ~= '' then
  table.insert(argumentos, 'servicio_id')
  table.insert(argumentos, ARGV[3])
end
redis.call('XADD', KEYS[2], unpack(argumentos))
redis.call('HINCRBY', KEYS[1], ARGV[5], 1)
redis.call('EXPIRE', KEYS[1], ARGV[6])
return 1
`;

function mapPrefs(hash) {
  if (!hash || !Object.keys(hash).length) return { ...PREFERENCIAS_INICIALES };
  return {
    tamanoLetra: hash.escala_texto || 'normal',
    altoContraste: hash.alto_contraste === 'true',
    audioAutomatico: hash.audio_automatico === 'true',
    velocidadVoz: Number(hash.velocidad_audio || 1),
  };
}

function usuarioPublico(hash) {
  return { id: hash.id, nombre: hash.nombre, email: hash.email };
}

function resultPipeline(results) {
  if (!results) throw new Error('Redis no devolvió el resultado del pipeline.');
  const fallo = results.find(([error]) => error);
  if (fallo) throw fallo[0];
  return results.map(([, value]) => value);
}

function crearRepositorio(redis, config) {
  function exigirRedis() {
    if (!redis) {
      throw new AppError(503, 'ALMACEN_NO_CONFIGURADO', 'La base de datos Redis no está configurada.');
    }
  }

  async function registrarEvento(tipo, campoMetrica, servicioId = '') {
    exigirRedis();
    const fecha = new Date().toISOString();
    const dia = fecha.slice(0, 10);
    await redis.eval(REGISTRAR_EVENTO, 2,
      `${PREFIJO}metricas:${dia}`,
      `${PREFIJO}eventos:uso`,
      tipo,
      fecha,
      servicioId,
      MAX_EVENTOS,
      campoMetrica,
      DIAS_METRICAS);
  }

  async function obtenerServicio(servicioId) {
    exigirRedis();
    const hash = await redis.hgetall(`${PREFIJO}servicio:${servicioId}`);
    if (!hash.id) return null;
    const idsPasos = await redis.zrange(`${PREFIJO}servicio:${servicioId}:pasos`, 0, -1);
    const pasos = resultPipeline(await redis.pipeline(
      idsPasos.map((id) => ['hgetall', `${PREFIJO}paso:${id}`]),
    ).exec()).map((paso) => ({
      id: paso.id,
      texto: paso.texto,
      ilustracion_url: paso.ilustracion_url || null,
      texto_alternativo: paso.texto_alternativo || null,
    }));
    return {
      ...hash,
      pasos,
      ubicacion: hash.ubicacion || '',
    };
  }

  return {
    async registrarUsuario({ id, nombre, email, passwordHash, token, correoDigest }) {
      exigirRedis();
      const ahora = new Date().toISOString();
      const sessionKey = `${PREFIJO}sesion:${digestToken(token)}`;
      const dia = ahora.slice(0, 10);
      const creado = await redis.eval(REGISTRAR_USUARIO, 6,
        `${PREFIJO}indice:correo:${correoDigest}`,
        `${PREFIJO}usuario:${id}`,
        `${PREFIJO}preferencias:${id}`,
        sessionKey,
        `${PREFIJO}metricas:${dia}`,
        `${PREFIJO}eventos:uso`,
        id,
        nombre,
        email,
        passwordHash,
        ahora,
        config.sessionTtlSeconds,
        MAX_EVENTOS,
        DIAS_METRICAS);
      return creado === 1;
    },

    async buscarUsuarioPorCorreo(email) {
      exigirRedis();
      const digest = digestCorreo(email, config.jwtSecret);
      const id = await redis.get(`${PREFIJO}indice:correo:${digest}`);
      if (!id) return null;
      const user = await redis.hgetall(`${PREFIJO}usuario:${id}`);
      return user.id ? user : null;
    },

    async crearSesion(usuarioId, token) {
      exigirRedis();
      const ahora = new Date().toISOString();
      const key = `${PREFIJO}sesion:${digestToken(token)}`;
      const results = await redis.multi()
        .hset(key, 'usuario_id', usuarioId, 'creado_en', ahora)
        .expire(key, config.sessionTtlSeconds)
        .exec();
      const fallo = results?.find(([error]) => error);
      if (fallo) throw fallo[0];
    },

    async obtenerUsuarioDeSesion(token) {
      exigirRedis();
      const sessionKey = `${PREFIJO}sesion:${digestToken(token)}`;
      const session = await redis.hgetall(sessionKey);
      if (!session.usuario_id) return null;
      const user = await redis.hgetall(`${PREFIJO}usuario:${session.usuario_id}`);
      if (!user.id) {
        await redis.del(sessionKey);
        return null;
      }
      await redis.expire(sessionKey, config.sessionTtlSeconds);
      return usuarioPublico(user);
    },

    async cerrarSesion(token) {
      if (!token) return;
      exigirRedis();
      await redis.del(`${PREFIJO}sesion:${digestToken(token)}`);
    },

    async obtenerPreferencias(usuarioId) {
      exigirRedis();
      const prefs = await redis.hgetall(`${PREFIJO}preferencias:${usuarioId}`);
      if (!Object.keys(prefs).length) {
        await redis.hset(`${PREFIJO}preferencias:${usuarioId}`,
          'escala_texto', 'normal', 'alto_contraste', 'false',
          'audio_automatico', 'false', 'velocidad_audio', '1');
      }
      return mapPrefs(prefs);
    },

    async guardarPreferencias(usuarioId, prefs) {
      exigirRedis();
      await redis.hset(`${PREFIJO}preferencias:${usuarioId}`,
        'escala_texto', prefs.tamanoLetra,
        'alto_contraste', String(prefs.altoContraste),
        'audio_automatico', String(prefs.audioAutomatico),
        'velocidad_audio', String(prefs.velocidadVoz));
      return prefs;
    },

    async listarAreas() {
      exigirRedis();
      const ids = await redis.zrange(`${PREFIJO}areas`, 0, -1);
      return resultPipeline(await redis.pipeline(
        ids.map((id) => ['hgetall', `${PREFIJO}area:${id}`]),
      ).exec()).filter((area) => area.id);
    },

    async obtenerArea(id) {
      exigirRedis();
      const areaHash = await redis.hgetall(`${PREFIJO}area:${id}`);
      if (areaHash.id) {
        const serviceIds = await redis.zrange(`${PREFIJO}area:${id}:servicios`, 0, -1);
        const servicios = resultPipeline(await redis.pipeline(
          serviceIds.map((serviceId) => ['hgetall', `${PREFIJO}servicio:${serviceId}`]),
        ).exec()).filter((servicio) => servicio.id)
          .map(({ id: serviceId, nombre, descripcion }) => ({ id: serviceId, nombre, descripcion }));
        return { ...areaHash, servicios };
      }

      const service = await obtenerServicio(id);
      if (!service) return null;
      return {
        id: service.id,
        nombre: service.nombre,
        descripcion: service.descripcion,
        ubicacion: service.ubicacion,
        pasos: service.pasos.map((paso) => paso.texto),
      };
    },

    async validarServicio(servicioId) {
      exigirRedis();
      return (await redis.exists(`${PREFIJO}servicio:${servicioId}`)) === 1;
    },

    registrarEvento,
  };
}

module.exports = { crearRepositorio, PREFIJO, SESION_COOKIE };
