'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const Redis = require('ioredis');
const { createApp } = require('../src/app');
const { areas, servicios } = require('../src/data/datosPrueba');
const { digestCorreo, digestToken } = require('../src/auth');
const { loadConfig } = require('../src/config');
const TEST_REDIS_URL = 'redis://127.0.0.1:6379/15';

/** Levanta una instancia nueva (con su propio contador de límites) en un puerto libre. */
async function iniciar(overrides = {}) {
  const app = createApp({ nodeEnv: 'test', redisUrl: '', ...overrides });
  if (app.locals.redis && app.locals.redis.status !== 'ready') {
    await new Promise((resolve) => {
      const conectado = () => {
        clearTimeout(limite);
        resolve();
      };
      const limite = setTimeout(conectado, 3000);
      app.locals.redis.once('ready', conectado);
    });
  }
  const server = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const pedir = (ruta, opciones = {}) => fetch(base + ruta, {
    ...opciones,
    headers: { 'content-type': 'application/json', ...(opciones.headers || {}) },
    body: opciones.body && typeof opciones.body !== 'string' ? JSON.stringify(opciones.body) : opciones.body,
  });
  return {
    app,
    pedir,
    cerrar: async () => {
      server.closeAllConnections();
      await new Promise((ok) => server.close(ok));
      if (app.locals.redis) await app.locals.redis.quit();
    },
  };
}

//  02: evidencia/pruebas de aceptación de salud, Helmet, errores uniformes, validación y límite de intentos
test('GET /api/health responde 200 con el estado del servicio', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/health');
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.estado, 'ok');
  assert.equal(json.servicio, 'biblioteca-api');
  assert.equal(json.redis, 'no configurado'); // en pruebas no se usa Redis
  assert.ok(res.headers.get('x-request-id'));
  await cerrar();
});

test('Helmet agrega cabeceras de seguridad y oculta X-Powered-By', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/health');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('content-security-policy').includes("default-src 'self'"));
  assert.equal(res.headers.get('x-powered-by'), null);
  await cerrar();
});

test('Una ruta inexistente responde 404 con el formato uniforme de error', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/no-existe');
  const json = await res.json();
  assert.equal(res.status, 404);
  assert.equal(json.error.code, 'RUTA_NO_ENCONTRADA');
  assert.equal(json.error.requestId, res.headers.get('x-request-id'));
  await cerrar();
});

test('Un JSON mal formado responde 400 JSON_INVALIDO', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/login', { method: 'POST', body: '{"email": ' });
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error.code, 'JSON_INVALIDO');
  await cerrar();
});

test('La validación rechaza datos incorrectos y lista los campos', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/registro', {
    method: 'POST', body: { nombre: 'A', email: 'correo-sin-arroba', password: '123' },
  });
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error.code, 'VALIDACION');
  const campos = json.error.details.map((d) => d.campo).sort();
  assert.deepEqual(campos, ['body.email', 'body.nombre', 'body.password']);
  await cerrar();
});

test('La validación rechaza campos que no están en el contrato', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/login', {
    method: 'POST', body: { email: 'ana@correo.com', password: 'secreta1', rol: 'admin' },
  });
  assert.equal(res.status, 400);
  await cerrar();
});

test('La autenticación informa si Redis no está configurado', async () => {
  const { pedir, cerrar } = await iniciar();
  const res = await pedir('/api/auth/login', {
    method: 'POST', body: { email: 'Ana@Correo.com', password: 'secreta1' },
  });
  const json = await res.json();
  assert.equal(res.status, 503);
  assert.equal(json.error.code, 'ALMACEN_NO_CONFIGURADO');
  await cerrar();
});

test('Los parámetros de ruta se validan', async () => {
  const { pedir, cerrar } = await iniciar();
  const mala = await pedir('/api/areas/ABC_%21');
  assert.equal(mala.status, 400);
  assert.equal((await mala.json()).error.details[0].campo, 'params.id');
  const buena = await pedir('/api/areas/sala-de-lectura');
  assert.equal(buena.status, 503);
  await cerrar();
});

test('Los datos de demostración superan 50 hashes e incluyen pasos ordenados', () => {
  const hashes = areas.length + servicios.length
    + servicios.reduce((total, servicio) => total + servicio.pasos.length, 0) + 1;
  assert.equal(areas.length, 5);
  assert.equal(servicios.length, 23);
  assert.ok(hashes >= 50);
  assert.ok(servicios.every((servicio) => servicio.pasos.length >= 3));
});

test('Producción requiere secretos privados y Redis configurado', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /JWT_SECRET/);
  assert.throws(() => loadConfig({
    NODE_ENV: 'production',
    JWT_SECRET: randomUUID() + randomUUID(),
    QR_ACCESS_CODE: 'codigo-prueba-seguro-123',
  }), /REDIS_URL/);
  const config = loadConfig({
    NODE_ENV: 'production',
    JWT_SECRET: randomUUID() + randomUUID(),
    QR_ACCESS_CODE: 'codigo-prueba-seguro-123',
    REDIS_URL: 'rediss://redis.example.internal:6380',
  });
  assert.equal(config.isProduction, true);
});

test('Registro, sesión, preferencias y logout se guardan de forma segura en Redis', async (t) => {
  const redis = new Redis(TEST_REDIS_URL, {
    connectTimeout: 1000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    await redis.ping();
  } catch {
    redis.disconnect();
    t.skip('Redis local no está disponible.');
    return;
  }
  await redis.quit();

  const secreto = randomUUID() + randomUUID();
  const email = `prueba-${randomUUID()}@example.org`;
  const correoHash = digestCorreo(email, secreto);
  const { pedir, cerrar, app } = await iniciar({
    redisUrl: TEST_REDIS_URL,
    jwtSecret: secreto,
    qrAccessCode: 'codigo-prueba-seguro-123',
  });
  const cookies = [];

  try {
    const registro = await pedir('/api/auth/registro', {
      method: 'POST',
      body: { nombre: 'Prueba Integración', email, password: 'secreto-seguro-123' },
    });
    const respuestaRegistro = await registro.json();
    const cookie = registro.headers.get('set-cookie')?.split(';')[0];
    cookies.push(cookie);
    assert.equal(registro.status, 201);
    assert.equal(respuestaRegistro.usuario.email, email);
    assert.match(registro.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(registro.headers.get('set-cookie'), /SameSite=Strict/i);
    assert.ok(cookie);

    const usuario = await pedir('/api/auth/yo', { headers: { cookie } });
    assert.equal(usuario.status, 200);
    assert.equal((await usuario.json()).usuario.nombre, 'Prueba Integración');

    const preferencias = await pedir('/api/preferencias', { headers: { cookie } });
    assert.equal(preferencias.status, 200);
    assert.equal((await preferencias.json()).preferencias.tamanoLetra, 'normal');

    const actualizacion = await pedir('/api/preferencias', {
      method: 'PUT',
      headers: { cookie },
      body: {
        tamanoLetra: 'grande',
        altoContraste: true,
        audioAutomatico: true,
        velocidadVoz: 1.25,
      },
    });
    assert.equal(actualizacion.status, 200);
    assert.equal((await actualizacion.json()).preferencias.velocidadVoz, 1.25);

    const audio = await pedir('/api/uso/audio', { method: 'POST', body: {} });
    const finalizacion = await pedir('/api/uso/finalizaciones', { method: 'POST', body: {} });
    const qr = await pedir('/api/qr/validar', {
      method: 'POST',
      body: { codigo: 'codigo-prueba-seguro-123' },
    });
    assert.equal(audio.status, 202);
    assert.equal(finalizacion.status, 202);
    assert.equal(qr.status, 200);
    const hoy = new Date().toISOString().slice(0, 10);
    const metricas = await app.locals.redis.hgetall(`alameda:v1:metricas:${hoy}`);
    assert.ok(Number(metricas.registros) > 0);
    assert.ok(Number(metricas.audio) > 0);
    assert.ok(Number(metricas.finalizaciones) > 0);
    assert.ok(Number(metricas.qr) > 0);

    const logout = await pedir('/api/auth/logout', { method: 'POST', headers: { cookie } });
    assert.equal(logout.status, 204);
    const sesionCerrada = await pedir('/api/auth/yo', { headers: { cookie } });
    assert.equal(sesionCerrada.status, 401);

    const login = await pedir('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'secreto-seguro-123' },
    });
    assert.equal(login.status, 200);
    const cookieLogin = login.headers.get('set-cookie')?.split(';')[0];
    cookies.push(cookieLogin);
    assert.ok(cookieLogin);

    const idUsuario = await app.locals.redis.get(`alameda:v1:indice:correo:${correoHash}`);
    assert.ok(idUsuario);
    assert.ok((await app.locals.redis.hget(`alameda:v1:usuario:${idUsuario}`, 'password_hash')).startsWith('scrypt$'));
    assert.ok((await app.locals.redis.ttl(`alameda:v1:sesion:${digestToken(cookieLogin.split('=')[1])}`)) > 0);
  } finally {
    const idUsuario = await app.locals.redis.get(`alameda:v1:indice:correo:${correoHash}`);
    if (idUsuario) {
      await app.locals.redis.del(
        `alameda:v1:usuario:${idUsuario}`,
        `alameda:v1:preferencias:${idUsuario}`,
        `alameda:v1:indice:correo:${correoHash}`,
      );
    }
    const sessionKeys = cookies.filter(Boolean).map((value) => {
      const session = value.split('=')[1];
      return `alameda:v1:sesion:${digestToken(session)}`;
    });
    if (sessionKeys.length) await app.locals.redis.del(...sessionKeys);
    await cerrar();
  }
});

test('El límite de intentos de acceso responde 429 y no bloquea la ruta de salud', async () => {
  const { pedir, cerrar } = await iniciar({ rateAuthMax: 3 });
  const intento = () => pedir('/api/auth/login', { method: 'POST', body: { email: 'mala', password: 'x' } });
  for (let i = 0; i < 3; i += 1) assert.equal((await intento()).status, 400);
  const bloqueado = await intento();
  const json = await bloqueado.json();
  assert.equal(bloqueado.status, 429);
  assert.equal(json.error.code, 'DEMASIADOS_INTENTOS');
  assert.ok(bloqueado.headers.get('retry-after'));
  assert.equal((await pedir('/api/health')).status, 200);
  await cerrar();
});

test('El límite global de la API responde 429 al excederse', async () => {
  const { pedir, cerrar } = await iniciar({ rateGlobalMax: 5 });
  for (let i = 0; i < 5; i += 1) assert.equal((await pedir('/api/areas')).status, 503);
  const res = await pedir('/api/areas');
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error.code, 'DEMASIADOS_INTENTOS');
  await cerrar();
});

test('El frontend se sirve desde / con sus módulos ES y la misma política de seguridad', async () => {
  const { pedir, cerrar } = await iniciar();
  const pagina = await pedir('/');
  const htmlTexto = await pagina.text();
  assert.equal(pagina.status, 200);
  assert.match(pagina.headers.get('content-type'), /text\/html/);
  assert.match(htmlTexto, /<script type="module" src="js\/main.js"><\/script>/);
  assert.ok(pagina.headers.get('content-security-policy').includes("script-src 'self'"));

  const modulo = await pedir('/js/main.js');
  assert.equal(modulo.status, 200);
  assert.match(modulo.headers.get('content-type'), /javascript/);

  for (const pagina of ['areas', 'area', 'acceso', 'preferencias', 'cuenta', 'registro']) {
    const res = await pedir(`/${pagina}.html`);
    assert.equal(res.status, 200, `${pagina}.html`);
    assert.match(await res.text(), new RegExp(`data-vista="${pagina}"`));
  }
  await cerrar();
});
